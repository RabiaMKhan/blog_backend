import express from 'express';
import trimRequest from "trim-request";
import { changePassword, forgotPassword, loginUser, logoutUser, refreshToken, resendOtp, resetPassword, signupUser, verifyOtp } from "../../controllers/authentication/auth.controller.js";
import AuthMiddleware from "../../middlewares/auth.middleware.js";

const router = express.Router();
router.route("/sign-up").post(trimRequest.all, signupUser);
router.route("/verify-otp").post(trimRequest.all, verifyOtp);
router.route("/resend-otp").post(trimRequest.all, resendOtp);
router.route("/login").post(trimRequest.all, loginUser);
router.route("/refresh-token").post(refreshToken);
router.route("/logout").post(logoutUser);
router.route("/forgot-password").post(trimRequest.all, forgotPassword);
router.route("/reset-password").post(trimRequest.all, resetPassword);
router.route("/change-password").patch(AuthMiddleware, trimRequest.all, changePassword);


export default router;
