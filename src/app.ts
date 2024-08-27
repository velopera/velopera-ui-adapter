import { config } from "dotenv";
import express from "express";
import { logger } from "shared-data";
import { Api } from "./api/api";
import { MqttController } from "./controllers/MqttController";
import { Database } from "./database/db";

// Load environment variables from .env file
config();

const app: express.Application = express();

export class Main {
  api: Api | undefined;
  async run() {
    logger.info("Main run...");

    try {
      // Initialize database and populate device cache
      const db = new Database();
      logger.debug("Populating device cache");
      const devices = await db.getDevices();
      logger.info(`Devices: ${[...devices]}`);

      // Initialize Api
      this.api = new Api(app);

      // Initialize MQTT controller with fetched devices and uplink server
      new MqttController(devices, this.api);
    } catch (error) {
      logger.error("Initialization error:", error);
    }
  }
}

// Create an instance of Main and run it
const main = new Main();

main.run().catch((error: any) => {
  console.log("ERROR::: Main.run() failed: ", error);
  logger.end();
  process.exit(1);
});

export { app };
