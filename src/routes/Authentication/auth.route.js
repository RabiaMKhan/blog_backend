import express from 'express';
import trimRequest from "trim-request";
import { signupUser } from "../../controllers/authentication/auth.controller.js";
import { resendOtp, verifyOtp } from "../../controllers/authentication/otp.controller.js";

const router = express.Router();
router.route("/sign-up").post(trimRequest.all, signupUser);
router.route("/verify-otp").post(trimRequest.all, verifyOtp);
router.route("/resend-otp").post(trimRequest.all, resendOtp);

export default router;
