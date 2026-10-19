import { resendOtpService, verifyOtpService } from "../../services/otp.services.js";

// Verify the email with the code that was sent
export const verifyOtp = async (req, res) => {
  const user = await verifyOtpService(req.body);
  res.status(200).json({
    message: "Email verified successfully",
    user,
  });
};

// // Send a new verification code
export const resendOtp = async (req, res) => {
  await resendOtpService(req.body);
  res.status(200).json({
    message: "A new verification code has been sent to your email",
  });
};
