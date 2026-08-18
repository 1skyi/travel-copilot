// ============================================================
// TravelDataService — 统一地图数据服务门面
// 前端/Planner 只依赖此服务，不直接依赖 AmapProvider。
// Provider 返回 404（无真实数据）时转换为 null/[]，禁止伪造。
// ============================================================

import type {
  GeoLocation,
  Address,
  POI,
  RouteResult,
  RouteMode,
} from "@/types/location";
import type { MapProvider } from "./interfaces/MapProvider";

function isNoDataError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      (error as { status?: unknown }).status === 404
  );
}

export class TravelDataService {
  constructor(private readonly provider: MapProvider) {}

  async geocode(address: string): Promise<GeoLocation | null> {
    try {
      return await this.provider.geocode(address);
    } catch (error) {
      if (isNoDataError(error)) return null;
      throw error;
    }
  }

  async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<Address | null> {
    try {
      return await this.provider.reverseGeocode(latitude, longitude);
    } catch (error) {
      if (isNoDataError(error)) return null;
      throw error;
    }
  }

  async searchPOI(
    keyword: string,
    location?: GeoLocation
  ): Promise<POI[]> {
    try {
      return await this.provider.searchPOI(keyword, location);
    } catch (error) {
      if (isNoDataError(error)) return [];
      throw error;
    }
  }

  async route(
    origin: GeoLocation,
    destination: GeoLocation,
    mode: RouteMode
  ): Promise<RouteResult | null> {
    try {
      return await this.provider.route(origin, destination, mode);
    } catch (error) {
      if (isNoDataError(error)) return null;
      throw error;
    }
  }
}