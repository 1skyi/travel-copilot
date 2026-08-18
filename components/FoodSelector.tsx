"use client";

import { Utensils } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FoodPreference, BudgetSourceType } from "@/types/budget";

const SOURCE_LABEL: Record<BudgetSourceType, string> = {
  EXTERNAL_DATA: "真实数据",
  AI_ESTIMATE: "AI 估算",
  USER_INPUT: "用户输入",
  UNKNOWN: "暂无数据",
};

interface FoodSelectorProps {
  options: FoodPreference[];
  selectedId: string | null;
  onChange: (optionId: string) => void;
}

export function FoodSelector({ options, selectedId, onChange }: FoodSelectorProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {options.map((option) => {
        const selected = selectedId === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "rounded-xl border p-3 text-left transition-all",
              selected
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-primary/40"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Utensils className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-medium">{option.label}</span>
              </div>
              <Badge variant="outline" className="text-[9px]">
                {SOURCE_LABEL[option.sourceType]}
              </Badge>
            </div>
            <p className="text-sm font-semibold">
              ¥{option.minPerPersonPerDay} ~ ¥{option.maxPerPersonPerDay}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">每人每天</p>
            {option.recommendationReason && (
              <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                {option.recommendationReason}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}