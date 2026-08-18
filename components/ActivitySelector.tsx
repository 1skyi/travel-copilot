"use client";

import { Ticket, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivitySelection } from "@/types/budget";

interface ActivitySelectorProps {
  selection: ActivitySelection;
  onChange: (selection: ActivitySelection) => void;
}

export function ActivitySelector({ selection, onChange }: ActivitySelectorProps) {
  const toggle = (optionId: string) => {
    const selected = selection.selectedOptionIds.includes(optionId)
      ? selection.selectedOptionIds.filter((id) => id !== optionId)
      : [...selection.selectedOptionIds, optionId];
    onChange({ ...selection, selectedOptionIds: selected });
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {selection.options.map((option) => {
        const selected = selection.selectedOptionIds.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => toggle(option.id)}
            className={cn(
              "flex items-start gap-2 rounded-xl border p-3 text-left transition-all",
              selected
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-primary/40"
            )}
          >
            <div
              className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
              )}
            >
              {selected && <Check className="h-3 w-3" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Ticket className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium">{option.title}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                D{option.day} · 预估 ¥{option.cost}/人
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}