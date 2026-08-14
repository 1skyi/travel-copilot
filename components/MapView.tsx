"use client";

import { useMemo } from "react";
import { Loader2, TriangleAlert, Navigation, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LocationMarker } from "@/components/LocationMarker";
import { formatDistance, formatDuration } from "@/lib/travel-data/utils";
import type { GeoLocation, RouteResult } from "@/types/location";
import { cn } from "@/lib/utils";

interface MapViewProps {
  locations: GeoLocation[];
  routes: RouteResult[];
  activeDay: number;
  onDayChange: (dayIndex: number) => void;
  loading?: boolean;
  error?: string;
  pulseMarker?: boolean;
  onRetry?: () => void;
}

const dayColors = ["#6366f1", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#ef4444", "#06b6d4"];

export function MapView({
  locations,
  routes,
  activeDay,
  onDayChange,
  loading = false,
  error,
  pulseMarker = false,
  onRetry,
}: MapViewProps) {
  const projection = useMemo(() => {
    if (locations.length === 0) return null;

    const longitudes = locations.map((loc) => loc.longitude);
    const latitudes = locations.map((loc) => loc.latitude);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);

    const lngSpan = Math.max(maxLng - minLng, 0.01);
    const latSpan = Math.max(maxLat - minLat, 0.01);
    const padLng = Math.max(lngSpan * 0.18, 0.25);
    const padLat = Math.max(latSpan * 0.18, 0.25);

    const totalLng = lngSpan + padLng * 2;
    const totalLat = latSpan + padLat * 2;

    const scaleX = (lng: number) => 5 + ((lng - minLng + padLng) / totalLng) * 90;
    const scaleY = (lat: number) => 95 - ((lat - minLat + padLat) / totalLat) * 90;

    return { scaleX, scaleY };
  }, [locations]);

  const nameIndex = useMemo(() => {
    const map = new Map<string, number>();
    locations.forEach((location, index) => map.set(location.name, index));
    return map;
  }, [locations]);

  const routeSegmentIndex = (route: RouteResult): number => {
    const originIndex = nameIndex.get(route.origin.name);
    const destinationIndex = nameIndex.get(route.destination.name);
    if (originIndex === undefined || destinationIndex === undefined) return -1;
    return destinationIndex === originIndex + 1 ? originIndex : -1;
  };

  const activeRoute = routes.find((route) => routeSegmentIndex(route) === activeDay);

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardContent className="p-0 flex-1 flex flex-col">
        {/* Day Tabs */}
        <div className="flex gap-1 px-3 py-2 border-b overflow-x-auto">
          {locations.map((location, index) => (
            <button
              key={location.id + "-" + index}
              onClick={() => onDayChange(index)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-all flex items-center gap-1.5",
                index === activeDay
                  ? "text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              style={index === activeDay ? { background: dayColors[index % dayColors.length] } : undefined}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: index === activeDay ? "white" : dayColors[index % dayColors.length] }}
              />
              D{index + 1}
            </button>
          ))}
        </div>

        {/* Map Area */}
        <div className="relative flex-1 min-h-[300px] bg-muted/20 overflow-hidden">
          {loading ? (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">正在获取真实路线...</p>
            </div>
          ) : locations.length === 0 && error ? (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-sm px-6 text-center">
              <TriangleAlert className="h-6 w-6 text-amber-500" />
              <p className="text-sm font-medium">{error}</p>
              <p className="text-xs text-muted-foreground">路线数据暂时无法获取，请稍后重试</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  重新获取
                </button>
              )}
            </div>
          ) : locations.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">暂无可展示的行程地点</p>
            </div>
          ) : (
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <pattern id="realMapGrid" width="8" height="8" patternUnits="userSpaceOnUse">
                  <path
                    d="M 8 0 L 0 0 0 8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.08"
                    className="text-muted-foreground/15"
                  />
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#realMapGrid)" />

              {/* Real route polylines from AMAP */}
              {routes.map((route, index) => {
                const segmentIndex = routeSegmentIndex(route);
                const color = segmentIndex >= 0 ? dayColors[segmentIndex % dayColors.length] : "#94a3b8";
                const isActive = segmentIndex === activeDay;
                const points = route.polyline
                  .map((point) => projection!.scaleX(point.longitude) + "," + projection!.scaleY(point.latitude))
                  .join(" ");

                return (
                  <polyline
                    key={route.origin.name + "-" + route.destination.name + "-" + index}
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth={isActive ? 1.6 : 0.9}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={isActive ? 0.9 : 0.45}
                    className={isActive ? "animate-pulse" : undefined}
                  />
                );
              })}
            </svg>
          )}

          {error && locations.length > 0 && (
            <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border bg-amber-50/95 px-3 py-1.5 text-xs text-amber-700 shadow-sm">
              <TriangleAlert className="h-3.5 w-3.5" />
              <span>{error}</span>
              {onRetry && (
                <button onClick={onRetry} className="inline-flex items-center gap-1 font-medium underline underline-offset-2">
                  <RefreshCw className="h-3 w-3" />重试
                </button>
              )}
            </div>
          )}

          {/* Markers */}
          {!loading && projection && locations.map((location, index) => {
            const isActive = index === activeDay;
            const isNext = index === activeDay + 1;
            const color = dayColors[index % dayColors.length];
            const left = projection.scaleX(location.longitude);
            const top = projection.scaleY(location.latitude);

            return (
              <div
                key={location.id + "-" + index}
                className="absolute z-10"
                style={{ left: left + "%", top: top + "%", transform: "translate(-50%, -50%)" }}
              >
                {isActive && pulseMarker && (
                  <div
                    className="absolute rounded-full animate-ping opacity-40"
                    style={{ width: "36px", height: "36px", left: "-18px", top: "-18px", background: color }}
                  />
                )}

                <LocationMarker
                  name={location.name}
                  isActive={isActive}
                  isNext={isNext}
                  index={index + 1}
                  color={color}
                  onClick={() => onDayChange(index)}
                  showLabel={false}
                />

                {(isActive || isNext) && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-3 mt-1 bg-background/90 border rounded px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap shadow-sm">
                    {location.name}
                  </div>
                )}
              </div>
            );
          })}

          {/* Route info */}
          {!loading && locations.length > 0 && (
            <div className="absolute left-3 bottom-3 bg-background/90 rounded-lg border px-3 py-2 text-xs shadow-sm max-w-[70%]">
              <div className="flex items-center gap-1.5 mb-1 text-muted-foreground">
                <Navigation className="h-3 w-3" />
                <span>真实路线 · 来源 {locations[activeDay]?.source || "AMAP"}</span>
              </div>
              {activeRoute ? (
                <p className="font-medium">
                  {activeRoute.origin.name} → {activeRoute.destination.name}
                  <span className="ml-2 text-primary">
                    {formatDistance(activeRoute.distance.value)} · 驾车 {formatDuration(activeRoute.duration.value)}
                  </span>
                </p>
              ) : activeDay < locations.length - 1 ? (
                <p className="text-muted-foreground">当前路段路线数据未获取</p>
              ) : (
                <p className="text-muted-foreground">已到达本次行程终点</p>
              )}
            </div>
          )}

          {/* Legend */}
          <div className="absolute top-3 right-3 bg-background/90 rounded-lg border px-3 py-2 text-[10px] shadow-sm">
            <div className="font-semibold mb-1.5">图例</div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full" style={{ background: dayColors[activeDay % dayColors.length] }} />
                <span>当前日</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-slate-400/50" />
                <span>其他日</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}