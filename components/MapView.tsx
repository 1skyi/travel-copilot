"use client";

import { useState, useMemo } from "react";
import { MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LocationMarker } from "@/components/LocationMarker";
import { TripPlan } from "@/types/plan";
import { cn } from "@/lib/utils";

interface MapViewProps {
  plan: TripPlan;
  activeDay: number;
  onDayChange: (dayIndex: number) => void;
  pulseMarker?: boolean;
}

const dayColors = ["#6366f1", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#ef4444", "#06b6d4"];

const CHINA_COORDS: Record<string, [number, number]> = {
  "乌鲁木齐": [43.8, 87.6],
  "赛里木湖": [44.6, 81.2],
  "伊宁": [43.9, 81.3],
  "那拉提": [43.3, 84.0],
  "巴音布鲁克": [43.0, 84.2],
  "独库公路": [43.5, 84.5],
  "天山天池": [43.9, 88.1],
  "吐鲁番": [42.9, 89.2],
  "库尔勒": [41.7, 86.1],
  "南山牧场": [43.4, 87.4],
  "昆明": [25.0, 102.7],
  "大理": [25.6, 100.2],
  "丽江": [26.8, 100.2],
  "玉龙雪山": [27.0, 100.2],
  "香格里拉": [27.8, 99.7],
  "泸沽湖": [27.7, 100.8],
  "东京": [35.7, 139.7],
  "镰仓": [35.3, 139.5],
  "箱根": [35.2, 139.0],
  "京都": [35.0, 135.8],
  "大阪": [34.7, 135.5],
  "富士山": [35.4, 138.7],
  "奈良": [34.7, 135.8],
};

function getCoords(name: string): [number, number] {
  for (const [key, coords] of Object.entries(CHINA_COORDS)) {
    if (name.includes(key) || key.includes(name)) return coords;
  }
  const hash = name.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return [30 + (hash % 20), 100 + ((hash * 7) % 30)];
}

export function MapView({ plan, activeDay, onDayChange, pulseMarker = false }: MapViewProps) {
  const allCoords = useMemo(() => plan.route.map((r) => getCoords(r.location)), [plan]);

  const allLatLngs = useMemo(() => {
    const lats = allCoords.map((c) => c[0]);
    const lngs = allCoords.map((c) => c[1]);
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
  }, [allCoords]);

  const padding = 2;
  const latRange = allLatLngs.maxLat - allLatLngs.minLat + padding * 2 || 10;
  const lngRange = allLatLngs.maxLng - allLatLngs.minLng + padding * 2 || 10;
  const scaleX = (lng: number) => 5 + ((lng - allLatLngs.minLng + padding) / lngRange) * 90;
  const scaleY = (lat: number) => 95 - ((lat - allLatLngs.minLat + padding) / latRange) * 90;

  const color = dayColors[activeDay % dayColors.length];

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-0 flex-1 flex flex-col">
        {/* Day Tabs */}
        <div className="flex gap-1 px-3 py-2 border-b overflow-x-auto">
          {plan.route.map((d, i) => (
            <button
              key={d.day}
              onClick={() => onDayChange(i)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-all flex items-center gap-1.5",
                i === activeDay
                  ? "text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              style={i === activeDay ? { background: dayColors[i % dayColors.length] } : undefined}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: i === activeDay ? "white" : dayColors[i % dayColors.length] }} />
              D{d.day}
            </button>
          ))}
        </div>

        {/* Map Area */}
        <div className="relative flex-1 min-h-[280px] bg-muted/20 overflow-hidden">
          {/* Grid + Route SVG */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="mapGridV2" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M 8 0 L 0 0 0 8" fill="none" stroke="currentColor" strokeWidth="0.08" className="text-muted-foreground/15" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#mapGridV2)" />

            {/* Full route line (faded) */}
            <polyline
              points={allCoords.map((c) => scaleX(c[1]) + "," + scaleY(c[0])).join(" ")}
              fill="none" stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="3,2" opacity="0.35"
            />

            {/* Active day segment */}
            {activeDay < plan.route.length - 1 && (
              <polyline
                points={scaleX(allCoords[activeDay][1]) + "," + scaleY(allCoords[activeDay][0]) + " " + scaleX(allCoords[activeDay + 1][1]) + "," + scaleY(allCoords[activeDay + 1][0])}
                fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.7"
              />
            )}

            {/* Pulse highlight line */}
            <polyline
              points={scaleX(allCoords[activeDay][1]) + "," + scaleY(allCoords[activeDay][0]) + " " + (activeDay < plan.route.length - 1 ? scaleX(allCoords[activeDay + 1][1]) + "," + scaleY(allCoords[activeDay + 1][0]) : "")}
              fill="none" stroke={color} strokeWidth="0.4" className="animate-pulse" strokeLinecap="round"
            />
          </svg>

          {/* Waypoint markers — using LocationMarker component */}
          {allCoords.map((coords, i) => {
            const x = scaleX(coords[1]);
            const y = scaleY(coords[0]);
            const isActive = i === activeDay;
            const c = dayColors[i % dayColors.length];

            return (
              <div
                key={i}
                className="absolute z-10"
                style={{ left: x + "%", top: y + "%", transform: "translate(-50%, -50%)" }}
              >
                {/* Extra pulse ring when highlighted from timeline click */}
                {isActive && pulseMarker && (
                  <div
                    className="absolute rounded-full animate-ping opacity-40"
                    style={{ width: "36px", height: "36px", left: "-18px", top: "-18px", background: c }}
                  />
                )}

                <LocationMarker
                  name={plan.route[i].location}
                  isActive={isActive}
                  isNext={i === activeDay + 1}
                  index={i + 1}
                  color={c}
                  onClick={() => onDayChange(i)}
                />

                {/* Tooltip on hover */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                  <div className="bg-popover border text-popover-foreground px-2 py-1 rounded-md shadow text-[10px] whitespace-nowrap font-medium">
                    {plan.route[i].location}
                    <span className="ml-1 text-muted-foreground">D{plan.route[i].day}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Legend */}
          <div className="absolute top-3 right-3 bg-background/90 rounded-lg border px-3 py-2 text-[10px] shadow-sm">
            <div className="font-semibold mb-1.5">图例</div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full" style={{ background: color }} /><span>当前日</span></div>
              <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-slate-400/50" /><span>其他日</span></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
