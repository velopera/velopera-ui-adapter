import { logger } from "shared-data";
import { Device } from "../helpers/device";
import { MqttService } from "../services/MqttService";
import { DeviceStatus, DeviceStatusCache } from "../types/types";

// A map to cache the latest states of devices.
let deviceStatusCache: Map<string, any> = new Map<string, any>();

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
      device.on("deviceStatus", (data) => {
        try {
          deviceStatusCache.set(key, {
            imei: device.imei,
            veloId: device.veloId,
            statusData: data,
          });
        } catch (error) {
          logger.error("Error caching device status:", error);
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

// Function to return the cached last states of devices.
export const getCachedMessage = (): DeviceStatusCache => {
  let obj = Object.create(null) as DeviceStatusCache;
  for (let [key, value] of deviceStatusCache) {
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
