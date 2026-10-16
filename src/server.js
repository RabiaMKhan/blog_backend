import "dotenv/config";
import mongoose from "mongoose";
import app from "./app.js";
import logger from "./config/logger.config.js";

const PORT = process.env.PORT || 8000;

try {
    await mongoose.connect(process.env.DATABASE_URL);
    logger.info("Database connected successfully");
} catch (error) {
    logger.error(`Error connecting to database: ${error.message}`);
    process.exit(1);
}

// Express 5 passes listen errors (e.g. port already in use) to this callback
app.listen(PORT, (error) => {
    if (error) {
        logger.error(`Failed to start server on port ${PORT}: ${error.message}`);
        process.exit(1);
    }
    logger.info(`Server is running on port ${PORT}`);
});
