export interface DeviceStatus {
  imei: string;
  veloId: string;
  statusData: any;
}

export interface DeviceStatusCache {
  [key: string]: DeviceStatus;
}
