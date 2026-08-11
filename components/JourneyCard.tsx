"use client";

import { Navigation, ChevronRight, Thermometer, Wind, Sunrise } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { JourneyState } from "@/types/plan";

interface JourneyCardProps {
  state: JourneyState;
}

export function JourneyCard({ state }: JourneyCardProps) {
  const { weather, nextStop, tips, currentDay, totalDays, sunrise, sunset, wind, planTitle } = state;

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-500 to-purple-600 text-white p-6">
        <div className="relative z-10">
          <p className="text-white/60 text-xs mb-1">{state.date}</p>
          <h1 className="text-2xl font-bold">{planTitle} · Day {currentDay}</h1>
          <div className="flex items-center gap-3 mt-3 text-white/80 text-xs">
            <span className="flex items-center gap-1"><Thermometer className="h-3 w-3" />{weather.temp}</span>
            <span className="flex items-center gap-1"><Wind className="h-3 w-3" />{wind}</span>
            <span className="flex items-center gap-1"><Sunrise className="h-3 w-3" />日出 {sunrise}</span>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-white/5 rounded-full translate-y-1/2" />
      </div>

      {/* Next Stop Card */}
      <Card className="border-amber-500/20 bg-amber-500/5 overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Navigation className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">下一站</p>
              <p className="font-bold text-lg">{nextStop.name}</p>
              <p className="text-xs text-muted-foreground">{nextStop.eta} · {nextStop.tip}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      {/* Today's Timeline */}
      {state.todayTimeline.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-3">今日时间线</h3>
          <div className="relative">
            {state.todayTimeline.map((item, idx) => {
              const isLast = idx === state.todayTimeline.length - 1;
              const typeColors: Record<string, string> = {
                transport: "#6366f1",
                meal: "#f59e0b",
                activity: "#10b981",
                rest: "#8b5cf6",
                photo: "#ec4899",
              };
              const color = typeColors[item.type] || "#64748b";

              return (
                <div key={idx} className="relative flex gap-3 pb-5">
                  {!isLast && <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />}
                  <div
                    className="relative z-10 mt-0.5 h-[22px] w-[22px] shrink-0 rounded-full border-2 border-background"
                    style={{ background: color }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-semibold text-muted-foreground">{item.time}</span>
                    <h4 className="text-sm font-medium mt-0.5">{item.title}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tips */}
      {tips.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Thermometer className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold">旅行提示</p>
            </div>
            <ul className="space-y-1">
              {tips.map((tip, i) => (
                <li key={i} className="text-xs text-muted-foreground">· {tip}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Progress bar */}
      <div className="pt-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
          <span>行程进度</span>
          <span>Day {currentDay} / {totalDays}</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700"
            style={{ width: (currentDay / totalDays) * 100 + "%" }}
          />
        </div>
      </div>
    </div>
  );
}
