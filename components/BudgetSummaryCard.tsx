"use client";

import {
  Wallet,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Save,
  TriangleAlert,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  BudgetSummary,
  BudgetSummaryLine,
  BudgetLineDataStatus,
  BudgetSourceType,
} from "@/types/budget";

const DATA_STATUS_LABEL: Record<BudgetLineDataStatus, string> = {
  REAL: "真实数据",
  ESTIMATED: "估算",
  NO_DATA: "暂无数据",
};

const BUDGET_STATUS_LABEL: Record<BudgetSummary["budgetStatus"], string> = {
  UNDER_BUDGET: "预算充足",
  ON_BUDGET: "接近预算",
  OVER_BUDGET: "超出预算",
};

const BUDGET_STATUS_CLASS: Record<BudgetSummary["budgetStatus"], string> = {
  UNDER_BUDGET: "border-green-200 bg-green-50 text-green-700",
  ON_BUDGET: "border-amber-200 bg-amber-50 text-amber-700",
  OVER_BUDGET: "border-red-200 bg-red-50 text-red-700",
};

function deriveDataStatus(sourceType: BudgetSourceType): BudgetLineDataStatus {
  if (sourceType === "EXTERNAL_DATA" || sourceType === "USER_INPUT") return "REAL";
  if (sourceType === "AI_ESTIMATE") return "ESTIMATED";
  return "NO_DATA";
}

function normalizeLine(line: BudgetSummaryLine): BudgetSummaryLine {
  const dataStatus = line.dataStatus ?? deriveDataStatus(line.sourceType);
  return {
    ...line,
    dataStatus,
    isEstimated: line.isEstimated ?? dataStatus === "ESTIMATED",
  };
}

function findLine(lines: BudgetSummaryLine[], key: string): BudgetSummaryLine | undefined {
  const line = lines.find((item) => item.key === key);
  return line ? normalizeLine(line) : undefined;
}

function mergeLines(
  first: BudgetSummaryLine | undefined,
  second: BudgetSummaryLine | undefined,
  label: string
): BudgetSummaryLine {
  const available = [first, second].filter(
    (line): line is BudgetSummaryLine => Boolean(line && line.dataStatus !== "NO_DATA")
  );
  if (available.length === 0) {
    const base = first ?? second;
    return {
      key: (base?.key ?? "transport") as BudgetSummaryLine["key"],
      label,
      amount: 0,
      minAmount: 0,
      maxAmount: 0,
      source: "暂无数据",
      sourceType: "UNKNOWN",
      isEstimated: false,
      dataStatus: "NO_DATA",
    };
  }

  const dataStatus: BudgetLineDataStatus = available.some((line) => line.dataStatus === "REAL")
    ? "REAL"
    : available.some((line) => line.dataStatus === "ESTIMATED")
      ? "ESTIMATED"
      : "NO_DATA";
  const sourceType: BudgetSourceType =
    dataStatus === "REAL"
      ? available[0].sourceType === "USER_INPUT"
        ? "USER_INPUT"
        : "EXTERNAL_DATA"
      : dataStatus === "ESTIMATED"
        ? "AI_ESTIMATE"
        : "UNKNOWN";

  return {
    key: (first?.key ?? second?.key ?? "transport") as BudgetSummaryLine["key"],
    label,
    amount: available.reduce((sum, line) => sum + line.amount, 0),
    minAmount: available.reduce((sum, line) => sum + line.minAmount, 0),
    maxAmount: available.reduce((sum, line) => sum + line.maxAmount, 0),
    source: available.map((line) => line.source).filter(Boolean).join(" / ") || "已选择",
    sourceType,
    isEstimated: dataStatus === "ESTIMATED",
    dataStatus,
  };
}

function relabelLine(line: BudgetSummaryLine | undefined, label: string): BudgetSummaryLine {
  if (!line) {
    return {
      key: "other",
      label,
      amount: 0,
      minAmount: 0,
      maxAmount: 0,
      source: "暂无数据",
      sourceType: "UNKNOWN",
      isEstimated: false,
      dataStatus: "NO_DATA",
    };
  }
  return { ...normalizeLine(line), label };
}

