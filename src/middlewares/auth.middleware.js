import jwt from "jsonwebtoken";
import createHttpError from "http-errors";
import UserModel from "../models/users.model.js";

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
  // role comes from the database, not the token, so it can't be out of date
  req.user = { id: user.id, role: user.role };
  next();
};

// Use after AuthMiddleware, e.g. router.use(AuthMiddleware, requireRole("admin"))
export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      throw createHttpError.Forbidden("You don't have permission to do this.");
    }
    next();
  };

// Writing posts, comments and likes is for users - the admin account only manages the app
export const UserOnly = [AuthMiddleware, requireRole("user")];

// For public routes that show more to a logged-in user, e.g. an author viewing their own draft.
// No token -> carries on as a guest. A token that is sent must still be valid, so the
// frontend gets a 401 and refreshes it instead of silently being treated as a guest.
export const OptionalAuthMiddleware = (req, res, next) =>
  req.headers.authorization ? AuthMiddleware(req, res, next) : next();

export default AuthMiddleware;
