"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanCard } from "@/components/PlanCard";
import { DecisionCardNew } from "@/components/DecisionCardNew";
import { TripPlan, BudgetBreakdown, ReviewResult, DecisionOption } from "@/types/plan";

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<TripPlan[]>([]);
  const [budgets, setBudgets] = useState<BudgetBreakdown[]>([]);
  const [reviews, setReviews] = useState<ReviewResult[]>([]);
  const [decisions, setDecisions] = useState<DecisionOption[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    const rawPlans = sessionStorage.getItem("s3-plans");
    if (!rawPlans) { router.push("/planning"); return; }
    try {
      const parsed = JSON.parse(rawPlans);
      setPlans(parsed);
      const rawBudgets = sessionStorage.getItem("s3-budgets");
      const rawReviews = sessionStorage.getItem("s3-reviews");
      const rawDecisions = sessionStorage.getItem("s3-decisions");
      if (rawBudgets) setBudgets(JSON.parse(rawBudgets));
      if (rawReviews) setReviews(JSON.parse(rawReviews));
      if (rawDecisions) setDecisions(JSON.parse(rawDecisions));
    } catch { router.push("/planning"); }
  }, []);

  if (plans.length === 0) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  const selected = selectedIdx !== null ? plans[selectedIdx] : null;
  const selectedBudget = selectedIdx !== null ? budgets[selectedIdx] : null;
  const selectedReview = selectedIdx !== null ? reviews[selectedIdx] : null;

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/30 px-4 py-1.5 text-sm text-muted-foreground mb-4">
            <Sparkles className="h-3.5 w-3.5" />5 个 Agent 协作完成
          </div>
          <h1 className="text-2xl font-bold tracking-tight">为你生成 3 个旅行方案</h1>
          <p className="text-sm text-muted-foreground mt-2">基于你的旅行 DNA，AI 多 Agent 分析生成</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {plans.map((plan, i) => (
            <PlanCard key={plan.id} plan={plan} rank={i} selected={selectedIdx === i} onClick={() => setSelectedIdx(selectedIdx === i ? null : i)} />
          ))}
        </div>

        {selected && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {selectedBudget && (
              <div className="p-4 rounded-xl border bg-muted/30">
                <h3 className="text-sm font-semibold mb-3">BudgetAgent 预算明细</h3>
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  {[{ label: "交通", val: selectedBudget.transport }, { label: "住宿", val: selectedBudget.hotel }, { label: "餐饮", val: selectedBudget.food }, { label: "门票", val: selectedBudget.ticket }, { label: "其他", val: selectedBudget.other }].map((item) => (
                    <div key={item.label}><div className="text-muted-foreground">{item.label}</div><div className="font-semibold mt-0.5">¥{item.val}</div></div>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t text-sm">
                  <span className="text-muted-foreground">总预算</span>
                  <span className="text-lg font-bold">¥{selectedBudget.total.toLocaleString()}</span>
                </div>
                {selectedBudget.note && <p className="text-[10px] text-muted-foreground mt-1">{selectedBudget.note}</p>}
              </div>
            )}

            {selectedReview && (selectedReview.warnings.length > 0 || selectedReview.suggestions.length > 0) && (
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <h3 className="text-sm font-semibold mb-2">ReviewAgent 检查 · 评分 {selectedReview.score}</h3>
                {selectedReview.warnings.map((w, i) => <p key={i} className="text-xs text-amber-600">⚠️ {w}</p>)}
                {selectedReview.suggestions.map((s, i) => <p key={i} className="text-xs text-muted-foreground">💡 {s}</p>)}
              </div>
            )}

            {decisions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">AI 关键决策建议</h3>
                <div className="space-y-3">
                  {decisions.map((d) => <DecisionCardNew key={d.id} decision={d} />)}
                </div>
              </div>
            )}

            <div className="flex justify-center pt-4">
              <Button size="lg" onClick={() => router.push(`/trip?plan=${selectedIdx}`)} className="gap-2">
                <MapPin className="h-4 w-4" />查看详细行程 <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

