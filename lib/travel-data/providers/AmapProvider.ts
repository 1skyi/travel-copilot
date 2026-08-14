// ============================================================
// AmapProvider — 高德 Web Service API 适配器（仅服务端）
// 高德 API Key 只能来自服务端环境变量，绝不进入浏览器
// ============================================================

import type {
  GeoLocation,
  Address,
  POI,
  RouteResult,
  RouteMode,
  RoutePoint,
} from "@/types/location";
import { DATA_SOURCE, DATA_SOURCE_TYPE } from "@/types/location";
import type { MapProvider } from "../interfaces/MapProvider";
import { TravelDataError } from "../errors";
import { MemoryCache } from "../cache";
import { parseLngLat, decodeAmapPolyline, buildCacheKey } from "../utils";

const AMAP_BASE = "https://restapi.amap.com";

const GEOCODE_TTL = 6 * 60 * 60 * 1000; // 6h
const POI_TTL = 6 * 60 * 60 * 1000; // 6h
const ROUTE_TTL = 10 * 60 * 1000; // 10min

interface AmapProviderOptions {
  cache?: MemoryCache;
  timeoutMs?: number;
}

interface AmapGeocode {
  formatted_address?: string;
  location?: string;
}

interface AmapPOI {
  id?: string;
  name?: string;
  type?: string;
  address?: string;
  location?: string;
  distance?: string;
}

export class AmapProvider implements MapProvider {
  private apiKey: string;
  private cache: MemoryCache;
  private timeoutMs: number;

  constructor(apiKey: string, options: AmapProviderOptions = {}) {
    if (!apiKey || apiKey.trim() === "") {
      throw new TravelDataError(500, "Missing AMAP_API_KEY", "AMAP");
    }
    this.apiKey = apiKey.trim();
    this.cache = options.cache ?? new MemoryCache();
    this.timeoutMs = options.timeoutMs ?? 8000;
  }

