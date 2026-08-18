"use client";

import { CheckCircle2, Loader2, AlertCircle, Database, Map, Wallet, ShieldCheck, PartyPopper, MessageSquare, Plane, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ElementType } from "react";
import type { PlanningPhase, PlanningProgress } from "@/types/planning";

const PHASES: { phase: PlanningPhase; label: string; icon: ElementType }[] = [
  { phase: "UNDERSTANDING", label: "理解需求", icon: MessageSquare },
  { phase: "COLLECTING_DATA", label: "获取数据", icon: Database },
  { phase: "TRANSPORT", label: "分析交通", icon: Plane },
  { phase: "PLANNING", label: "规划路线", icon: Map },
  { phase: "CALCULATING_BUDGET", label: "计算预算", icon: Wallet },
  { phase: "CHECKING", label: "检查预算", icon: ShieldCheck },
  { phase: "COMPLETED", label: "完成", icon: PartyPopper },
  { phase: "REPLANNING", label: "重新优化预算", icon: RefreshCw },
];

interface PlanningStatusProps {
  progress: PlanningProgress | null;
  error?: string;
}

export function PlanningStatus({ progress, error = "" }: PlanningStatusProps) {
  const activePhase = progress?.phase ?? null;
  const activeIndex = activePhase
    ? PHASES.findIndex((item) => item.phase === activePhase)
    : -1;

  return (
    <div className="space-y-2">
      {PHASES.map((item, index) => {
        // 重新优化预算仅在触发时展示
        if (item.phase === "REPLANNING" && activePhase !== "REPLANNING") return null;
        const Icon = item.icon;
        const isDone = activeIndex > index || activePhase === "COMPLETED";
        const isActive = activeIndex === index;

        return (
          <div
            key={item.phase}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              isActive && "bg-accent/50",
              !isDone && !isActive && "opacity-40"
            )}
          >
            {isDone ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
            ) : isActive ? (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
            ) : (
              <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
            )}

            <div className="min-w-0">
              <p className={cn("text-sm", isActive ? "font-medium text-foreground" : "text-muted-foreground")}>
                {item.label}
              </p>
              {isActive && progress && (
                <p className="text-xs text-muted-foreground mt-0.5">{progress.message}</p>
              )}
            </div>
          </div>
        );
      })}

      {activePhase === "ERROR" && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">规划失败</p>
            <p className="text-xs mt-0.5">{error || progress?.message || "请稍后重试"}</p>
          </div>
        </div>
      )}
    </div>
  );
}