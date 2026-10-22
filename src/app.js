import express from "express";
import cors from "cors";
import helmet from "helmet";
import bodyParser from "body-parser";
import routes from "./routes/index.js";
import createHttpError from "http-errors";
import nosqlInjectionMiddleware from "./middlewares/noSqlInjection.middleware.js"
import logger from "./config/logger.config.js";
import cookieParser from "cookie-parser";

const app = express();

// middleware to allow cross-origin requests
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true })); 
// middleware to apply security on the http headers
app.use(helmet()); 
app.use(cookieParser());
// limit the payload
const bodyLimit = process.env.BODY_PARSER_LIMIT || "50mb";
// middleware to parse incoming requests with JSON payloads
app.use(express.json({ limit: bodyLimit })); 
// middleware to parse incoming requests with URL-encoded payloads
app.use(bodyParser.urlencoded({ limit: bodyLimit, extended: true })); 
// middleware to sanitize query parameters
app.use(nosqlInjectionMiddleware); 

// middleware to handle all the routes
app.use("/api/v1", routes); 
app.use(async (req, res, next) => {
  next(createHttpError.NotFound("Route not found"));
});

// error handler - must be registered last
app.use((err, req, res, next) => {
  // duplicate key from a unique index (e.g. two sign-ups with the same email at once)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    err = createHttpError(409, `This ${field} is already in use`, {
      errors: { [field]: `This ${field} is already in use` },
    });
  }

  const status = err.status || 500;
  if (status >= 500) logger.error(err.cause?.stack || err.stack || err.message);

  // http-errors marks 4xx as safe to show; 5xx only when created with { expose: true }
  const expose = err.expose ?? status < 500;

  res.status(status).json({
    error: {
      status,
      // don't leak internal error details to the client
      message: expose ? err.message : "Internal Server Error",
      // per-field messages for the frontend, e.g. { email: "..." }
      ...(err.errors && { errors: err.errors }),
    },
  });
});

export default app;
