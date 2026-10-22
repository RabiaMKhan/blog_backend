import {
  changePasswordService,
  forgotPasswordService,
  loginUserService,
  logoutService,
  refreshTokenService,
  resendOtpService,
  resetPasswordService,
  signupUserService,
  verifyOtpService,
} from "../../services/users.services.js";
import { refreshCookieOptions } from "../../utils/token.utils.js";

// Create New User - sends a verification code to their email
export const signupUser = async (req, res) => {
  const user = await signupUserService(req.body);
  res.status(201).json({
    message:
      "User registered successfully. Please check your email for the verification code.",
    user,
  });
};

// Verify the email with the code that was sent
export const verifyOtp = async (req, res) => {
  const { refreshToken, ...data } = await verifyOtpService(req.body);
  res.cookie("refreshToken", refreshToken, refreshCookieOptions);
  res.status(200).json({
    message: "Email verified successfully",
    ...data,
  });
};

// // Send a new verification code
export const resendOtp = async (req, res) => {
  await resendOtpService(req.body);
  res.status(200).json({
    message: "A new verification code has been sent to your email",
  });
};

export const loginUser = async (req, res) => {
   const { refreshToken, ...data } = await loginUserService(req.body);
   res.cookie('refreshToken', refreshToken, refreshCookieOptions)
  res.status(200).json({
    message: "User loggedIn successfully.",
    ...data,
  });
};

export const refreshToken = async (req, res) => {
  const { accessToken, refreshToken } = await refreshTokenService(req.cookies.refreshToken);
  res.cookie("refreshToken", refreshToken, refreshCookieOptions);
  res.status(200).json({ accessToken });
};

// Email a password reset code - same reply whether or not the email has an account
export const forgotPassword = async (req, res) => {
  await forgotPasswordService(req.body);
  res.status(200).json({
    message: "If an account exists for this email, a password reset code has been sent.",
  });
};

// Set a new password with the emailed code - logs out every device
export const resetPassword = async (req, res) => {
  await resetPasswordService(req.body);
  res.status(200).json({
    message: "Password reset successfully. Please log in with your new password.",
  });
};

// Change password while logged in - other devices are logged out, this one stays in
export const changePassword = async (req, res) => {
  const { accessToken, refreshToken } = await changePasswordService(req.user.id, req.body);
  res.cookie("refreshToken", refreshToken, refreshCookieOptions);
  res.status(200).json({
    message: "Password changed successfully.",
    accessToken,
  });
};

export const logoutUser = async (req, res) => {
  await logoutService(req.cookies.refreshToken);
  // clearCookie needs the same path, sameSite and secure values, or the browser keeps the cookie
  const { maxAge, ...clearOptions } = refreshCookieOptions;
  res.clearCookie("refreshToken", clearOptions);
  res.status(200).json({ message: "Logged out successfully." });
};