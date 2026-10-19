import createHttpError from "http-errors";
import bcrypt from "bcryptjs";
import UserModel from "../models/users.model.js";
import OTPModel from "../models/otp.model.js";
import { AuthValidations } from "../validations/auth.validation.js";
import {
  generateOtp,
  sendOtpEmail,
  OTP_EXPIRY_MINUTES,
} from "../utils/service.util.js";
import logger from "../config/logger.config.js";

export const createAndSendOtp = async (user) => {
  const otp = generateOtp();
  await OTPModel.deleteMany({ userId: user._id });
  await OTPModel.create({
    userId: user._id,
    otp: await bcrypt.hash(otp, 10),
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
  });
  await sendOtpEmail(user, otp);
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

  // the TTL index only sweeps about once a minute, so check expiresAt ourselves too
  const otpDoc = await OTPModel.findOne({ userId: user._id });
  if (!otpDoc || otpDoc.expiresAt < new Date()) {
    throw createHttpError.BadRequest(
      "Verification code has expired. Please request a new one.",
    );
  }

  const isOtpMatch = await bcrypt.compare(String(otp), otpDoc.otp);
  if (!isOtpMatch) {
    throw createHttpError.BadRequest("Invalid verification code.");
  }

  // correct code - mark verified and delete the otp so it can't be reused
  user.isVerified = true;
  await user.save();
  await OTPModel.deleteMany({ userId: user._id });

  return {
    _id: user?.id,
    firstName: user?.firstName,
    lastName: user?.lastName,
    email: user?.email,
    isVerified: user?.isVerified,
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
  const lastOtp = await OTPModel.findOne({ userId: user._id });
  if (lastOtp) {
    const secondsSince = (Date.now() - lastOtp.createdAt.getTime()) / 1000;
    if (secondsSince < OTP_RESEND_COOLDOWN_SECONDS) {
      const wait = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSince);
      throw createHttpError.TooManyRequests(`Please wait ${wait} seconds before requesting a new code.`);
    }
  }

  try {
    await createAndSendOtp(user);
  } catch (error) {
    logger.error(`Failed to send OTP email to ${user.email}: ${error.stack || error.message}`);
    throw createHttpError(503, "Could not send verification email. Please try again.", { expose: true });
  }
};
