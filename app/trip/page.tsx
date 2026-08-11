"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Compass, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TripPlan } from "@/types/plan";
import { TravelDNA } from "@/types/travel";

const timelineColors = ["#6366f1", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#ef4444", "#06b6d4"];

export default function TripPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planIdx = Number(searchParams.get("plan")) || 0;

  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [dna, setDNA] = useState<TravelDNA | null>(null);
  const [activeDay, setActiveDay] = useState(0);

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

  if (!plan) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const day = plan.route[activeDay];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <MapPin className="h-4 w-4 text-primary" />
          <div>
            <span className="font-semibold text-sm">{plan.title}</span>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px]">{plan.score} 分</Badge>
              <span className="text-[10px] text-muted-foreground">¥{plan.budget.toLocaleString()}</span>
              <span className="text-[10px] text-muted-foreground">{plan.route.length} 天</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/decision">
            <Button variant="outline" size="sm" className="text-xs h-7">AI 建议</Button>
          </Link>
          <Link href="/journey">
            <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
              <Compass className="h-3 w-3" />
              Journey
            </Button>
          </Link>
        </div>
      </div>

      {/* Map + Timeline */}
      <div className="flex-1 grid lg:grid-cols-2">
        {/* Left: Map */}
        <div className="bg-muted/30 flex items-center justify-center min-h-[300px] lg:min-h-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/30" />

          <svg className="relative w-3/4 h-3/4" viewBox="0 0 100 100">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.1" className="text-muted-foreground/20" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />

            {/* Route polyline — all days */}
            <polyline
              points={plan.route.map((_, i) => {
                const x = 15 + (70 / (plan.route.length - 1 || 1)) * i;
                const y = 80 - (i % 3) * 25;
                return `${x},${y}`;
              }).join(" ")}
              fill="none"
              stroke={timelineColors[activeDay % timelineColors.length]}
              strokeWidth="1.5"
              strokeDasharray="4,2"
              opacity="0.4"
            />

            {/* Waypoints */}
            {plan.route.map((r, i) => {
              const x = 15 + (70 / (plan.route.length - 1 || 1)) * i;
              const y = 80 - (i % 3) * 25;
              const isActive = i === activeDay;
              return (
                <g key={i}>
                  {isActive && (
                    <circle cx={x} cy={y} r="4" fill={timelineColors[activeDay % timelineColors.length]} opacity="0.2" className="animate-ping" />
                  )}
                  <circle cx={x} cy={y} r={isActive ? "2.5" : "1.5"} fill={isActive ? timelineColors[activeDay % timelineColors.length] : "#94a3b8"} />
                  <text x={x} y={y - 3.5} textAnchor="middle" className="text-[3px] fill-muted-foreground">{r.location.slice(0, 4)}</text>
                </g>
              );
            })}
          </svg>

          <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded shadow-sm">
            Day {day?.day || activeDay + 1} · {day?.location || ""}
          </div>
          <div className="absolute bottom-4 right-4 flex flex-wrap gap-1.5">
            {plan.tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
            ))}
          </div>
        </div>

        {/* Right: Timeline */}
        <div className="overflow-auto p-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4">
            {plan.route.length} 天行程
          </h2>

          {/* Day selector */}
          <div className="flex gap-1 mb-6 flex-wrap">
            {plan.route.map((d, i) => (
              <button
                key={d.day}
                onClick={() => setActiveDay(i)}
                className={
                  "px-3 py-1.5 text-xs rounded-full transition-all " +
                  (i === activeDay
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80")
                }
              >
                Day {d.day}
              </button>
            ))}
          </div>

          {/* Day detail */}
          {day && (
            <>
              <div className="mb-6 p-4 rounded-xl bg-muted/30 border">
                <p className="text-xs text-muted-foreground">Day {day.day}</p>
                <h3 className="text-xl font-bold mt-0.5">{day.location}</h3>
              </div>

              {/* Activities timeline */}
              <div className="relative">
                {day.activities.map((activity, idx) => {
                  const isLast = idx === day.activities.length - 1;
                  const colors = timelineColors;
                  return (
                    <div key={idx} className="relative flex gap-3 pb-6">
                      {!isLast && (
                        <div className="absolute left-[13px] top-8 bottom-0 w-px bg-border" />
                      )}
                      <div
                        className="relative z-10 mt-1 h-[26px] w-[26px] shrink-0 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: colors[activeDay % colors.length] }}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <h4 className="text-sm font-medium leading-snug">{activity}</h4>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Plan selection buttons (if multiple plans in session) */}
          <div className="flex gap-2 mt-6 pt-4 border-t">
            <Link href="/decision">
              <Button variant="outline" size="sm">AI 关键建议</Button>
            </Link>
            <Link href="/journey">
              <Button size="sm" className="gap-1.5">
                <Compass className="h-3.5 w-3.5" />
                进入 Journey
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
