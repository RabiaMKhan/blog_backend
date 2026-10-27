import rateLimit from "express-rate-limit";
import createHttpError from "http-errors";

// send the error through the app's error handler, so it has the usual { error } shape
const limiter = (windowMinutes, limit, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: "draft-8", // tells the client when it can try again
    legacyHeaders: false,
    handler: (req, res, next) => next(createHttpError.TooManyRequests(message)),
  });

// every route - stops one client from flooding the API
export const apiLimiter = limiter(15, 300, "Too many requests. Please slow down.");

// login, sign-up and the code/password routes - stops passwords and codes being guessed.
// one count shared by all of them, per IP
export const authLimiter = limiter(
  15,
  20,
  "Too many attempts. Please try again in 15 minutes.",
);
