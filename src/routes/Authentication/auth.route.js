import express from 'express';
import trimRequest from "trim-request";
import { loginUser, logoutUser, refreshToken, resendOtp, signupUser, verifyOtp } from "../../controllers/authentication/auth.controller.js";

const router = express.Router();
router.route("/sign-up").post(trimRequest.all, signupUser);
router.route("/verify-otp").post(trimRequest.all, verifyOtp);
router.route("/resend-otp").post(trimRequest.all, resendOtp);
router.route("/login").post(trimRequest.all, loginUser);
router.route("/refresh-token").post(refreshToken);
router.route("/logout").post(logoutUser);


export default router;
