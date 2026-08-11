"use client";

import { MapPin, Navigation, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "./ScoreBadge";
import { TripPlan } from "@/types/plan";

interface PlanCardProps {
  plan: TripPlan;
  rank: number;
  selected: boolean;
  onClick: () => void;
}

export function PlanCard({ plan, rank, selected, onClick }: PlanCardProps) {
  const RANK = ["A", "B", "C"][rank];
  const rankColors = ["#6366f1", "#10b981", "#f59e0b"];

  return (
    <Card
      onClick={onClick}
      className={
        "cursor-pointer transition-all duration-300 hover:shadow-lg " +
        (selected ? "ring-2 ring-primary shadow-lg scale-[1.01]" : "")
      }
    >
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
              style={{ background: rankColors[rank] }}
            >
              {RANK}
            </div>
            <div>
              <h3 className="text-lg font-bold">{plan.title}</h3>
              <p className="text-xs text-muted-foreground">{plan.suitableFor}</p>
            </div>
          </div>
          <ScoreBadge score={plan.score} />
        </div>

        {/* Budget + Desc */}
        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{plan.desc}</p>

        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
          <span className="font-semibold text-foreground">¥{plan.budget.toLocaleString()}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {plan.route.length} 天
          </span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {plan.tags.map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
          ))}
        </div>

        {/* Route preview (first 4 days) */}
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground font-semibold mb-1">路线预览</p>
          {plan.route.slice(0, 4).map((day, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-8 text-muted-foreground">D{day.day}</span>
              <span className="font-medium">{day.location}</span>
              <ChevronDown className="h-2.5 w-2.5 text-muted-foreground/40" />
              {i < plan.route.slice(0, 4).length - 1 && (
                <span className="text-muted-foreground">
                  {plan.route[i + 1]?.location || ""}
                </span>
              )}
            </div>
          ))}
          {plan.route.length > 4 && (
            <p className="text-[10px] text-muted-foreground pl-8">+ {plan.route.length - 4} 天</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
