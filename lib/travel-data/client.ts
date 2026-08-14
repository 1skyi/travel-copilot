"use client";

import type {
  GeoLocation,
  POI,
  RouteResult,
  RouteMode,
  TravelDataApiError,
} from "@/types/location";

// Frontend 只允许调用自己的 Next.js API Route。
// 高德 Key 永远只存在于服务端环境变量中。
async function apiGet<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new Error("路线数据暂时无法获取，请稍后重试");
  }

  const body = (await res.json().catch(() => null)) as T | TravelDataApiError | null;

  if (!res.ok || !body) {
    if (body && typeof body === "object" && "error" in body) {
      const err = (body as TravelDataApiError).error;
      throw new Error(err.message || "路线数据暂时无法获取，请稍后重试");
    }
    throw new Error("路线数据暂时无法获取，请稍后重试");
  }

  return body as T;
}

export async function fetchGeocode(address: string): Promise<GeoLocation> {
  return apiGet<GeoLocation>(
    "/api/travel/map/geocode?address=" + encodeURIComponent(address)
  );
}

export async function fetchPOI(keyword: string): Promise<POI[]> {
  return apiGet<POI[]>(
    "/api/travel/map/poi?keyword=" + encodeURIComponent(keyword)
  );
}

export async function fetchRoute(
  origin: string,
  destination: string,
  mode: RouteMode = "DRIVING"
): Promise<RouteResult> {
  const params = new URLSearchParams({ origin, destination, mode });
  return apiGet<RouteResult>("/api/travel/map/route?" + params.toString());
}