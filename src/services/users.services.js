import createHttpError from "http-errors";
import bcrypt from "bcryptjs";
import UserModel from "../models/users.model.js";
import { AuthValidations } from "../validations/auth.validation.js";
import { genrateOTPAndSendEmail } from "../utils/service.util.js";
import logger from "../config/logger.config.js";

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
  if(!newUser){
    throw createHttpError.InternalServerError('something wents wrong. Please try again')
  }
  try{
    await genrateOTPAndSendEmail(newUser);
  }catch(error) {
    // the account is created - the user can request a new code via /resend-otp
    logger.error(`Failed to send OTP email to ${newUser.email}: ${error.stack || error.message}`);
  }
  return {
    _id: newUser?.id,
    firstName: newUser?.firstName,
    lastName: newUser?.lastName,
    email: newUser?.email
  };
};

// export const verifyOtpService = async (data) => {
//   const { error } = AuthValidations.verifyOtp(data);
//   if (error) {
//     throw createHttpError.BadRequest(error.details[0].message);
//   }
//   const { email, otp } = data;

//   const user = await UserModel.findOne({ email: email.toLowerCase() }).select(OTP_FIELDS);
//   if (!user) {
//     throw createHttpError.NotFound("No account found with this email.");
//   }
//   if (user.isVerified) {
//     throw createHttpError.BadRequest("This email is already verified.");
//   }
//   if (!user.otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
//     throw createHttpError.BadRequest("Verification code has expired. Please request a new one.");
//   }
//   if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
//     throw createHttpError.TooManyRequests("Too many wrong attempts. Please request a new code.");
//   }

//   if (!isOtpMatch(otp, user.otp)) {
//     user.otpAttempts += 1;
//     await user.save();
//     const attemptsLeft = OTP_MAX_ATTEMPTS - user.otpAttempts;
//     throw createHttpError.BadRequest(
//       attemptsLeft > 0
//         ? `Invalid verification code. ${attemptsLeft} attempt(s) left.`
//         : "Too many wrong attempts. Please request a new code.",
//     );
//   }

//   // correct code - mark verified and clear the otp so it can't be reused
//   user.isVerified = true;
//   user.otp = undefined;
//   user.otpExpiresAt = undefined;
//   user.otpAttempts = 0;
//   user.otpLastSentAt = undefined;
//   await user.save();

//   return {
//     _id: user?.id,
//     firstName: user?.firstName,
//     lastName: user?.lastName,
//     email: user?.email,
//     isVerified: user?.isVerified,
//   };
// };

// export const resendOtpService = async (data) => {
//   const { error } = AuthValidations.resendOtp(data);
//   if (error) {
//     throw createHttpError.BadRequest(error.details[0].message);
//   }

//   const user = await UserModel.findOne({ email: data.email.toLowerCase() }).select(OTP_FIELDS);
//   if (!user) {
//     throw createHttpError.NotFound("No account found with this email.");
//   }
//   if (user.isVerified) {
//     throw createHttpError.BadRequest("This email is already verified.");
//   }

//   // stop the resend button from being spammed
//   if (user.otpLastSentAt) {
//     const secondsSince = (Date.now() - user.otpLastSentAt.getTime()) / 1000;
//     if (secondsSince < OTP_RESEND_COOLDOWN_SECONDS) {
//       const wait = Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - secondsSince);
//       throw createHttpError.TooManyRequests(`Please wait ${wait} seconds before requesting a new code.`);
//     }
//   }

//   try {
//     await genrateOTPAndSendEmail(user);
//   } catch (error) {
//     logger.error(`Failed to send OTP email to ${user.email}: ${error.stack || error.message}`);
//     throw createHttpError(503, "Could not send verification email. Please try again.", { expose: true });
//   }
// };
