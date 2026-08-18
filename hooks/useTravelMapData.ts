"use client";

import { useEffect, useMemo, useState } from "react";
import type { GeoLocation, RouteResult, RouteMode } from "@/types/location";
import { fetchGeocode, fetchRoute } from "@/lib/travel-data/client";

export interface TravelMapData {
  locations: GeoLocation[];
  locationDayIds: number[];
  routes: RouteResult[];
  routeDayIds: number[];
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export interface TravelMapDataSeed {
  locations: GeoLocation[];
  locationDayIds: number[];
  routes: RouteResult[];
  routeDayIds: number[];
}

// 输入：按 Day 顺序的地点名（已清洗）
// 输出：真实 GeoLocation + 相邻两天的真实路线 + dayId 对齐关系
// 地点缺失时不伪造坐标，只跳过该地点并保留其他可用数据。
// seed：PlanningOrchestrator 提前收集的地图数据，同路线模式时直接复用。
export function useTravelMapData(
  dayLocations: string[],
  routeMode: RouteMode = "DRIVING",
  seed?: TravelMapDataSeed | null
): TravelMapData {
  const [locations, setLocations] = useState<GeoLocation[]>(seed?.locations ?? []);
  const [locationDayIds, setLocationDayIds] = useState<number[]>(seed?.locationDayIds ?? []);
  const [routes, setRoutes] = useState<RouteResult[]>(seed?.routes ?? []);
  const [routeDayIds, setRouteDayIds] = useState<number[]>(seed?.routeDayIds ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const locationKey = useMemo(
    () =>
      routeMode + "|" + dayLocations.map((name) => name.trim()).filter(Boolean).join("|"),
    [dayLocations, routeMode]
  );

  useEffect(() => {
    // Orchestrator 已提前收集驾车地图数据时直接复用，避免重复 API 调用
    if (seed && routeMode === "DRIVING") {
      setLocations(seed.locations ?? []);
      setLocationDayIds(seed.locationDayIds ?? []);
      setRoutes(seed.routes ?? []);
      setRouteDayIds(seed.routeDayIds ?? []);
      setLoading(false);
      setError(null);
      return;
    }

    const names = locationKey ? locationKey.split("|") : [];
    const uniqueNames = Array.from(new Set(names));

    if (names.length === 0) {
      setLocations([]);
      setLocationDayIds([]);
      setRoutes([]);
      setRouteDayIds([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        // 1) 地点名 → 真实坐标；失败的地点跳过，不伪造坐标
        const geoResults = await Promise.allSettled(
          uniqueNames.map((name) => fetchGeocode(name))
        );
        if (cancelled) return;

        const geoByName = new Map<string, GeoLocation>();
        uniqueNames.forEach((name, index) => {
          const result = geoResults[index];
          if (result.status === "fulfilled") {
            geoByName.set(name, result.value);
          }
        });

        const validLocations: GeoLocation[] = [];
        const validDayIds: number[] = [];
        names.forEach((name, index) => {
          const location = geoByName.get(name);
          if (location) {
            validLocations.push(location);
            validDayIds.push(index);
          }
        });

        const missingLocationCount = names.length - validLocations.length;
        setLocations(validLocations);
        setLocationDayIds(validDayIds);

        // 2) 相邻 Day → 真实驾驶路线（失败不伪造，保留错误提示）
        const routeResults = await Promise.allSettled(
          names.slice(0, -1).map((origin, index) =>
            fetchRoute(origin, names[index + 1], routeMode)
          )
        );
        if (cancelled) return;

        const okRoutes: RouteResult[] = [];
        const okDayIds: number[] = [];
        routeResults.forEach((result, index) => {
          if (result.status === "fulfilled") {
            okRoutes.push(result.value);
            okDayIds.push(index);
          }
        });
        const failedRouteCount = routeResults.length - okRoutes.length;

        setRoutes(okRoutes);
        setRouteDayIds(okDayIds);

        const parts: string[] = [];
        if (missingLocationCount > 0) {
          parts.push(missingLocationCount + " 个地点暂时无法定位，已跳过");
        }
        if (failedRouteCount > 0) {
          parts.push("部分路线数据暂时无法获取");
        }
        setError(parts.length > 0 ? parts.join("；") : null);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setLocations([]);
        setLocationDayIds([]);
        setRoutes([]);
        setRouteDayIds([]);
        setError("路线数据暂时无法获取，请稍后重试");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [locationKey, attempt, routeMode, seed]);

  return {
    locations,
    locationDayIds,
    routes,
    routeDayIds,
    loading,
    error,
    retry: () => setAttempt((value) => value + 1),
  };
}