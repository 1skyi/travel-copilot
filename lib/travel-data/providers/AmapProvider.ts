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
} from "@/types/location";
import { DATA_SOURCE, DATA_SOURCE_TYPE } from "@/types/location";
import type { MapProvider } from "../interfaces/MapProvider";
import { TravelDataError } from "../errors";
import { MemoryCache } from "../cache";
import { parseLngLat, buildCacheKey } from "../utils";
import { parseAmapPathRoute, parseAmapTransitRoute } from "./amapRouteParsers";

const AMAP_BASE = "https://restapi.amap.com";

const GEOCODE_TTL = 6 * 60 * 60 * 1000; // 6h
const POI_TTL = 6 * 60 * 60 * 1000; // 6h
const ROUTE_TTL = 10 * 60 * 1000; // 10min

interface AmapProviderOptions {
  cache?: MemoryCache;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
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
  private fetchFn: typeof fetch;

  constructor(apiKey: string, options: AmapProviderOptions = {}) {
    if (!apiKey || apiKey.trim() === "") {
      throw new TravelDataError(500, "Missing AMAP_API_KEY", "AMAP");
    }
    this.apiKey = apiKey.trim();
    this.cache = options.cache ?? new MemoryCache();
    this.timeoutMs = options.timeoutMs ?? 8000;
    this.fetchFn = options.fetchFn ?? fetch;
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

    let data: { geocodes?: AmapGeocode[] };
    try {
      data = await this.fetchJson(url, "geocode");
    } catch (error) {
      // 高德 geocode 对部分景点名（如"天山天池"）会返回引擎错误：
      // 降级到 POI 搜索取首个真实 POI 坐标，仍失败才上抛原错误，绝不伪造。
      if (
        error instanceof TravelDataError &&
        error.status === 502 &&
        /ENGINE_RESPONSE_DATA_ERROR/.test(error.message)
      ) {
        const fallback = await this.geocodeViaPOI(address);
        if (fallback) {
          this.cache.set(key, fallback, GEOCODE_TTL);
          return fallback;
        }
      }
      throw error;
    }

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

  // geocode 引擎错误时的兜底：用 POI 搜索取首个真实地点坐标。
  // 保留用户输入的名称，地址与坐标来自高德 POI；POI 也失败则返回 null。
  private async geocodeViaPOI(address: string): Promise<GeoLocation | null> {
    try {
      const pois = await this.searchPOI(address);
      const first = pois[0];
      if (!first || !first.location) return null;
      return {
        ...first.location,
        id: "geo_" + encodeURIComponent(address),
        name: address,
      };
    } catch {
      return null;
    }
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
    const cacheKey = buildCacheKey(
      "route",
      origin.longitude + "," + origin.latitude,
      destination.longitude + "," + destination.latitude,
      mode
    );
    const cached = this.cache.get<RouteResult>(cacheKey);
    if (cached) return cached;

    const url = this.buildRouteUrl(origin, destination, mode);

    const data = await this.fetchJson(url, "route:" + mode);
    const parsed =
      mode === "TRANSIT"
        ? parseAmapTransitRoute(data)
        : parseAmapPathRoute(data);

    if (!parsed) {
      throw new TravelDataError(404, "未找到该路线的规划结果", "AMAP");
    }

    const fetchedAt = new Date().toISOString();
    const result: RouteResult = {
      origin,
      destination,
      distance: { value: parsed.distance, unit: "m", source: DATA_SOURCE, sourceType: DATA_SOURCE_TYPE, fetchedAt },
      duration: { value: parsed.duration, unit: "s", source: DATA_SOURCE, sourceType: DATA_SOURCE_TYPE, fetchedAt },
      mode,
      polyline: parsed.polyline,
      source: DATA_SOURCE,
      sourceType: DATA_SOURCE_TYPE,
      fetchedAt,
    };
    this.cache.set(cacheKey, result, ROUTE_TTL);
    return result;
  }

  private buildRouteUrl(
    origin: GeoLocation,
    destination: GeoLocation,
    mode: RouteMode
  ): string {
    const originLngLat = origin.longitude + "," + origin.latitude;
    const destinationLngLat = destination.longitude + "," + destination.latitude;

    if (mode === "TRANSIT") {
      // 高德公交路线规划接口；无真实数据时由 fetchJson/route 返回 NO_DATA。
      return (
        AMAP_BASE +
        "/v3/direction/transit/integrated?origin=" +
        originLngLat +
        "&destination=" +
        destinationLngLat +
        "&city=" +
        encodeURIComponent(origin.name) +
        "&extensions=base&key=" +
        this.apiKey
      );
    }

    const endpoint = mode === "WALKING" ? "walking" : "driving";
    return (
      AMAP_BASE +
      "/v3/direction/" +
      endpoint +
      "?origin=" +
      originLngLat +
      "&destination=" +
      destinationLngLat +
      "&extensions=base&key=" +
      this.apiKey
    );
  }

  private async fetchJson(url: string, operation: string): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetchFn(url, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) {
        throw new TravelDataError(502, "高德 HTTP 请求失败（" + res.status + "）", "AMAP");
      }
      const json = await res.json();
      if (json.status !== "1") {
        const info = String(json.info || "未知错误");
        // 超出行程规划范围 = 该方式下无可用路线，语义等同于 NO_DATA(404)，
        // 由 TravelDataService 转为 null，UI 显示"暂无数据"而非报错。
        if (info.includes("OVER_DIRECTION_RANGE")) {
          throw new TravelDataError(404, "该方式下无可用路线（超出规划范围）", "AMAP");
        }
        throw new TravelDataError(502, "高德 API 错误：" + info, "AMAP");
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
