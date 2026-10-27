import express from 'express';
import trimRequest from "trim-request";
import { changePassword, forgotPassword, loginUser, logoutUser, refreshToken, resendOtp, resetPassword, signupUser, verifyOtp } from "../../controllers/authentication/auth.controller.js";
import AuthMiddleware from "../../middlewares/auth.middleware.js";
import { authLimiter } from "../../middlewares/rateLimit.middleware.js";

const router = express.Router();
router.route("/sign-up").post(authLimiter, trimRequest.all, signupUser);
router.route("/verify-otp").post(authLimiter, trimRequest.all, verifyOtp);
router.route("/resend-otp").post(authLimiter, trimRequest.all, resendOtp);
router.route("/login").post(authLimiter, trimRequest.all, loginUser);
router.route("/refresh-token").post(refreshToken);
router.route("/logout").post(logoutUser);
router.route("/forgot-password").post(authLimiter, trimRequest.all, forgotPassword);
router.route("/reset-password").post(authLimiter, trimRequest.all, resetPassword);
router.route("/change-password").patch(authLimiter, AuthMiddleware, trimRequest.all, changePassword);


export default router;
