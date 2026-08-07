"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin, Compass, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TravelPlan, TravelDNA } from "@/types/travel";

const timelineColors = ["#6366f1", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899"];

export default function TripPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [dna, setDNA] = useState<TravelDNA | null>(null);
  const [activeDay, setActiveDay] = useState(0);

  useEffect(() => {
    const rawPlans = sessionStorage.getItem("travel-plans");
    const rawDNA = localStorage.getItem("travel-dna");

    if (!rawPlans) {
      router.push("/planning");
      return;
    }

    try {
      const plans: TravelPlan[] = JSON.parse(rawPlans);
      // Use first plan (or selected — for now default to index 0)
      setPlan(plans[0]);
      if (rawDNA) setDNA(JSON.parse(rawDNA));
    } catch {
      router.push("/planning");
    }
  }, [router]);

  if (!plan) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const activeItems = plan.days[activeDay]?.items || [];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="font-semibold">
            {dna?.destination || "目的地"} · {plan.name}
          </span>
          <Badge variant="secondary" className="text-[10px]">{plan.rating} 分</Badge>
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

            <polyline
              points="15,70 40,55 60,45 85,30"
              fill="none"
              stroke={timelineColors[activeDay % timelineColors.length]}
              strokeWidth="1"
              strokeDasharray="2,1.5"
              opacity="0.5"
            />
            <polyline
              points="15,70 40,55 60,45 85,30"
              fill="none"
              stroke={timelineColors[activeDay % timelineColors.length]}
              strokeWidth="0.6"
              className="animate-pulse"
            />

            {[
              { x: 15, y: 70, label: "起点" },
              { x: 40, y: 55, label: "景点" },
              { x: 60, y: 45, label: "核心" },
              { x: 85, y: 30, label: "终点" },
            ].map((wp, i) => (
              <g key={wp.label}>
                <circle cx={wp.x} cy={wp.y} r="2" fill={timelineColors[activeDay % timelineColors.length]} opacity="0.3" className="animate-ping" />
                <circle cx={wp.x} cy={wp.y} r="1.5" fill={timelineColors[activeDay % timelineColors.length]} />
                <text x={wp.x} y={wp.y - 3} textAnchor="middle" className="text-[3px] fill-muted-foreground">{wp.label}</text>
              </g>
            ))}
          </svg>

          <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
            路线示意 · {plan.days[activeDay]?.label || "Day " + (activeDay + 1)}
          </div>
        </div>

        {/* Right: Timeline */}
        <div className="overflow-auto p-6">
          <div className="flex gap-1 mb-6 flex-wrap">
            {plan.days.map((d, i) => (
              <button
                key={d.day}
                onClick={() => setActiveDay(i)}
                className={
                  "px-4 py-1.5 text-sm rounded-full transition-all " +
                  (i === activeDay ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")
                }
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="relative">
            {activeItems.map((item, idx) => {
              const isLast = idx === activeItems.length - 1;
              return (
                <div key={idx} className="relative flex gap-4 pb-8">
                  {!isLast && (
                    <div className="absolute left-[11px] top-8 bottom-0 w-px bg-border" />
                  )}
                  <div
                    className="relative z-10 mt-1 h-[22px] w-[22px] shrink-0 rounded-full border-2 border-background"
                    style={{ background: timelineColors[activeDay % timelineColors.length] }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-muted-foreground">{item.time}</span>
                    <h4 className="text-sm font-medium mt-0.5">{item.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Link href="/decision">
              <Button variant="outline" size="sm">查看 AI 建议</Button>
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
