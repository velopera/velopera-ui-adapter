import { JwtPayload } from "jsonwebtoken";

export interface DeviceStatus {
  imei: string;
  veloId: string;
  statusData: any;
}

export interface DeviceStatusCache {
  [key: string]: DeviceStatus;
}

export interface DecodedJwtPayload extends JwtPayload {
  name?: string;
}
