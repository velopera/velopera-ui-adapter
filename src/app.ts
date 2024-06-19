import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express from "express";
import http from "http";
import { logger } from "shared-data";
import { ApiRoutes } from "./api/api";
import { MqttController } from "./controllers/MqttController";
import { Database } from "./database/db";

// Load environment variables
dotenv.config();

const app: express.Application = express();
const server = http.createServer(app);

// Middleware to parse JSON body
app.use(express.json());

// Middleware to parse Cookie
app.use(cookieParser());

// Use the centralized API routes
const apiRoutes = new ApiRoutes();
app.use("/ui/api", apiRoutes.getRouter());

// Main function to initialize the server and database connection
export class Main {
  async run() {
    logger.info("Main run...");

    try {
      // Initialize database and fetch device data
      const db = new Database();
      logger.debug("Populating device cache");
      const devices = await db.getDevices();
      // Log the retrieved devices
      console.table(devices);
      logger.info(`Devices: ${[...devices]}`);

      // Initialize MQTT controller with fetched devices
      new MqttController(devices);
    } catch (error) {
      logger.error("Initialization error:", error);
    }

    // Start the HTTP server and listen on the designated port
    const PORT = process.env.SERVER_PORT || 9090;
    server.listen(PORT, () => {
      logger.info(`Server listening on port ${PORT}`);
    });
  }
}

const main = new Main();

main.run().catch((e: any) => {
  logger.error("ERROR::: Main.run() failed: ", e);
  logger.end();
  process.exit(1);
});

export { app };
