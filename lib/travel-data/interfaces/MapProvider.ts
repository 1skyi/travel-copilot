// ============================================================
// MapProvider — 地图数据提供方抽象
// Frontend 永不直接调用高德，只通过 Next.js API Route 进入这里。
// ============================================================

import type {
  GeoLocation,
  Address,
  POI,
  RouteResult,
  RouteMode,
} from "@/types/location";

export interface MapProvider {
  geocode(address: string): Promise<GeoLocation>;

  reverseGeocode(latitude: number, longitude: number): Promise<Address>;

  searchPOI(keyword: string, location?: GeoLocation): Promise<POI[]>;

  route(
    origin: GeoLocation,
    destination: GeoLocation,
    mode: RouteMode
  ): Promise<RouteResult>;
}
