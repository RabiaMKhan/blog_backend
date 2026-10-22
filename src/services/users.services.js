import createHttpError from "http-errors";
import bcrypt from "bcryptjs";
import UserModel from "../models/users.model.js";
import { AuthValidations } from "../validations/auth.validation.js";
import logger from "../config/logger.config.js";
import OTPModel from "../models/otp.model.js";
import jwt from "jsonwebtoken";
import {
  generateOtp,
  sendOtpEmail,
  OTP_EXPIRY_MINUTES,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_MAX_ATTEMPTS,
} from "../utils/service.util.js";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} from "../utils/token.utils.js";

export const signupUserService = async (userData) => {
  const { error } = AuthValidations.signUpUser(userData);
  if (error) {
    throw createHttpError.BadRequest(error.details[0].message);
  }
  const { firstName, lastName, email, password } = userData;
  const isUserExisted = await UserModel.findOne({ email });
  if (isUserExisted) {
    throw createHttpError.Conflict(
      "Email already exists. Please try with another email.",
    );
  }
  const hashPassword = await bcrypt.hash(password, 12);
  const user = new UserModel({
    firstName,
    lastName,
    email,
    password: hashPassword,
  });
  const newUser = await user.save();
  if (!newUser) {
    throw createHttpError.InternalServerError(
      "something wents wrong. Please try again",
    );
  }
  try {
    await createAndSendOtp(newUser);
  } catch (error) {
    logger.error(
      `Failed to send OTP email to ${newUser.email}: ${error.stack || error.message}`,
    );
  }
  return {
    _id: newUser?.id,
    firstName: newUser?.firstName,
    lastName: newUser?.lastName,
    email: newUser?.email,
  };
};

export const createAndSendOtp = async (user, purpose = "verify-email") => {
  const otp = generateOtp();
  await OTPModel.deleteMany({ userId: user._id, purpose });
  await OTPModel.create({
    userId: user._id,
    otp: await bcrypt.hash(otp, 10),
    purpose,
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
  });
  await sendOtpEmail(user, otp, purpose);
};

// Checks a code and deletes it once used, so it can't be reused. Throws if it's wrong.
const consumeOtp = async (user, otp, purpose) => {
  // the TTL index only sweeps about once a minute, so check expiresAt ourselves too
  const otpDoc = await OTPModel.findOne({ userId: user._id, purpose });
  if (!otpDoc || otpDoc.expiresAt < new Date()) {
    throw createHttpError.BadRequest(
      "Code has expired. Please request a new one.",
    );
  }

  const isOtpMatch = await bcrypt.compare(String(otp), otpDoc.otp);
  if (!isOtpMatch) {
    // a 6-digit code can be guessed if attempts are unlimited
    otpDoc.attempts += 1;
    if (otpDoc.attempts >= OTP_MAX_ATTEMPTS) {
      await otpDoc.deleteOne();
      throw createHttpError.BadRequest(
        "Too many wrong attempts. Please request a new code.",
      );
    }
    await otpDoc.save();
    throw createHttpError.BadRequest("Invalid code.");
  }

  await OTPModel.deleteMany({ userId: user._id, purpose });
};

export const verifyOtpService = async (data) => {
  const { error } = AuthValidations.verifyOtp(data);
  if (error) {
    throw createHttpError.BadRequest(error.details[0].message);
  }
  const { email, otp } = data;

  const user = await UserModel.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw createHttpError.NotFound("No account found with this email.");
  }
  if (user.isVerified) {
    throw createHttpError.BadRequest("This email is already verified.");
  }

  await consumeOtp(user, otp, "verify-email");

  user.isVerified = true;
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  user.refreshToken = hashToken(refreshToken);
  await user.save();
  return {
    accessToken,
    refreshToken,
    user: {
      _id: user?.id,
      firstName: user?.firstName,
      lastName: user?.lastName,
      email: user?.email,
      isVerified: user?.isVerified,
    },
  };
};

export const resendOtpService = async (data) => {
  const { error } = AuthValidations.resendOtp(data);
  if (error) {
    throw createHttpError.BadRequest(error.details[0].message);
  }

  const user = await UserModel.findOne({ email: data.email.toLowerCase() });
  if (!user) {
    throw createHttpError.NotFound("No account found with this email.");
  }
  if (user.isVerified) {
    throw createHttpError.BadRequest("This email is already verified.");
  }

  // stop the resend button from being spammed
  const lastOtp = await OTPModel.findOne({
    userId: user._id,
    purpose: "verify-email",
  });
  if (lastOtp) {
    const secondsSince = (Date.now() - lastOtp.createdAt.getTime()) / 1000;
    if (secondsSince < OTP_RESEND_COOLDOWN_SECONDS) {
      const wait = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSince);
      throw createHttpError.TooManyRequests(
        `Please wait ${wait} seconds before requesting a new code.`,
      );
    }
  }

  try {
    await createAndSendOtp(user);
  } catch (error) {
    logger.error(
      `Failed to send OTP email to ${user.email}: ${error.stack || error.message}`,
    );
    throw createHttpError(
      503,
      "Could not send verification email. Please try again.",
      { expose: true },
    );
  }
};

