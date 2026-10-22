import jwt from "jsonwebtoken";
import createHttpError from "http-errors";
import UserModel from "../models/users.model.js";

// Protects a route: expects "Authorization: Bearer <accessToken>" and sets req.user
export const AuthMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw createHttpError.Unauthorized("Access denied. Token is required.");
  }

  const token = authHeader.split(" ")[1];
  let payload;
  try {
    payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw createHttpError.Unauthorized(
      error.name === "TokenExpiredError" ? "Token has expired." : "Invalid token.",
    );
  }

  // a valid token for a deleted account must not keep working until it expires
  const user = await UserModel.findById(payload.id);
  if (!user) {
    throw createHttpError.Unauthorized("User no longer exists.");
  }
  if (!user.isVerified) {
    throw createHttpError.Forbidden("Please verify your email first.");
  }

  req.user = { id: user.id, role: payload.role };
  next();
};

export default AuthMiddleware;
