"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, TriangleAlert, RefreshCw, Expand, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadAMap } from "@/lib/map/amap";
import { MapController } from "@/lib/map/MapController";
import type { MapLocationModel, MapRouteModel } from "@/lib/map/MapController";
import type { GeoLocation, RouteResult } from "@/types/location";

const dayColors = ["#6366f1", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#ef4444", "#06b6d4"];

interface MapRendererProps {
  locations: GeoLocation[];
  locationDayIds: number[];
  routes: RouteResult[];
  routeDayIds: number[];
  activeDay: number | null;
  onDayChange: (dayIndex: number | null) => void;
  onLocationClick: (locationId: string, dayId: number) => void;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

export function MapRenderer({
  locations,
  locationDayIds,
  routes,
  routeDayIds,
  activeDay,
  onDayChange,
  onLocationClick,
  loading = false,
  error,
  onRetry,
}: MapRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<MapController | null>(null);
  const activeDayRef = useRef(activeDay);
  const onLocationClickRef = useRef(onLocationClick);
  const [sdkStatus, setSdkStatus] = useState<"loading" | "ready" | "error">("loading");
  const [sdkRetry, setSdkRetry] = useState(0);

  useEffect(() => {
    activeDayRef.current = activeDay;
  }, [activeDay]);

  useEffect(() => {
    onLocationClickRef.current = onLocationClick;
  }, [onLocationClick]);

  const focusFromState = (controller: MapController) => {
    if (activeDayRef.current === null) {
      controller.showFullJourney();
    } else {
      controller.focusDay(activeDayRef.current);
    }
  };

  // SDK 初始化只执行一次；重试时先销毁旧实例再重建
  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    const container = containerRef.current;
    setSdkStatus("loading");

    if (container && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        controllerRef.current?.resize();
      });
      resizeObserver.observe(container);
    }

    loadAMap()
      .then((AMap) => {
        if (cancelled || !containerRef.current) return;
        const map = new AMap.Map(containerRef.current, {
          zoom: 5,
          center: new AMap.LngLat(104.0663, 30.5728),
          viewMode: "2D",
        });
        controllerRef.current = new MapController(map, AMap);
        setSdkStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setSdkStatus("error");
      });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
  }, [sdkRetry]);

  // Marker 只在 locations 变化时重建
  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller || sdkStatus !== "ready") return;

    const models: MapLocationModel[] = locations.map((location, index) => {
      const dayId = locationDayIds[index] ?? index;
      return {
        id: location.id + "__day" + dayId,
        dayId,
        name: location.name,
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        color: dayColors[dayId % dayColors.length],
      };
    });

    controller.setLocations(models, (locationId, dayId) => {
      onLocationClickRef.current(locationId, dayId);
    });
    focusFromState(controller);
  }, [locations, locationDayIds, sdkStatus]);

  // Polyline 只在 routes 变化时重建
  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller || sdkStatus !== "ready") return;

    const models: MapRouteModel[] = routes.map((route, index) => {
      const dayId = routeDayIds[index] ?? index;
      return {
        id: route.origin.id + "-" + route.destination.id + "-" + index,
        dayId,
        points: route.polyline,
        color: dayColors[dayId % dayColors.length],
      };
    });

    controller.setRoutes(models, activeDayRef.current);
  }, [routes, routeDayIds, sdkStatus]);

  // 点击 Day 只更新视角与样式，不重建 Marker / Polyline
  useEffect(() => {
    const controller = controllerRef.current;
    if (!controller || sdkStatus !== "ready") return;
    controller.setActiveDay(activeDay);
    focusFromState(controller);
  }, [activeDay, sdkStatus]);

  return (
    <div className="relative h-full min-h-[320px] bg-muted/10">
      <div ref={containerRef} className="absolute inset-0" />

      {sdkStatus === "loading" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">地图加载中...</p>
        </div>
      )}

      {sdkStatus === "error" && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm px-6 text-center">
          <TriangleAlert className="h-6 w-6 text-red-500" />
          <p className="text-sm font-medium">地图加载失败</p>
          <p className="text-xs text-muted-foreground">
            请确认已配置 NEXT_PUBLIC_AMAP_JS_KEY，且网络可访问高德 JS SDK。
          </p>
          <button
            type="button"
            onClick={() => setSdkRetry((value) => value + 1)}
            className="mt-1 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            重新加载
          </button>
        </div>
      )}

      {sdkStatus === "ready" && loading && locations.length === 0 && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-sm">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">正在获取真实地点...</p>
        </div>
      )}

      {sdkStatus === "ready" && !loading && error && locations.length === 0 && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-sm px-6 text-center">
          <TriangleAlert className="h-6 w-6 text-amber-500" />
          <p className="text-sm font-medium">{error}</p>
          <p className="text-xs text-muted-foreground">底图仍可正常使用，仅路线/地点数据暂时不可用</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-1 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              重新获取
            </button>
          )}
        </div>
      )}

      {sdkStatus === "ready" && locations.length === 0 && !loading && !error && (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">暂无地点数据</p>
        </div>
      )}

      {sdkStatus === "ready" && (
        <div className="absolute left-3 top-3 z-20 flex flex-wrap items-center gap-1.5 rounded-xl border bg-background/90 p-1.5 shadow-sm backdrop-blur">
          <button
            type="button"
            onClick={() => onDayChange(null)}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
              activeDay === null
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Expand className="h-3 w-3" />
            查看全程
          </button>

          {locations.map((location, index) => (
            <button
              key={location.id + "-" + index}
              type="button"
              onClick={() => onDayChange(index)}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all",
                index === activeDay
                  ? "text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted"
              )}
              style={index === activeDay ? { background: dayColors[index % dayColors.length] } : undefined}
            >
              D{index + 1}
            </button>
          ))}
        </div>
      )}

      {sdkStatus === "ready" && error && locations.length > 0 && (
        <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-amber-50/95 px-3 py-1.5 text-xs text-amber-700 shadow-sm">
          <TriangleAlert className="h-3.5 w-3.5" />
          <span>{error}</span>
          {onRetry && (
            <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 font-medium underline underline-offset-2">
              <RefreshCw className="h-3 w-3" />
              重试
            </button>
          )}
        </div>
      )}

      {sdkStatus === "ready" && locations.length > 0 && (
        <div className="absolute bottom-3 right-3 z-20 rounded-lg border bg-background/90 px-3 py-2 text-[10px] shadow-sm backdrop-blur">
          <div className="flex items-center gap-1.5 font-semibold text-muted-foreground">
            <MapPin className="h-3 w-3" />
            路线层级
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="inline-block h-1 w-5 rounded-full bg-primary" />
            <span>当前日</span>
            <span className="inline-block h-1 w-5 rounded-full bg-slate-400/40" />
            <span>其他日</span>
          </div>
        </div>
      )}
    </div>
  );
}