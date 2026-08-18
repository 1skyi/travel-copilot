"use client";

import { Bus, Car, Users, Route } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LocalTransportOption, BudgetSourceType } from "@/types/budget";

const SOURCE_LABEL: Record<BudgetSourceType, string> = {
  EXTERNAL_DATA: "真实数据",
  AI_ESTIMATE: "AI 估算",
  USER_INPUT: "用户输入",
  UNKNOWN: "暂无数据",
};

const ICONS: Record<string, typeof Bus> = {
  public: Bus,
  mixed: Route,
  charter: Users,
  self_drive: Car,
};

interface LocalTransportSelectorProps {
  options: LocalTransportOption[];
  selectedId: string | null;
  onChange: (optionId: string) => void;
}

export function LocalTransportSelector({ options, selectedId, onChange }: LocalTransportSelectorProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const Icon = ICONS[option.id] ?? Bus;
        const selected = selectedId === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
              selected
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-primary/40"
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/40">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{option.label}</span>
                <Badge variant="outline" className="text-[9px]">
                  {SOURCE_LABEL[option.sourceType]}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                ¥{option.costPerPersonPerDay}/人/天
              </p>
              {option.recommendationReason && (
                <p className="text-[10px] text-muted-foreground mt-1">{option.recommendationReason}</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}