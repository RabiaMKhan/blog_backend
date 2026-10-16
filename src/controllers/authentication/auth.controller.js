import { signupUserService } from "../../services/users.services.js";

// Create New User - sends a verification code to their email
export const signupUser = async (req, res) => {
  const user = await signupUserService(req.body);
  res.status(201).json({
    message:
      "User registered successfully. Please check your email for the verification code.",
    user,
  });
};

// // Verify the email with the code that was sent
// export const verifyOtp = async (req, res) => {
//     const user = await verifyOtpService(req.body);
//     res.status(200).json({
//         message: "Email verified successfully",
//         user,
//     });
// };

// // Send a new verification code
// export const resendOtp = async (req, res) => {
//     await resendOtpService(req.body);
//     res.status(200).json({
//         message: "A new verification code has been sent to your email",
//     });
// };
