import { JwtPayload } from "jsonwebtoken";

export interface DeviceStatus {
  imei: string;
  veloId: string;
  statusData: any;
}

export interface DeviceLogin {
  imei: string;
  veloId: string;
  loginData: any;
}

export interface DeviceGps {
  imei: string;
  veloId: string;
  gpsData: any;
}

export interface DeviceStatusCache {
  [key: string]: DeviceStatus;
}

export interface DeviceLoginCache {
  [key: string]: DeviceLogin;
}

export interface DeviceGpsCache {
  [key: string]: DeviceGps;
}

export interface DecodedJwtPayload extends JwtPayload {
  name?: string;
}
