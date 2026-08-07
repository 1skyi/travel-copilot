"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  CloudSun,
  Clock,
  ChevronRight,
  Sunrise,
  Navigation,
  Thermometer,
  Wind,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const dayData = {
  day: "Day 3",
  date: "2026年9月17日",
  weather: { temp: "22°C", desc: "晴朗", icon: CloudSun },
  sunrise: "07:32",
  sunset: "20:15",
  wind: "微风 3级",
};

const timeline = [
  { time: "07:00", title: "出发", desc: "前往赛里木湖", type: "transport" },
  { time: "09:30", title: "抵达赛里木湖", desc: "到达东门停车场", type: "arrive" },
  { time: "10:30", title: "下一站：赛里木湖", desc: "预计 10:30 到达", type: "next", highlight: true },
  { time: "12:00", title: "湖边野餐", desc: "推荐：自带干粮或景区餐厅", type: "meal" },
  { time: "14:00", title: "环湖徒步", desc: "西岸栈道 3km", type: "activity" },
  { time: "17:00", title: "返回民宿", desc: "赛里木湖畔民宿", type: "rest" },
];

const typeStyles: Record<string, string> = {
  transport: "#6366f1",
  arrive: "#10b981",
  next: "#f59e0b",
  meal: "#ec4899",
  activity: "#8b5cf6",
  rest: "#64748b",
};

export default function JourneyPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Hero with weather */}
      <div className="relative bg-gradient-to-br from-blue-600 via-indigo-500 to-purple-600 text-white">
        <Link href="/trip" className="absolute top-4 left-4 z-10">
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-white hover:bg-white/10 gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            返回
          </Button>
        </Link>

        <div className="px-6 pt-16 pb-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-sm">{dayData.date}</p>
              <h1 className="text-3xl font-bold mt-1">新疆 {dayData.day}</h1>
            </div>
            <div className="text-right">
              <Thermometer className="h-8 w-8 text-white/80" />
              <p className="text-2xl font-bold">{dayData.weather.temp}</p>
              <p className="text-sm text-white/70">{dayData.weather.desc}</p>
            </div>
          </div>

          {/* Weather details */}
          <div className="flex gap-4 mt-6 text-sm text-white/70">
            <span className="flex items-center gap-1">
              <Sunrise className="h-3.5 w-3.5" />
              日出 {dayData.sunrise}
            </span>
            <span className="flex items-center gap-1">
              <Wind className="h-3.5 w-3.5" />
              {dayData.wind}
            </span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-6 py-6">
        {/* Next stop highlight */}
        <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <Navigation className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">下一站</p>
                <p className="font-bold text-lg">赛里木湖</p>
                <p className="text-xs text-muted-foreground">预计 10:30 到达 · 带外套</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Day timeline */}
        <div className="relative">
          {timeline.map((item, idx) => {
            const isLast = idx === timeline.length - 1;
            const color = typeStyles[item.type] || "#64748b";
            const isNext = item.highlight;

            return (
              <div key={idx} className={"relative flex gap-4 pb-6 " + (isNext ? "" : "")}>
                {!isLast && (
                  <div className="absolute left-[13px] top-7 bottom-0 w-px bg-border" />
                )}
                <div
                  className={
                    "relative z-10 mt-1 h-[26px] w-[26px] shrink-0 rounded-full border-2 border-background flex items-center justify-center " +
                    (isNext ? "animate-pulse" : "")
                  }
                  style={{ background: color }}
                >
                  {isNext && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-muted-foreground">{item.time}</span>
                  <h4 className={"text-sm mt-0.5 " + (isNext ? "font-bold" : "font-medium")}>
                    {item.title}
                  </h4>
                  {item.desc && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tips */}
        <Card className="mt-6 border-dashed">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Thermometer className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold">旅行提示</p>
            </div>
            <ul className="space-y-1">
              <li className="text-xs text-muted-foreground">· 新疆早晚温差大，建议带外套</li>
              <li className="text-xs text-muted-foreground">· 赛里木湖海拔较高，注意防晒</li>
              <li className="text-xs text-muted-foreground">· 景区信号较弱，提前下载离线地图</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
