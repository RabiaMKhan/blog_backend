import express from 'express';
import trimRequest from "trim-request";
import { loginUser, resendOtp, signupUser, verifyOtp } from "../../controllers/authentication/auth.controller.js";

const router = express.Router();
router.route("/sign-up").post(trimRequest.all, signupUser);
router.route("/verify-otp").post(trimRequest.all, verifyOtp);
router.route("/resend-otp").post(trimRequest.all, resendOtp);
router.route("/login").post(trimRequest.all, loginUser);

export default router;
