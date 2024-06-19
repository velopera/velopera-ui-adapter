import { EventEmitter } from "events";
import { MessageParser, logger } from "shared-data";

export class Device extends MessageParser {
  private eventEmitter: EventEmitter;

  constructor(public imei: string, public veloId: string) {
    super(imei, veloId);
    this.eventEmitter = new EventEmitter();
  }

  // Emit an event when parsed data is handled
  protected handleParsedData(data: any): void {
    logger.debug(`||| Emitting Data Event ||| \n${JSON.stringify(data)}`);
    this.eventEmitter.emit("deviceStatus", data);
  }

  // Method to allow external listeners to subscribe to events
  public on(event: string, listener: (...args: any[]) => void): this {
    this.eventEmitter.on(event, listener);
    return this;
  }

  // Method to allow external listeners to unsubscribe from events
  public off(event: string, listener: (...args: any[]) => void): this {
    this.eventEmitter.off(event, listener);
    return this;
  }
}
