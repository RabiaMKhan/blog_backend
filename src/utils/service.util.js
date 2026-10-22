import { sendMail } from "../config/mailer.config.js";

export const OTP_EXPIRY_MINUTES = 10;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const OTP_MAX_ATTEMPTS = 5;

const OTP_EMAIL_COPY = {
  "verify-email": {
    subject: "Your verification code",
    label: "verification code",
    ignore: "If you didn't sign up, you can ignore this email.",
  },
  "reset-password": {
    subject: "Your password reset code",
    label: "password reset code",
    ignore:
      "If you didn't ask to reset your password, you can ignore this email - your password won't change.",
  },
};

export const generateOtp = () => {
  const length = 6;
  const otp = Math.floor(
    Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1),
  );
  return String(otp);
};

export const sendOtpEmail = async (user, otp, purpose = "verify-email") => {
  const copy = OTP_EMAIL_COPY[purpose];
  await sendMail({
    to: user.email,
    subject: copy.subject,
    text: `Hi ${user.firstName}, your ${copy.label} is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    html: `
        <p>Hi ${user.firstName},</p>
        <p>Your ${copy.label} is:</p>
        <h2 style="letter-spacing: 4px;">${otp}</h2>
        <p>It expires in ${OTP_EXPIRY_MINUTES} minutes. ${copy.ignore}</p>
      `,
  });
};
