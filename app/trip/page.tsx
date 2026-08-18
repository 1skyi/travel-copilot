"use client";

import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Compass, ArrowRight, Sparkles, FileText, Wallet, Expand } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Timeline, TimelineItem } from "@/components/Timeline";
import { MapView } from "@/components/MapView";
import { TripPlan, DailyTimeline } from "@/types/plan";
import { TravelDNA } from "@/types/travel";
import { ItineraryAgent } from "@/agents/ItineraryAgent";
import type { BudgetSummary } from "@/types/budget";
import type { RouteMode } from "@/types/location";
import { useTravelMapData, type TravelMapDataSeed } from "@/hooks/useTravelMapData";
import { sanitizeLocationName } from "@/lib/travel-data/utils";

const timelineColors = ["#6366f1", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#ef4444", "#06b6d4"];
const routeModeLabels: Record<RouteMode, string> = {
  DRIVING: "驾车",
  TRANSIT: "公交",
  WALKING: "步行",
};

function TripPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planIdx = Number(searchParams.get("plan")) || 0;

  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [dna, setDNA] = useState<TravelDNA | null>(null);
  const [activeDay, setActiveDay] = useState<number | null>(0);
  const [highlightedActivity, setHighlightedActivity] = useState<number | null>(null);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [storedItineraries, setStoredItineraries] = useState<DailyTimeline[] | null>(null);
  const [storedMapData, setStoredMapData] = useState<TravelMapDataSeed | null>(null);
  const [routeMode, setRouteMode] = useState<RouteMode>("DRIVING");
  const dayCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeDay !== null) {
      dayCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeDay]);

  useEffect(() => {
    const rawPlans = sessionStorage.getItem("s3-plans");
    const rawDNA = localStorage.getItem("travel-dna");

    if (!rawPlans) {
      router.push("/planning");
      return;
    }

    try {
      const plans: TripPlan[] = JSON.parse(rawPlans);
      const idx = Math.min(planIdx, plans.length - 1);

      const rawSelections = sessionStorage.getItem("s3-user-selections");
      const rawBudgetSummary = sessionStorage.getItem("s3-budget-summary");
      if (!rawSelections || !rawBudgetSummary) {
        router.replace("/budget?plan=" + idx);
        return;
      }

      setPlan(plans[idx]);
      const rawItineraries = sessionStorage.getItem("s3-itineraries");
      if (rawItineraries) setStoredItineraries(JSON.parse(rawItineraries));
      const rawMap = sessionStorage.getItem("s3-planning-map");
      if (rawMap) setStoredMapData(JSON.parse(rawMap));
      if (rawDNA) setDNA(JSON.parse(rawDNA));
      setBudgetSummary(JSON.parse(rawBudgetSummary));
    } catch {
      router.push("/planning");
    }
  }, [router, planIdx]);

  // Real map data: 行程地点名 → 真实坐标 → 真实驾驶路线
  const dayLocations = useMemo(
    () => (plan ? plan.route.map((day) => sanitizeLocationName(day.location)) : []),
    [plan]
  );
  const mapData = useTravelMapData(dayLocations, routeMode, planIdx === 0 ? storedMapData : null);

  // Generate daily timelines using ItineraryAgent
  const dailyTimelines = useMemo(() => {
    if (storedItineraries && storedItineraries.length > 0 && planIdx === 0) return storedItineraries;
    if (!plan || !dna) return [];
    const agent = new ItineraryAgent();
    return agent.generate({ plan, dna: { style: dna.style, pace: dna.pace, avoid: dna.avoid } });
  }, [plan, dna, storedItineraries, planIdx]);

  const handleDayChange = (dayIndex: number) => {
    setActiveDay(dayIndex);
    setHighlightedActivity(null);
  };

  const handleFullJourney = () => {
    setActiveDay(null);
    setHighlightedActivity(null);
  };

  // Map → Timeline：点击 Marker 后，以 marker 对应的 dayId 作为唯一事实源
  const handleLocationClick = (_locationId: string, dayId: number) => {
    setActiveDay(dayId);
    setHighlightedActivity(null);
  };

  // Timeline 内活动点击 → 高亮当前活动（单次脉冲后自动取消）
  const handleActivityClick = (index: number) => {
    setHighlightedActivity(index);
    setTimeout(() => setHighlightedActivity(null), 1500);
  };

  if (!plan) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const activeTimeline = activeDay !== null ? dailyTimelines[activeDay] : null;

  const timelineItems: TimelineItem[] = activeTimeline?.items.map((item) => ({
    time: item.time,
    title: item.title,
    description: item.description,
    type: (item.type === "photo" ? "activity" : item.type) as TimelineItem["type"],
  })) || [];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background/80 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <MapPin className="h-4 w-4 text-primary" />
          <div>
            <span className="font-semibold text-sm">{plan.title}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px]">{plan.score} 分</Badge>
              {budgetSummary && (
                <Link href={"/budget?plan=" + planIdx}>
                  <Badge variant="outline" className="text-[10px] gap-1 hover:border-primary/40">
                    <Wallet className="h-3 w-3" />
                    ¥{budgetSummary.estimatedMin.toLocaleString()} ~ ¥{budgetSummary.estimatedMax.toLocaleString()}
                  </Badge>
                </Link>
              )}
              <span className="text-[10px] text-muted-foreground">¥{plan.budget.toLocaleString()}</span>
              <span className="text-[10px] text-muted-foreground">{plan.route.length} 天</span>
              <span className="text-[10px] text-muted-foreground">{plan.suitableFor}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="mr-1 hidden items-center gap-0.5 rounded-full border bg-muted/30 p-0.5 sm:flex">
            {(Object.keys(routeModeLabels) as RouteMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setRouteMode(mode)}
                className={
                  "rounded-full px-2.5 py-1 text-[10px] font-medium transition-all " +
                  (routeMode === mode
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {routeModeLabels[mode]}
              </button>
            ))}
          </div>
          <Link href="/decision">
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
              <Sparkles className="h-3 w-3" />AI 建议
            </Button>
          </Link>
          <Link href={"/journey?day=" + (activeDay ?? 0) + "&plan=" + planIdx}>
            <Button size="sm" className="gap-1.5 h-7 text-xs">
              <Compass className="h-3 w-3" />
              Journey 模式
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Map + Timeline */}
      <div className="flex-1 grid lg:grid-cols-2 divide-x">
        {/* Left: Real AMap */}
        <div className="min-h-[350px] lg:min-h-0">
          <MapView
            locations={mapData.locations}
            locationDayIds={mapData.locationDayIds}
            routes={mapData.routes}
            routeDayIds={mapData.routeDayIds}
            activeDay={activeDay}
            onDayChange={(dayIndex) => {
              if (dayIndex === null) handleFullJourney();
              else handleDayChange(dayIndex);
            }}
            onLocationClick={handleLocationClick}
            loading={mapData.loading}
            error={mapData.error ?? undefined}
            onRetry={mapData.retry}
          />
        </div>

        {/* Right: Timeline controller */}
        <div className="overflow-auto">
          <div className="p-6">
            {/* Day selector row */}
            <div className="flex gap-1 mb-6 flex-wrap">
              <button
                onClick={handleFullJourney}
                className={
                  "inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-full transition-all " +
                  (activeDay === null
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80")
                }
              >
                <Expand className="h-3 w-3" />
                查看全程
              </button>
              {plan.route.map((d, i) => (
                <button
                  key={d.day}
                  onClick={() => handleDayChange(i)}
                  className={
                    "px-3 py-1.5 text-xs rounded-full transition-all " +
                    (i === activeDay
                      ? "text-white shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80")
                  }
                  style={i === activeDay ? { background: timelineColors[i % timelineColors.length] } : undefined}
                >
                  D{d.day}
                </button>
              ))}
            </div>

            {activeDay === null ? (
              <div className="space-y-3">
                <Card className="border-0 shadow-none bg-gradient-to-r from-muted/50 to-transparent">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-bold">全程概览</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      地图已显示整段旅程，点击任意一天聚焦当天路线。
                    </p>
                  </CardContent>
                </Card>

                {dailyTimelines.map((day, index) => (
                  <button
                    key={day.day}
                    onClick={() => handleDayChange(index)}
                    className="w-full rounded-xl border p-3 text-left transition-all hover:border-primary/40 hover:bg-muted/20"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Day {day.day}</p>
                        <p className="text-sm font-medium">{day.location}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{day.items.length} 个活动</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <>
                {activeTimeline && (
                  <Card ref={dayCardRef} className="mb-6 border-0 shadow-none bg-gradient-to-r from-muted/50 to-transparent">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">Day {activeTimeline.day}</p>
                          <h3 className="text-xl font-bold mt-0.5">{activeTimeline.location}</h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {activeTimeline.items.length} 个活动 · {activeTimeline.items[0]?.time || ""} — {activeTimeline.items[activeTimeline.items.length - 1]?.time || ""}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {(["activity", "meal", "transport", "photo"] as const).map((t) => {
                            const count = activeTimeline.items.filter((i) => i.type === t).length;
                            if (count === 0) return null;
                            const icons: Record<string, string> = { activity: "🎯", meal: "🍽️", transport: "🚗", photo: "📷" };
                            return (
                              <Badge key={t} variant="secondary" className="text-[10px] gap-0.5">
                                {icons[t]}{count}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {timelineItems.length > 0 && (
                  <>
                    <p className="text-[10px] text-muted-foreground mb-2">点击活动 → 地图高亮定位</p>
                    <Timeline
                      items={timelineItems}
                      variant="vertical"
                      onItemClick={handleActivityClick}
                      highlightedIndex={highlightedActivity ?? undefined}
                    />
                  </>
                )}
              </>
            )}

            {/* Bottom actions */}
            <div className="flex gap-2 mt-8 pt-4 border-t flex-wrap">
              <Link href="/decision">
                <Button variant="outline" size="sm" className="gap-1 text-xs">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI 关键建议
                </Button>
              </Link>
              <Link href={"/report?plan=" + planIdx}>
                <Button variant="outline" size="sm" className="gap-1 text-xs">
                  <FileText className="h-3.5 w-3.5" />
                  旅行报告
                </Button>
              </Link>
              <Link href={"/journey?day=" + (activeDay ?? 0) + "&plan=" + planIdx}>
                <Button size="sm" className="gap-1.5">
                  <Compass className="h-3.5 w-3.5" />
                  进入 Journey 模式
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TripPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[calc(100vh-4rem)]" />}>
      <TripPageContent />
    </Suspense>
  );
}
