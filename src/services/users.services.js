import createHttpError from "http-errors";
import bcrypt from "bcryptjs";
import UserModel from "../models/users.model.js";
import { AuthValidations } from "../validations/auth.validation.js";
import { createAndSendOtp } from "./otp.services.js";
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
