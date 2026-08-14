"use client";

import { useEffect, useMemo, useState } from "react";
import type { GeoLocation, RouteResult } from "@/types/location";
import { fetchGeocode, fetchRoute } from "@/lib/travel-data/client";

export interface TravelMapData {
  locations: GeoLocation[];
  routes: RouteResult[];
  loading: boolean;
  error: string | null;
  retry: () => void;
}

// 输入：按 Day 顺序的地点名（已清洗）
// 输出：真实 GeoLocation + 相邻两天的真实路线
export function useTravelMapData(dayLocations: string[]): TravelMapData {
  const [locations, setLocations] = useState<GeoLocation[]>([]);
  const [routes, setRoutes] = useState<RouteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const locationKey = useMemo(
    () => dayLocations.map((name) => name.trim()).filter(Boolean).join("|"),
    [dayLocations]
  );

  useEffect(() => {
    const names = locationKey ? locationKey.split("|") : [];
    const uniqueNames = Array.from(new Set(names));

    if (names.length === 0) {
      setLocations([]);
      setRoutes([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // 1) 地点名 → 真实坐标（服务端已做缓存）
        const geoResults = await Promise.all(
          uniqueNames.map((name) => fetchGeocode(name))
        );
        if (cancelled) return;

        const geoByName = new Map<string, GeoLocation>();
        uniqueNames.forEach((name, index) => geoByName.set(name, geoResults[index]));
        setLocations(names.map((name) => geoByName.get(name)!));

        // 2) 相邻 Day → 真实驾驶路线（失败不伪造，保留错误提示）
        const routeResults = await Promise.allSettled(
          names.slice(0, -1).map((origin, index) =>
            fetchRoute(origin, names[index + 1], "DRIVING")
          )
        );
        if (cancelled) return;

        const okRoutes = routeResults
          .filter((r): r is PromiseFulfilledResult<RouteResult> => r.status === "fulfilled")
          .map((r) => r.value);
        const failedCount = routeResults.length - okRoutes.length;

        setRoutes(okRoutes);
        setError(
          failedCount > 0
            ? "部分路线数据暂时无法获取，请稍后重试"
            : null
        );
        setLoading(false);
      } catch {
        if (cancelled) return;
        setLocations([]);
        setRoutes([]);
        setError("路线数据暂时无法获取，请稍后重试");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [locationKey, attempt]);

  return {
    locations,
    routes,
    loading,
    error,
    retry: () => setAttempt((value) => value + 1),
  };
}