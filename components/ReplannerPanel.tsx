"use client";

import Link from "next/link";
import { Sparkles, CheckCircle2, TriangleAlert, ArrowRight, RotateCcw, Wallet, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ReplanResult } from "@/types/replanner";

interface ReplanPanelProps {
  result: ReplanResult;
  onAccept: () => void;
  onDiscard: () => void;
  accepting?: boolean;
  running?: boolean;
  planIdx?: number;
}

// 展示 Replanner 的调整明细与“为什么这样调整”，并支持接受/放弃
export function ReplanPanel({ result, onAccept, onDiscard, accepting = false, running = false, planIdx = 0 }: ReplanPanelProps) {
  const { success, originalBudget, newBudget, adjustments, mainOverBudgetSource, message } = result;

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">AI 预算重规划</h3>
          <Badge variant="secondary" className="text-[10px] gap-1">
            V1 → V2
          </Badge>
        </div>
        {mainOverBudgetSource && (
          <span className="text-[10px] text-muted-foreground">
            主要超支来源：<span className="font-medium text-foreground">{mainOverBudgetSource.label}（¥{mainOverBudgetSource.amount.toLocaleString()}）</span>
          </span>
        )}
      </div>

      {/* 运行态：重新优化预算中 */}
      {running && (
        <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <div>
            <p className="font-medium">正在重新优化预算...</p>
            <p className="text-xs mt-0.5 text-muted-foreground">AI 正在分析超支项并按优先级做局部调整</p>
          </div>
        </div>
      )}

      {/* 状态横幅 */}
      {success ? (
        <div className="mx-5 mt-4 flex items-start gap-2 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">已生成符合预算的新方案</p>
            <p className="text-xs mt-0.5 text-green-600/80">{message}</p>
          </div>
        </div>
      ) : (
        <div className="mx-5 mt-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-700">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">仍超预算，已保留当前方案（V1）</p>
            <p className="text-xs mt-0.5 text-amber-600/80">
              已尽量局部压缩（{adjustments.length} 项），未伪造符合预算的结果。请前往预算页手动调整。
            </p>
          </div>
        </div>
      )}

      {/* 预算对比 */}
      <div className="mx-5 mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl border bg-muted/30 px-3 py-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">用户预算（硬约束）</p>
          <p className="mt-0.5 text-sm font-bold">¥{newBudget.totalBudget.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-muted/30 px-3 py-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">调整前预计</p>
          <p className="mt-0.5 text-sm font-semibold text-amber-600">
            ¥{originalBudget.estimatedMin.toLocaleString()} ~ ¥{originalBudget.estimatedMax.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border bg-muted/30 px-3 py-2.5 text-center">
          <p className="text-[10px] text-muted-foreground">调整后预计</p>
          <p className="mt-0.5 text-sm font-semibold text-green-600">
            ¥{newBudget.estimatedMin.toLocaleString()} ~ ¥{newBudget.estimatedMax.toLocaleString()}
          </p>
        </div>
      </div>

      {/* 调整明细 */}
      <div className="mx-5 mt-4">
        <p className="text-xs font-semibold text-muted-foreground mb-2">
          为什么这样调整？共 {adjustments.length} 项局部修改
        </p>
        {adjustments.length === 0 ? (
          <p className="text-xs text-muted-foreground">暂无可用的局部调整项。</p>
        ) : (
          <div className="space-y-2">
            {adjustments.map((adjustment) => (
              <div key={adjustment.id} className="rounded-xl border bg-muted/20 px-3.5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{adjustment.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{adjustment.detail}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs">
                      <span className="text-muted-foreground line-through">¥{adjustment.originalAmount.toLocaleString()}</span>
                      <ArrowRight className="mx-1 inline h-3 w-3 text-muted-foreground" />
                      <span className="font-semibold">¥{adjustment.newAmount.toLocaleString()}</span>
                    </p>
                    <p className="text-[10px] font-medium text-green-600 mt-0.5">节省 ¥{adjustment.savedAmount.toLocaleString()}</p>
                  </div>
                </div>
                <p className="mt-2 rounded-lg bg-background/70 px-2.5 py-1.5 text-xs text-muted-foreground">
                  💡 {adjustment.reason}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 操作 */}
      <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t px-5 py-4">
        {success ? (
          <>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onDiscard} disabled={running}>
              <RotateCcw className="h-3.5 w-3.5" />
              放弃，保留原方案
            </Button>
            <Button size="sm" className="gap-1.5 text-xs" onClick={onAccept} disabled={accepting || running}>
              <Wallet className="h-3.5 w-3.5" />
              {accepting ? "正在应用..." : "接受新方案并查看行程"}
              <ArrowRight className="h-3 w-3" />
            </Button>
          </>
        ) : (
          <Link href={"/budget?plan=" + planIdx}>
            <Button size="sm" className="gap-1.5 text-xs">
              去预算页手动调整
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}