// ============================================================
// Real Map & Route — unified location/route data types
// Data Provenance: 所有外部真实数据都带 source/sourceType/fetchedAt
// ============================================================

export type RouteMode = "DRIVING" | "WALKING" | "TRANSIT";

export const DATA_SOURCE = "AMAP" as const;
export const DATA_SOURCE_TYPE = "EXTERNAL_DATA" as const;

// ---- 溯源（Provenance）----
export interface Provenance {
  source: string;
  sourceType: string;
  fetchedAt: string;
}

// ---- 地理坐标 ----
export interface GeoLocation {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  source: string;
  sourceType: string;
  fetchedAt: string;
}

// ---- 逆地理编码地址 ----
export interface Address {
  formatted: string;
  province?: string;
  city?: string;
  district?: string;
  source: string;
  sourceType: string;
  fetchedAt: string;
}

// ---- POI ----
export interface POI {
  id: string;
  name: string;
  type: string;
  address: string;
  location: GeoLocation;
  distance?: number;
  source: string;
  sourceType: string;
  fetchedAt: string;
}

// ---- 距离（米）----
export interface Distance {
  value: number;
  unit: "m";
  source: string;
  sourceType: string;
  fetchedAt: string;
}

// ---- 时长（秒）----
export interface Duration {
  value: number;
  unit: "s";
  source: string;
  sourceType: string;
  fetchedAt: string;
}

// ---- 路线坐标点 ----
export interface RoutePoint {
  longitude: number;
  latitude: number;
}

// ---- 路线结果 ----
export interface RouteResult {
  origin: GeoLocation;
  destination: GeoLocation;
  distance: Distance;
  duration: Duration;
  mode: RouteMode;
  polyline: RoutePoint[];
  source: string;
  sourceType: string;
  fetchedAt: string;
}

// ---- 统一错误体 ----
export interface TravelDataApiError {
  error: {
    status: number;
    message: string;
    provider: string;
  };
}
