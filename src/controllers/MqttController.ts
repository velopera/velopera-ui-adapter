import { logger } from "shared-data";
import { Device } from "../helpers/device";
import { MqttService } from "../services/MqttService";
import { DeviceStatus, DeviceStatusCache } from "../types/types";

// Map to cache the latest states of devices.
let deviceStatusCache: Map<string, any> = new Map<string, any>();
let deviceLoginCache: Map<string, any> = new Map<string, any>();

export class MqttController {
  private mqttService: MqttService;
  private devices: Map<string, Device>;

  constructor(devices: Map<string, Device>) {
    this.devices = devices;
    this.mqttService = new MqttService();

    // Event listeners for MQTT service events.
    this.mqttService.event.on("connected", () => {
      this.onConnected();
    });
    this.mqttService.event.on("disconnected", () => {
      this.onDisconnected();
    });
    this.mqttService.event.on("message", (topic: string, payload: Buffer) => {
      this.onMessage(topic, payload);
    });

    // Subscribe to device events and update the cache.
    this.devices.forEach((device, key) => {
      device.on("deviceStatus", (statusData) => {
        try {
          const dataToSend = {
            imei: device.imei,
            veloId: device.veloId,
            statusData: statusData,
          };

          deviceStatusCache.set(key, dataToSend);
          logger.info("Device status received:", statusData);
        } catch (error) {
          let errorMessage = "An unexpected error occurred.";
          if (error instanceof Error) {
            errorMessage = error.message;
          }
          logger.error("Error caching device status:", errorMessage);
        }
      });
      device.on("deviceLogin", (loginData) => {
        try {
          const dataToSend = {
            imei: device.imei,
            veloId: device.veloId,
            loginData: loginData,
          };
          deviceLoginCache.set(key, dataToSend);
          logger.info("Device Login received:", loginData);
        } catch (error) {
          let errorMessage = "An unexpected error occurred.";
          if (error instanceof Error) {
            errorMessage = error.message;
          }
          logger.error("Error caching device status:", errorMessage);
        }
      });
    });
  }

  // Handles the connection event by subscribing to topics.
  private onConnected() {
    this.mqttService.subscribe("ind/#");
    logger.debug("MQTT connected and subscribed to ind/#");
  }

  // Handles the disconnection event.
  private onDisconnected() {
    logger.debug("MQTT disconnected");
  }

  // Processes received MQTT messages by delegating to the corresponding device.
  private onMessage(topic: string, payload: Buffer) {
    let tpc = topic.split("/");
    this.devices.get(tpc[1])?.handle(topic, payload);
  }
}

// Function to return the cached last status of devices.
export const getCachedStatusMessage = (): DeviceStatusCache => {
  let obj = Object.create(null) as DeviceStatusCache;
  for (let [key, value] of deviceStatusCache) {
    obj[key] = value as DeviceStatus;
  }
  return obj;
};

// Function to return the cached last logins of devices.
export const getCachedLoginMessage = (): DeviceStatusCache => {
  let obj = Object.create(null) as DeviceStatusCache;
  for (let [key, value] of deviceLoginCache) {
    obj[key] = value as DeviceStatus;
  }
  return obj;
};

// Function to return the cached last states of specified device
export const getCachedMessageById = (veloId: string) => {
  for (let [_key, value] of deviceStatusCache) {
    if (value.veloId === veloId) {
      return value;
    }
  }
  return null;
};
