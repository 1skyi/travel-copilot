"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JourneyCard } from "@/components/JourneyCard";
import { TripPlan, JourneyState } from "@/types/plan";
import { JourneyAgent } from "@/agents/JourneyAgent";

function JourneyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dayParam = searchParams.get("day");
  const planParam = searchParams.get("plan");
  const [journey, setJourney] = useState<JourneyState | null>(null);
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [dayIndex, setDayIndex] = useState(Number(dayParam) || 0);
  const [planIdx, setPlanIdx] = useState(Number(planParam) || 0);

  useEffect(() => {
    const rawPlans = sessionStorage.getItem("s3-plans");
    if (!rawPlans) {
      router.push("/planning");
      return;
    }
    try {
      const plans: TripPlan[] = JSON.parse(rawPlans);
      const idx = Math.min(planIdx, plans.length - 1);
      const selectedPlan = plans[idx];
      setPlan(selectedPlan);

      const di = Math.min(Number(dayParam) || 0, selectedPlan.route.length - 1);
      setDayIndex(di);

      const agent = new JourneyAgent();
      const state = agent.generate({ plan: selectedPlan, dayIndex: di });
      setJourney(state);
    } catch {
      router.push("/planning");
    }
  }, [router, searchParams, dayParam, planIdx]);

  if (!journey || !plan) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Back + Day nav */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <Link href={"/trip?plan=" + planIdx}>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            返回行程
          </Button>
        </Link>

        {/* Day selector */}
        <div className="flex gap-1">
          {plan.route.map((d, i) => (
            <Link key={d.day} href={"?day=" + i + "&plan=" + planIdx}>
              <button
                className={
                  "px-3 py-1 text-xs rounded-full transition-all " +
                  (i === dayIndex
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80")
                }
              >
                D{d.day}
              </button>
            </Link>
          ))}
        </div>

        <div className="w-20" />
      </div>

      {/* Journey content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        <JourneyCard state={journey} />
      </div>
    </div>
  );
}

export default function JourneyPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[calc(100vh-4rem)]" />}>
      <JourneyPageContent />
    </Suspense>
  );
}
