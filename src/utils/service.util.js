import { sendMail } from "../config/mailer.config.js";

export const OTP_EXPIRY_MINUTES = 10;

export const generateOtp = (user) => {
  const length = 6;
  const otp = Math.floor(
    Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1),
  );
  user.otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  return otp;
};

export const genrateOTPAndSendEmail = async (user) => {
  const otp = generateOtp(user);
  await sendMail({
    to: user.email,
    subject: "Your verification code",
    text: `Hi ${user.firstName}, your verification code is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    html: `
        <p>Hi ${user.firstName},</p>
        <p>Your verification code is:</p>
        <h2 style="letter-spacing: 4px;">${otp}</h2>
        <p>It expires in ${OTP_EXPIRY_MINUTES} minutes. If you didn't sign up, you can ignore this email.</p>
      `,
  });
};
