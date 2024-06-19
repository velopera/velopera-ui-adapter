import { config } from "dotenv";
import { createPool, RowDataPacket } from "mysql2/promise";
import { logger } from "shared-data";
import { Device } from "../helpers/device";

// Load environment variables from the .env file
config();

// Class for managing database operations
export class Database {
  private pool;

  constructor() {
    // Establish a pool of connections to the MySQL database
    this.pool = createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });
  }

  // Fetch and return a map of devices from the database
  async getDevices(): Promise<Map<string, Device>> {
    const connection = await this.pool.getConnection();
    try {
      // Query to retrieve device information from the database
      const [rows] = await connection.query<RowDataPacket[]>(
        "SELECT imei, veloId FROM iot_device"
      );
      const deviceMap = new Map<string, Device>();
      // Populate the map with Device instances
      rows.forEach((row) => {
        const device = new Device(row.imei, row.veloId);
        deviceMap.set(row.imei, device);
      });
      return deviceMap;
    } catch (error) {
      logger.error("Database error:", error); // Logging the error
      throw error; // Re-throwing the error for higher level handling
    } finally {
      // Release the connection back to the pool
      connection.release();
    }
  }
}
