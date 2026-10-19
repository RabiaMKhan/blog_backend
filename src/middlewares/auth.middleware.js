import jwt from "jsonwebtoken";

export const AuthMiddleware = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startWith("Bearer")) {
      return res.status(401).json({
        success: false,
        message: "Access deinied. Token is required.",
      });
    }

    const token = authHeader?.split(" ")[1];
    // verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach decoded user data to request
    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        error.name === "TokenExpiredError"
          ? "Token has expired."
          : "Invalid token.",
    });
  }
};

export default AuthMiddleware
