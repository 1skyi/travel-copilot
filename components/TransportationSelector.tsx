"use client";

import { useState } from "react";
import { Plane, Train, Car, Bus, Lightbulb, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TransportSegment, TransportMode, BudgetSourceType } from "@/types/budget";

const MODE_ICON: Record<TransportMode, typeof Plane> = {
  FLIGHT: Plane,
  TRAIN: Train,
  DRIVE: Car,
  BUS: Bus,
};

const SOURCE_LABEL: Record<BudgetSourceType, string> = {
  EXTERNAL_DATA: "真实数据",
  AI_ESTIMATE: "AI 估算",
  USER_INPUT: "用户输入",
  UNKNOWN: "暂无数据",
};

interface TransportationSelectorProps {
  segments: TransportSegment[];
  onChange: (segments: TransportSegment[]) => void;
}

export function TransportationSelector({ segments, onChange }: TransportationSelectorProps) {
  const [expandedOption, setExpandedOption] = useState<string | null>(null);

  const select = (segmentId: string, optionId: string) => {
    onChange(
      segments.map((segment) =>
        segment.id === segmentId ? { ...segment, selectedOptionId: optionId } : segment
      )
    );
  };

  return (
    <div className="space-y-4">
      {segments.map((segment) => (
        <Card key={segment.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold">{segment.label}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {segment.origin} → {segment.destination}
                </p>
              </div>
              <Badge variant="secondary" className="text-[10px]">每人价格</Badge>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {segment.options.map((option) => {
                const Icon = MODE_ICON[option.mode];
                const selected = segment.selectedOptionId === option.id;
                const expanded = expandedOption === segment.id + "-" + option.id;
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
                      onClick={() => select(segment.id, option.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/40">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{option.provider}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {option.departure} → {option.arrival} · {option.duration}
                            </p>
                            <p className="text-[10px] text-muted-foreground/70">
                              来源：{option.source}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">¥{option.price.toLocaleString()}</p>
                          <Badge variant="outline" className="mt-1 text-[9px]">
                            {SOURCE_LABEL[option.sourceType]}
                          </Badge>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedOption(expanded ? null : segment.id + "-" + option.id)}
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