function buildCategoryLines(lines: BudgetSummaryLine[]): BudgetSummaryLine[] {
  return [
    mergeLines(findLine(lines, "transport"), findLine(lines, "localTransport"), "交通"),
    relabelLine(findLine(lines, "accommodation"), "酒店"),
    relabelLine(findLine(lines, "food"), "餐饮"),
    relabelLine(findLine(lines, "tickets"), "景点"),
    relabelLine(findLine(lines, "other"), "其他"),
  ];
}

interface BudgetSummaryCardProps {
  summary: BudgetSummary;
  onSave: () => void;
  saving?: boolean;
}

export function BudgetSummaryCard({ summary, onSave, saving = false }: BudgetSummaryCardProps) {
  const categories = buildCategoryLines(summary.lines);

  return (
    <Card className="sticky top-20">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold">决策预算</h2>
            <p className="text-[10px] text-muted-foreground">
              用户预算为硬约束，AI 不会覆盖
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-muted/20 p-3 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">总预算</span>
            <span className="font-bold">¥{summary.totalBudget.toLocaleString()}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">已规划金额</span>
            <span className="font-semibold">¥{summary.plannedAmount.toLocaleString()}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">剩余预算</span>
            <span className={summary.remainingBudget < 0 ? "font-semibold text-red-600" : "font-semibold text-green-600"}>
              {summary.remainingBudget < 0 ? "-" : ""}¥{Math.abs(summary.remainingBudget).toLocaleString()}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t pt-3">
            <span className="text-xs text-muted-foreground">预算状态</span>
            <Badge variant="outline" className={"text-[10px] " + BUDGET_STATUS_CLASS[summary.budgetStatus]}>
              {BUDGET_STATUS_LABEL[summary.budgetStatus]}
            </Badge>
          </div>
        </div>

        <div className="space-y-2.5 mb-4">
          {categories.map((line) => (
            <div key={line.label} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium">{line.label}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[9px] text-muted-foreground truncate">{line.source}</span>
                  <Badge variant="outline" className="shrink-0 text-[9px]">
                    {DATA_STATUS_LABEL[line.dataStatus]}
                  </Badge>
                </div>
              </div>
              <div className="shrink-0 text-right">
                {line.dataStatus === "NO_DATA" ? (
                  <p className="text-sm font-medium text-muted-foreground">未计入</p>
                ) : (
                  <>
                    <p className="text-sm font-semibold">¥{line.amount.toLocaleString()}</p>
                    {line.maxAmount > 0 && (
                      <p className="text-[9px] text-muted-foreground">
                        ¥{line.minAmount.toLocaleString()} ~ ¥{line.maxAmount.toLocaleString()}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {summary.hasIncompleteData && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 mb-4">
            <div className="flex items-start gap-1.5">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <p className="text-[10px] leading-relaxed text-amber-700">
                部分费用暂无数据，未按 0 元计入。当前总览只统计已有数据，请谨慎判断预算状态。
              </p>
            </div>
          </div>
        )}

        {summary.isOverBudget && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 mb-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 mb-2">
              <TrendingDown className="h-3.5 w-3.5" />
              超出预算 ¥{Math.abs(summary.remainingBudget).toLocaleString()}
            </div>
            <p className="text-[10px] text-red-600/80 mb-2">
              AI 不会自动修改你的选择，请参考以下建议自行调整：
            </p>
            <div className="flex flex-wrap gap-1.5">
              {summary.suggestions.map((suggestion) => (
                <Badge key={suggestion} variant="outline" className="text-[10px] text-red-600 border-red-200">
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {!summary.isOverBudget && (
          <div className="flex items-center gap-1.5 text-xs text-green-600 mb-4">
            <TrendingUp className="h-3.5 w-3.5" />
            {summary.budgetStatus === "ON_BUDGET" ? "当前接近预算上限" : "当前预算覆盖正常"}
          </div>
        )}

        <Button className="w-full gap-2" onClick={onSave} disabled={saving}>
          {saving ? (
            "保存中..."
          ) : (
            <>
              <Save className="h-4 w-4" />
              保存预算并查看行程
            </>
          )}
        </Button>
        <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground/60">
          <CheckCircle2 className="h-3 w-3" />
          未保存预算前无法进入行程详情
        </p>
      </CardContent>
    </Card>
  );
}