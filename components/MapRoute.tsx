"use client";

import { useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { MapRouteDay, MapWaypoint, mapRoutes } from "@/components/mock/data";

const typeColors: Record<MapWaypoint["type"], string> = {
  activity: "#6366f1",
  meal: "#f59e0b",
  transport: "#10b981",
  rest: "#8b5cf6",
  hotel: "#ec4899",
};

const typeLabels: Record<MapWaypoint["type"], string> = {
  activity: "景点",
  meal: "美食",
  transport: "交通",
  rest: "休息",
  hotel: "住宿",
};

export function MapRoute() {
  const [activeDay, setActiveDay] = useState(0);
  const day = mapRoutes[activeDay];

  const allPoints = mapRoutes.flatMap((d) => d.waypoints);
  const minLat = Math.min(...allPoints.map((p) => p.lat));
  const maxLat = Math.max(...allPoints.map((p) => p.lat));
  const minLng = Math.min(...allPoints.map((p) => p.lng));
  const maxLng = Math.max(...allPoints.map((p) => p.lng));

  const padding = 0.05;
  const latRange = maxLat - minLat + padding * 2;
  const lngRange = maxLng - minLng + padding * 2;

  const scaleX = (lng: number) => ((lng - minLng + padding) / lngRange) * 100;
  const scaleY = (lat: number) => 100 - ((lat - minLat + padding) / latRange) * 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">路线地图</CardTitle>
          </div>
          <div className="flex gap-1.5">
            {Object.entries(typeColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="h-2 w-2 rounded-full" style={{ background: color }} />
                {typeLabels[type as MapWaypoint["type"]]}
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={String(activeDay)} onValueChange={(v) => setActiveDay(Number(v))}>
          <TabsList className="mb-4">
            {mapRoutes.map((d, i) => (
              <TabsTrigger key={d.day} value={String(i)} className="text-xs gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                Day {d.day}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative w-full aspect-[16/9] bg-muted/30 rounded-xl overflow-hidden border">
          <div className="absolute inset-0 opacity-20">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={"h" + i} className="absolute w-full border-t border-border" style={{ top: ((i + 1) * 20) + "%" }} />
            ))}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={"v" + i} className="absolute h-full border-l border-border" style={{ left: ((i + 1) * 20) + "%" }} />
            ))}
          </div>

          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {day.waypoints.length > 1 && (
              <polyline
                points={day.waypoints.map((p) => scaleX(p.lng) + "," + scaleY(p.lat)).join(" ")}
                fill="none"
                stroke={day.color}
                strokeWidth="0.5"
                strokeDasharray="1.5,1"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.6"
              />
            )}
            <polyline
              points={day.waypoints.map((p) => scaleX(p.lng) + "," + scaleY(p.lat)).join(" ")}
              fill="none"
              stroke={day.color}
              strokeWidth="0.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-pulse"
            />
          </svg>

          {day.waypoints.map((wp, idx) => (
            <div
              key={wp.id}
              className="absolute group"
              style={{
                left: scaleX(wp.lng) + "%",
                top: scaleY(wp.lat) + "%",
                transform: "translate(-50%, -50%)",
              }}
            >
              <div
                className="absolute rounded-full animate-ping opacity-30"
                style={{
                  background: typeColors[wp.type],
                  width: "24px",
                  height: "24px",
                  left: "-12px",
                  top: "-12px",
                }}
              />
              <div
                className="relative h-4 w-4 rounded-full border-2 border-background shadow-sm cursor-pointer hover:scale-150 transition-transform z-10"
                style={{ background: typeColors[wp.type] }}
              />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <span className="block text-[10px] font-medium bg-popover text-popover-foreground px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                  {wp.name}
                </span>
              </div>
              <span
                className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-white z-20"
                style={{ background: day.color }}
              >
                {idx + 1}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-1">
          {day.waypoints.map((wp, idx) => (
            <div key={wp.id} className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: day.color }}>
                  {idx + 1}
                </span>
                <span className="font-medium truncate">{wp.name}</span>
              </div>
              <div className="flex-1 border-b border-dashed border-border mx-1" />
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                {typeLabels[wp.type]}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
