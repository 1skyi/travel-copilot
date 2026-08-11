"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, ArrowRight, Sliders } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface OptimizationIssue {
  label: string;
  current: string;
  optimized: string;
  saving?: number;
}

interface OptimizationCardProps {
  title: string;
  currentBudget: number;
  issues: OptimizationIssue[];
  onApply?: (adjustments: OptimizationIssue[]) => void;
}

export function OptimizationCard({ title, currentBudget, issues, onApply }: OptimizationCardProps) {
  const [budgetLevel, setBudgetLevel] = useState(50); // 0-100 slider
  const totalSaving = issues.reduce((s, i) => s + (i.saving || 0), 0);

  const adjustedBudget = currentBudget - Math.round(totalSaving * (budgetLevel / 100));
  const savingPercent = currentBudget > 0 ? Math.round((totalSaving / currentBudget) * 100) : 0;

  return (
    <Card className="border-dashed">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <Sliders className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold">{title}</h3>
            <p className="text-[10px] text-muted-foreground">当前预算 ¥{currentBudget.toLocaleString()}</p>
          </div>
          <Badge variant="outline" className="ml-auto text-[10px] gap-1">
            <TrendingDown className="h-3 w-3 text-emerald-500" />
            可优化 ¥{totalSaving.toLocaleString()}
          </Badge>
        </div>

        {/* Budget slider */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>优化强度</span>
            <span>{budgetLevel}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={budgetLevel}
            onChange={(e) => setBudgetLevel(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none bg-muted cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>轻</span>
            <span>重</span>
          </div>
        </div>

        {/* Adjusted budget preview */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 mb-4">
          <div className="text-xs text-muted-foreground">优化后预算</div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground line-through">¥{currentBudget.toLocaleString()}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-lg font-bold text-emerald-600">¥{adjustedBudget.toLocaleString()}</span>
          </div>
        </div>

        {/* Optimization issues */}
        <div className="space-y-2 mb-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">优化明细</p>
          {issues.map((issue, i) => (
            <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/20">
              <div className="flex-1 min-w-0">
                <span className="font-medium">{issue.label}</span>
                <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground">
                  <span className="line-through text-[10px]">{issue.current}</span>
                  <ArrowRight className="h-2.5 w-2.5" />
                  <span className="text-emerald-600">{issue.optimized}</span>
                </div>
              </div>
              {issue.saving !== undefined && (
                <Badge variant="secondary" className="text-[10px] shrink-0 ml-2">
                  {issue.saving > 0 ? "-¥" + issue.saving : "+¥" + Math.abs(issue.saving)}
                </Badge>
              )}
            </div>
          ))}
        </div>

        {/* Apply button */}
        {onApply && (
          <Button
            onClick={() => onApply(issues)}
            size="sm"
            className="w-full gap-1.5 text-xs"
          >
            <TrendingDown className="h-3.5 w-3.5" />
            应用优化 (省 ¥{Math.round(totalSaving * (budgetLevel / 100)).toLocaleString()})
          </Button>
        )}

        {/* Saving summary */}
        <p className="text-center text-[10px] text-muted-foreground mt-3">
          最多可节省 {savingPercent}% · 优化强度越高越省钱
        </p>
      </CardContent>
    </Card>
  );
}
