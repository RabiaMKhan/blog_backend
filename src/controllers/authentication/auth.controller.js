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
