"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Compass, ArrowRight, Sparkles, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Timeline, TimelineItem } from "@/components/Timeline";
import { MapView } from "@/components/MapView";
import { TripPlan, DailyTimeline } from "@/types/plan";
import { TravelDNA } from "@/types/travel";
import { ItineraryAgent } from "@/agents/ItineraryAgent";

const timelineColors = ["#6366f1", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#ef4444", "#06b6d4"];

function TripPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planIdx = Number(searchParams.get("plan")) || 0;

  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [dna, setDNA] = useState<TravelDNA | null>(null);
  const [activeDay, setActiveDay] = useState(0);
  const [highlightedActivity, setHighlightedActivity] = useState<number | null>(null);

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
      setPlan(plans[idx]);
      if (rawDNA) setDNA(JSON.parse(rawDNA));
    } catch {
      router.push("/planning");
    }
  }, [router, planIdx]);

  // Generate daily timelines using ItineraryAgent
  const dailyTimelines = useMemo(() => {
    if (!plan || !dna) return [];
    const agent = new ItineraryAgent();
    return agent.generate({ plan, dna: { style: dna.style, pace: dna.pace, avoid: dna.avoid } });
  }, [plan, dna]);

  // Reset highlighted activity when changing days
  const handleDayChange = (dayIndex: number) => {
    setActiveDay(dayIndex);
    setHighlightedActivity(null);
  };

  // Handle timeline item click — flash the map marker
  const handleActivityClick = (index: number) => {
    setHighlightedActivity(index);
    // Auto-dismiss the pulse after 1.5s
    setTimeout(() => setHighlightedActivity(null), 1500);
  };

  if (!plan) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const activeTimeline = dailyTimelines[activeDay];

  // Convert to TimelineItem for the Timeline component
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
              <span className="text-[10px] text-muted-foreground">¥{plan.budget.toLocaleString()}</span>
              <span className="text-[10px] text-muted-foreground">{plan.route.length} 天</span>
              <span className="text-[10px] text-muted-foreground">{plan.suitableFor}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/decision">
            <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
              <Sparkles className="h-3 w-3" />AI 建议
            </Button>
          </Link>
          <Link href={"/journey?day=" + activeDay + "&plan=" + planIdx}>
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
        {/* Left: MapView */}
        <div className="min-h-[350px] lg:min-h-0">
          <MapView
            plan={plan}
            activeDay={activeDay}
            onDayChange={handleDayChange}
            pulseMarker={highlightedActivity !== null}
          />
        </div>

        {/* Right: Timeline */}
        <div className="overflow-auto">
          <div className="p-6">
            {/* Day selector row */}
            <div className="flex gap-1 mb-6 flex-wrap">
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

            {/* Day header card */}
            {activeTimeline && (
              <Card className="mb-6 border-0 shadow-none bg-gradient-to-r from-muted/50 to-transparent">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Day {activeTimeline.day}</p>
                      <h3 className="text-xl font-bold mt-0.5">{activeTimeline.location}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activeTimeline.items.length} 个活动 · {activeTimeline.items[0]?.time || ""} — {activeTimeline.items[activeTimeline.items.length - 1]?.time || ""}
                      </p>
                    </div>
                    {/* Activity type summary */}
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

            {/* Timeline — now clickable with map highlight */}
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
              <Link href={"/journey?day=" + activeDay + "&plan=" + planIdx}>
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