  async geocode(address: string): Promise<GeoLocation> {
    const key = buildCacheKey("geocode", address);
    const cached = this.cache.get<GeoLocation>(key);
    if (cached) return cached;

    const url =
      AMAP_BASE +
      "/v3/geocode/geo?address=" +
      encodeURIComponent(address) +
      "&key=" +
      this.apiKey;

    const data = await this.fetchJson(url, "geocode");

    const geocodes: AmapGeocode[] = data.geocodes || [];
    if (geocodes.length === 0) {
      throw new TravelDataError(404, "未找到该地点的坐标", "AMAP");
    }
    const g = geocodes[0];
    const coord = parseLngLat(g.location || "");
    if (!coord) {
      throw new TravelDataError(502, "高德返回了无效坐标", "AMAP");
    }

    const fetchedAt = new Date().toISOString();
    const result: GeoLocation = {
      id: "geo_" + encodeURIComponent(address),
      name: address,
      address: g.formatted_address || address,
      latitude: coord.latitude,
      longitude: coord.longitude,
      source: DATA_SOURCE,
      sourceType: DATA_SOURCE_TYPE,
      fetchedAt,
    };
    this.cache.set(key, result, GEOCODE_TTL);
    return result;
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<Address> {
    const key = buildCacheKey("regeo", latitude, longitude);
    const cached = this.cache.get<Address>(key);
    if (cached) return cached;

    const url =
      AMAP_BASE +
      "/v3/geocode/regeo?location=" +
      longitude +
      "," +
      latitude +
      "&key=" +
      this.apiKey;

    const data = await this.fetchJson(url, "reverseGeocode");
    const regeo = data.regeocode || {};
    const component = regeo.addressComponent || {};

    const fetchedAt = new Date().toISOString();
    const result: Address = {
      formatted: regeo.formatted_address || "",
      province: component.province,
      city: component.city,
      district: component.district,
      source: DATA_SOURCE,
      sourceType: DATA_SOURCE_TYPE,
      fetchedAt,
    };
    this.cache.set(key, result, GEOCODE_TTL);
    return result;
  }

  async searchPOI(keyword: string, location?: GeoLocation): Promise<POI[]> {
    const cacheKey = buildCacheKey(
      "poi",
      keyword,
      location ? location.latitude + "," + location.longitude : "none"
    );
    const cached = this.cache.get<POI[]>(cacheKey);
    if (cached) return cached;

    let url =
      AMAP_BASE +
      "/v3/place/text?keywords=" +
      encodeURIComponent(keyword) +
      "&offset=10&key=" +
      this.apiKey;
    if (location) {
      url += "&location=" + location.longitude + "," + location.latitude;
    }

    const data = await this.fetchJson(url, "searchPOI");
    const pois: AmapPOI[] = data.pois || [];
    const fetchedAt = new Date().toISOString();

    const results: POI[] = pois
      .map((p) => {
        const coord = parseLngLat(p.location || "");
        if (!coord) return null;
        return {
          id: p.id || "poi_" + encodeURIComponent(p.name || keyword),
          name: p.name || keyword,
          type: p.type || "",
          address: p.address || "",
          location: {
            id: p.id || "poi_" + encodeURIComponent(p.name || keyword),
            name: p.name || keyword,
            address: p.address || "",
            latitude: coord.latitude,
            longitude: coord.longitude,
            source: DATA_SOURCE,
            sourceType: DATA_SOURCE_TYPE,
            fetchedAt,
          },
          distance: p.distance ? Number(p.distance) : undefined,
          source: DATA_SOURCE,
          sourceType: DATA_SOURCE_TYPE,
          fetchedAt,
        } as POI;
      })
      .filter((p): p is POI => p !== null);

    this.cache.set(cacheKey, results, POI_TTL);
    return results;
  }

  async route(
    origin: GeoLocation,
    destination: GeoLocation,
    mode: RouteMode
  ): Promise<RouteResult> {
    // 注：MapProvider 接口为未来 WALKING/TRANSIT 预留，
    // 本 Sprint 产品路径（Trip 页相邻 Day 路段）只使用 DRIVING。
    if (mode !== "DRIVING") {
      throw new TravelDataError(501, "Sprint 6.1 仅支持 DRIVING 路线", "AMAP");
    }

    const cacheKey = buildCacheKey(
      "route",
      origin.longitude + "," + origin.latitude,
      destination.longitude + "," + destination.latitude,
      mode
    );
    const cached = this.cache.get<RouteResult>(cacheKey);
    if (cached) return cached;

    const url =
      AMAP_BASE +
      "/v3/direction/driving?origin=" +
      origin.longitude +
      "," +
      origin.latitude +
      "&destination=" +
      destination.longitude +
      "," +
      destination.latitude +
      "&extensions=base&key=" +
      this.apiKey;

    const data = await this.fetchJson(url, "route");
    const route = data.route || {};
    const paths = route.paths || [];
    if (paths.length === 0) {
      throw new TravelDataError(404, "未找到该路线的规划结果", "AMAP");
    }

    const path = paths[0];
    const distance = Number(path.distance);
    const duration = Number(path.duration);
    if (!Number.isFinite(distance) || distance < 0 || !Number.isFinite(duration) || duration < 0) {
      throw new TravelDataError(502, "路线距离或时长数据无效", "AMAP");
    }

    // 汇总所有 step 的 polyline；缺失时不得伪造直线路线
    const steps = path.steps || [];
    let polyline: RoutePoint[] = [];
    for (const step of steps) {
      polyline = polyline.concat(decodeAmapPolyline(step.polyline || ""));
    }
    if (polyline.length === 0) {
      throw new TravelDataError(502, "路线坐标缺失，无法绘制路线", "AMAP");
    }

    const fetchedAt = new Date().toISOString();
    const result: RouteResult = {
      origin,
      destination,
      distance: { value: distance, unit: "m", source: DATA_SOURCE, sourceType: DATA_SOURCE_TYPE, fetchedAt },
      duration: { value: duration, unit: "s", source: DATA_SOURCE, sourceType: DATA_SOURCE_TYPE, fetchedAt },
      mode,
      polyline,
      source: DATA_SOURCE,
      sourceType: DATA_SOURCE_TYPE,
      fetchedAt,
    };
    this.cache.set(cacheKey, result, ROUTE_TTL);
    return result;
  }

  private async fetchJson(url: string, operation: string): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) {
        throw new TravelDataError(502, "高德 HTTP 请求失败（" + res.status + "）", "AMAP");
      }
      const json = await res.json();
      if (json.status !== "1") {
        throw new TravelDataError(502, "高德 API 错误：" + (json.info || "未知错误"), "AMAP");
      }
      return json;
    } catch (e) {
      if (e instanceof TravelDataError) throw e;
      if (e && typeof e === "object" && (e as Error).name === "AbortError") {
        throw new TravelDataError(504, "高德 API 请求超时", "AMAP");
      }
      throw new TravelDataError(500, "高德 API 请求失败（" + operation + "）", "AMAP");
    } finally {
      clearTimeout(timer);
    }
  }
}
