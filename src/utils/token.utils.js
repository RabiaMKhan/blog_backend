import jwt from "jsonwebtoken";
import crypto from 'crypto';

export const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRY_DAYS || 7);

export const generateAccessToken = (user) =>
    jwt.sign({ id: user._id, role: user.role }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m",
  });

// sid is the session (device) this token belongs to.
// jwtid makes every token unique, so rotation can tell old and new tokens apart
export const generateRefreshToken = (user, sessionId) =>
  jwt.sign({ id: user._id, sid: sessionId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: `${REFRESH_DAYS}d`,
    jwtid: crypto.randomUUID(),
  });

export const hashToken = (token) =>
    crypto.createHash('sha256').update(token).digest("hex");


export const refreshCookieOptions = {
  httpOnly: true,                                  // JS can't read it (protects against XSS)
  secure: process.env.NODE_ENV === "production",   // HTTPS only in production
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/api/v1/auth",                            // only sent to the auth routes
  maxAge: REFRESH_DAYS * 24 * 60 * 60 * 1000,
};
