"use client";

import { useState } from "react";
import { Star, Lightbulb, ChevronDown, BedDouble } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AccommodationSelection, BudgetSourceType } from "@/types/budget";

const SOURCE_LABEL: Record<BudgetSourceType, string> = {
  EXTERNAL_DATA: "真实数据",
  AI_ESTIMATE: "AI 估算",
  USER_INPUT: "用户输入",
  UNKNOWN: "暂无数据",
};

interface AccommodationSelectorProps {
  selections: AccommodationSelection[];
  onChange: (selections: AccommodationSelection[]) => void;
}

export function AccommodationSelector({ selections, onChange }: AccommodationSelectorProps) {
  const [expandedOption, setExpandedOption] = useState<string | null>(null);

  const select = (selectionId: string, optionId: string) => {
    onChange(
      selections.map((selection) =>
        selection.id === selectionId ? { ...selection, selectedOptionId: optionId } : selection
      )
    );
  };

  return (
    <div className="space-y-4">
      {selections.map((selection) => (
        <Card key={selection.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-muted-foreground" />
                <div>
                  <h3 className="text-sm font-bold">{selection.label}</h3>
                  <p className="text-[10px] text-muted-foreground">
                    {selection.location} · {selection.nights} 晚
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-[10px]">每间每晚</Badge>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {selection.options.map((option) => {
                const selected = selection.selectedOptionId === option.id;
                const expanded = expandedOption === selection.id + "-" + option.id;
                return (
                  <div
                    key={option.id}
                    className={cn(
                      "rounded-xl border p-3 transition-all",
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => select(selection.id, option.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{option.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span className="text-[10px] text-muted-foreground">{option.rating}</span>
                            <span className="text-[10px] text-muted-foreground">· {option.roomType}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">¥{option.pricePerNight.toLocaleString()}</p>
                          <Badge variant="outline" className="mt-1 text-[9px]">
                            {SOURCE_LABEL[option.sourceType]}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {option.amenities.map((amenity) => (
                          <span key={amenity} className="rounded bg-muted/40 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedOption(expanded ? null : selection.id + "-" + option.id)}
                      className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      <Lightbulb className="h-3 w-3" />
                      为什么推荐？
                      <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
                    </button>

                    {expanded && option.recommendationReason && (
                      <p className="mt-2 rounded-lg bg-muted/30 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
                        {option.recommendationReason}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}