export const loginUserService = async (userData) => {
  const { error } = AuthValidations.loginUser(userData);
  if (error) {
    throw createHttpError.BadRequest(error.details[0].message);
  }
  const { email, password } = userData;
  const user = await UserModel.findOne({ email: email.toLowerCase() });
  // check the user exists before touching user.password
  const matchPassword = user && (await bcrypt.compare(password, user.password));

  if (!matchPassword) {
    throw createHttpError.Unauthorized(
      "Invalid credentials. Please provide valid credentials",
    );
  }
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  user.refreshToken = hashToken(refreshToken);
  await user.save();

  return {
    accessToken,
    refreshToken,
    user: {
      firstName: user?.firstName,
      lastName: user?.lastName,
      email: user?.email,
      isVerified: user?.isVerified,
    },
  };
};

export const refreshTokenService = async (token) => {
  if (!token) throw createHttpError.Unauthorized("Refresh token is missing");

  let payload;
  try {
    payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  } catch (error) {
    throw createHttpError.Unauthorized("Invalid or expired refresh token.");
  }

  const user = await UserModel.findById(payload.id).select("+refreshToken");
  // a valid JWT that doesn't match the stored hash was already used or revoked
  if (!user || user.refreshToken !== hashToken(token)) {
    if (user) {
      user.refreshToken = undefined; // possible theft: log this user out everywhere
      await user.save();
    }
    throw createHttpError.Unauthorized(
      "Refresh token reuse detected. Please log in again.",
    );
  }
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  user.refreshToken = hashToken(refreshToken);
  await user.save();

  return { accessToken, refreshToken };
};

export const forgotPasswordService = async (data) => {
  const { error } = AuthValidations.forgotPassword(data);
  if (error) {
    throw createHttpError.BadRequest(error.details[0].message);
  }

  // nobody can use this endpoint to find out which emails have accounts
  const user = await UserModel.findOne({ email: data.email.toLowerCase() });
  if (!user) return;

  // stop the button from being used to spam someone's inbox
  const lastOtp = await OTPModel.findOne({
    userId: user._id,
    purpose: "reset-password",
  });
  if (lastOtp) {
    const secondsSince = (Date.now() - lastOtp.createdAt.getTime()) / 1000;
    if (secondsSince < OTP_RESEND_COOLDOWN_SECONDS) return;
  }

  try {
    await createAndSendOtp(user, "reset-password");
  } catch (error) {
    logger.error(
      `Failed to send reset email to ${user.email}: ${error.stack || error.message}`,
    );
  }
};

export const resetPasswordService = async (data) => {
  const { error } = AuthValidations.resetPassword(data);
  if (error) {
    throw createHttpError.BadRequest(error.details[0].message);
  }
  const { email, otp, newPassword } = data;

  const user = await UserModel.findOne({ email: email.toLowerCase() });
  // same message as a wrong code, so this doesn't reveal which emails exist
  if (!user) {
    throw createHttpError.BadRequest(
      "Code has expired. Please request a new one.",
    );
  }

  await consumeOtp(user, otp, "reset-password");

  user.password = await bcrypt.hash(newPassword, 12);
  user.isVerified = true;
  // log out every device - whoever had the old password loses access
  user.refreshToken = undefined;
  await user.save();
};

export const changePasswordService = async (userId, data) => {
  const { error } = AuthValidations.changePassword(data);
  if (error) {
    throw createHttpError.BadRequest(error.details[0].message);
  }
  const { currentPassword, newPassword } = data;

  const user = await UserModel.findById(userId);
  if (!user) throw createHttpError.NotFound("User not found.");

  const matchPassword = await bcrypt.compare(currentPassword, user.password);
  if (!matchPassword) {
    throw createHttpError.BadRequest("Current password is incorrect.", {
      errors: { currentPassword: "Current password is incorrect." },
    });
  }

  user.password = await bcrypt.hash(newPassword, 12);
  // new refresh token replaces the stored one, so other devices are logged out
  // but this one stays logged in
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  user.refreshToken = hashToken(refreshToken);
  await user.save();

  return { accessToken, refreshToken };
};

export const logoutService = async (token) => {
  if (!token) return;
  await UserModel.updateOne(
    { refreshToken: hashToken(token) },
    { $unset: { refreshToken: 1 } },
  );
};
