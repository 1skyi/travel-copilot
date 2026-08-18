"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Sparkles, MapPin, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanCard } from "@/components/PlanCard";
import { DecisionCardNew } from "@/components/DecisionCardNew";
import { WhyCard } from "@/components/WhyCard";
import { OptimizationCard } from "@/components/OptimizationCard";
import { ReplanPanel } from "@/components/ReplannerPanel";
import { ReplannerAgent } from "@/agents/ReplannerAgent";
import { TripPlan, BudgetBreakdown, ReviewResult, DecisionOption } from "@/types/plan";
import { TravelDNA } from "@/types/travel";
import type { TripBrief } from "@/types/trip";
import type { UserSelections } from "@/types/budget";
import type { TransportationSelection } from "@/types/transportation";
import type { ReplanResult } from "@/types/replanner";

function buildWhyReasons(plan: TripPlan, dna: TravelDNA | null): string[] {
  const reasons: string[] = [];
  if (dna) {
    if (dna.style === "摄影旅行") reasons.push("路线优先安排日出日落拍摄点，符合摄影偏好");
    if (dna.style === "美食旅行") reasons.push("沿途穿插地道美食体验，满足味蕾探索");
    if (dna.pace === "慢慢体验") reasons.push("每天不超过 3 个核心景点，预留充足自由时间");
    if (dna.avoid.includes("人多")) reasons.push("避开人流密集景区，选择小众深度打卡点");
    if (dna.interest.includes("自然风光")) reasons.push("最大化自然风光覆盖，减少城市周转时间");
  }
  reasons.push("经 BudgetAgent 精确预算，ReviewAgent 路线合理性检查");
  return reasons.slice(0, 4);
}

function buildDNAMatch(dna: TravelDNA | null): { trait: string; match: string }[] {
  if (!dna) return [];
  return [
    { trait: "旅行风格", match: dna.style },
    { trait: "节奏偏好", match: dna.pace },
    { trait: "住宿偏好", match: dna.hotel },
  ];
}

function PlansPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const [plans, setPlans] = useState<TripPlan[]>([]);
  const [budgets, setBudgets] = useState<BudgetBreakdown[]>([]);
  const [reviews, setReviews] = useState<ReviewResult[]>([]);
  const [decisions, setDecisions] = useState<DecisionOption[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [dna, setDNA] = useState<TravelDNA | null>(null);
  const [brief, setBrief] = useState<TripBrief | null>(null);
  const [selections, setSelections] = useState<UserSelections | null>(null);
  const [transportSelection, setTransportSelection] = useState<TransportationSelection | null>(null);
  const [replanResults, setReplanResults] = useState<Record<string, ReplanResult>>({});
  const [replanning, setReplanning] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [replanError, setReplanError] = useState("");

  useEffect(() => {
    const rawPlans = sessionStorage.getItem("s3-plans");
    if (!rawPlans) { router.push("/planning"); return; }
    try {
      const parsed = JSON.parse(rawPlans);
      setPlans(parsed);
      const rawBudgets = sessionStorage.getItem("s3-budgets");
      const rawReviews = sessionStorage.getItem("s3-reviews");
      const rawDecisions = sessionStorage.getItem("s3-decisions");
      const rawDNA = localStorage.getItem("travel-dna");
      if (rawBudgets) {
        const parsedBudgets = JSON.parse(rawBudgets);
        if (Array.isArray(parsedBudgets) && parsedBudgets[0]?.accommodation?.amount !== undefined) {
          setBudgets(parsedBudgets);
        }
      }
      if (rawReviews) setReviews(JSON.parse(rawReviews));
      if (rawDecisions) setDecisions(JSON.parse(rawDecisions));
      if (rawDNA) setDNA(JSON.parse(rawDNA));

      const rawBrief = sessionStorage.getItem("s3-brief");
      if (rawBrief) setBrief(JSON.parse(rawBrief));
      const rawSelections = sessionStorage.getItem("s3-user-selections");
      if (rawSelections) setSelections(JSON.parse(rawSelections));
      const rawTransport = sessionStorage.getItem("s3-transportation-selection");
      if (rawTransport) setTransportSelection(JSON.parse(rawTransport));
      const rawReplan = sessionStorage.getItem("s3-replan-results");
      if (rawReplan) setReplanResults(JSON.parse(rawReplan));
    } catch { router.push("/planning"); }
  }, [router]);

  // 深链预选（如“重新优化预算”从 /trip 跳转 ?plan=idx）
  useEffect(() => {
    if (planParam === null) return;
    const idx = Number(planParam);
    if (!Number.isNaN(idx) && idx >= 0 && idx < plans.length) {
      setSelectedIdx(idx);
    }
  }, [planParam, plans.length]);

  if (plans.length === 0) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  const anyOverBudget = budgets.some((budget) => budget.overBudget);

  const selected = selectedIdx !== null ? plans[selectedIdx] : null;
  const selectedBudget = selectedIdx !== null ? budgets[selectedIdx] : null;
  const selectedReview = selectedIdx !== null ? reviews[selectedIdx] : null;

  const whyReasons = selected ? buildWhyReasons(selected, dna) : [];
  const dnaMatch = buildDNAMatch(dna);

  // Replanner：只有 OVER_BUDGET 触发；结果按方案 ID 存历史（V1 保留不覆盖）
  const activeReplan = selected && replanResults[selected.id] ? replanResults[selected.id] : null;

  const runReplan = async () => {
    if (!selected || !brief || replanning) return;
    setReplanning(true);
    setReplanError("");
    try {
      const result = await new ReplannerAgent().replan({
        plan: selected,
        brief,
        dna,
        selections,
        transportation: transportSelection,
      });
      const merged = { ...replanResults, [selected.id]: result };
      setReplanResults(merged);
      sessionStorage.setItem("s3-replan-results", JSON.stringify(merged));
    } catch (e: any) {
      setReplanError(e.message || "预算重规划失败，请稍后重试");
    } finally {
      setReplanning(false);
    }
  };

  const acceptReplan = () => {
    if (!selected || !activeReplan || accepting) return;
    setAccepting(true);
    sessionStorage.setItem("s3-user-selections", JSON.stringify(activeReplan.selections));
    sessionStorage.setItem("s3-budget-summary", JSON.stringify(activeReplan.newBudget));
    sessionStorage.setItem("s3-active-replan", JSON.stringify({ planId: selected.id, result: activeReplan }));
    sessionStorage.setItem("s3-replan-results", JSON.stringify(replanResults));
    router.push("/trip?plan=" + selectedIdx);
  };

  const discardReplan = () => {
    sessionStorage.removeItem("s3-active-replan");
    router.push("/trip?plan=" + selectedIdx);
  };

  // Build optimization issues from budget
  const optimizationIssues = selectedBudget ? [
    { label: "住宿降级", current: "¥" + selectedBudget.accommodation.amount, optimized: "¥" + selectedBudget.accommodation.minAmount, saving: selectedBudget.accommodation.amount - selectedBudget.accommodation.minAmount },
    { label: "餐饮优化", current: "¥" + selectedBudget.food.amount, optimized: "¥" + selectedBudget.food.minAmount, saving: selectedBudget.food.amount - selectedBudget.food.minAmount },
    { label: "交通替代", current: "¥" + selectedBudget.transport.amount, optimized: "¥" + selectedBudget.transport.minAmount, saving: selectedBudget.transport.amount - selectedBudget.transport.minAmount },
  ] : [];

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/30 px-4 py-1.5 text-sm text-muted-foreground mb-4">
            <Sparkles className="h-3.5 w-3.5" />5 个 Agent 协作完成
          </div>
          <h1 className="text-2xl font-bold tracking-tight">为你生成 3 个旅行方案</h1>
          <p className="text-sm text-muted-foreground mt-2">
            结合 Trip Brief 与 Travel DNA · 预算为硬约束 · 超预算可一键重规划
          </p>
        </div>

        {anyOverBudget && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600">
            ⚠️ 你的预算可能不足以覆盖该行程。用户预算是硬约束，AI 不会伪造更低价格；请考虑缩短天数、提高预算、降低交通成本或更换目的地。
          </div>
        )}

        {/* Plan cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {plans.map((plan, i) => (
            <PlanCard key={plan.id} plan={plan} rank={i} selected={selectedIdx === i} onClick={() => setSelectedIdx(selectedIdx === i ? null : i)} />
          ))}
        </div>

        {selected && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* WhyCard — AI recommendation reason */}
            {whyReasons.length > 0 && (
              <WhyCard
                title={selectedIdx === 0 ? "AI 首选推荐" : "AI 备选方案"}
                reasons={whyReasons}
                dnaMatch={dnaMatch}
                score={selected.score}
              />
            )}

            {/* Budget breakdown */}
            {selectedBudget && (
              <div className="p-4 rounded-xl border bg-muted/30">
                <h3 className="text-sm font-semibold mb-3">AI 参考估算（尚未确认）</h3>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  {[
                    { label: "长途交通", val: selectedBudget.transport.amount },
                    { label: "住宿", val: selectedBudget.accommodation.amount },
                    { label: "餐饮", val: selectedBudget.food.amount },
                    { label: "门票", val: selectedBudget.tickets.amount },
                    { label: "当地交通", val: selectedBudget.localTransport.amount },
                    { label: "其他", val: selectedBudget.other.amount },
                  ].map((item) => (
                    <div key={item.label}><div className="text-muted-foreground">{item.label}</div><div className="font-semibold mt-0.5">¥{item.val.toLocaleString()}</div></div>
                  ))}
                </div>
                {selectedBudget.overBudget && (
                  <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-600">
                    ⚠️ 当前方案超预算：预计最低 ¥{selectedBudget.estimatedMin.toLocaleString()}，超出你的预算 ¥{selectedBudget.remainingMin < 0 ? (-selectedBudget.remainingMin).toLocaleString() : "0"}。
                  </div>
                )}
                {/* Replanner 触发：只有 OVER_BUDGET 才显示 */}
                {selectedBudget.overBudget && brief && (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      className="w-full gap-1.5 text-xs"
                      onClick={runReplan}
                      disabled={replanning}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {replanning ? "AI 正在分析超支项并调整预算..." : "生成符合预算的新方案（V1 → V2）"}
                    </Button>
                    {replanError && <p className="mt-2 text-xs text-red-600">{replanError}</p>}
                  </div>
                )}
                <div className="flex justify-between items-center mt-3 pt-3 border-t text-sm">
                  <span className="text-muted-foreground">估算区间</span>
                  <span className="font-semibold">¥{selectedBudget.estimatedMin.toLocaleString()} ~ ¥{selectedBudget.estimatedMax.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Replanner：无需调整的提示（引擎判定预算内） */}
            {activeReplan && activeReplan.newVersion === 1 && (
              <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm">
                <p className="font-medium">当前方案在预算内，无需调整。</p>
                <p className="mt-1 text-xs text-muted-foreground">{activeReplan.message}</p>
              </div>
            )}

            {/* Replanner 结果面板 */}
            {activeReplan && activeReplan.newVersion === 2 && (
              <ReplanPanel
                result={activeReplan}
                onAccept={acceptReplan}
                onDiscard={discardReplan}
                accepting={accepting}
                running={replanning}
                planIdx={selectedIdx ?? 0}
              />
            )}

            {/* OptimizationCard */}
            {optimizationIssues.length > 0 && selectedBudget && (
              <OptimizationCard
                title="预算优化方案"
                currentBudget={selectedBudget.total}
                issues={optimizationIssues}
                onApply={() => {}}
              />
            )}

            {/* Review warnings */}
            {selectedReview && (selectedReview.warnings.length > 0 || selectedReview.suggestions.length > 0) && (
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <h3 className="text-sm font-semibold mb-2">ReviewAgent 检查 · 评分 {selectedReview.score}</h3>
                {selectedReview.warnings.map((w, i) => <p key={i} className="text-xs text-amber-600">⚠️ {w}</p>)}
                {selectedReview.suggestions.map((s, i) => <p key={i} className="text-xs text-muted-foreground">💡 {s}</p>)}
              </div>
            )}

            {/* Decision cards */}
            {decisions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">AI 关键决策建议</h3>
                <div className="space-y-3">
                  {decisions.map((d) => <DecisionCardNew key={d.id} decision={d} />)}
                </div>
              </div>
            )}

            {/* CTA buttons */}
            <div className="flex gap-3 justify-center pt-4">
              <Button size="lg" onClick={() => router.push("/transportation?plan=" + selectedIdx)} className="gap-2">
                <MapPin className="h-4 w-4" />选择交通方案 <ArrowRight className="h-4 w-4" />
              </Button>
              <Link href={"/report?plan=" + selectedIdx}>
                <Button variant="outline" size="lg" className="gap-2">
                  <FileText className="h-4 w-4" />旅行报告
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PlansPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[calc(100vh-4rem)]"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}>
      <PlansPageContent />
    </Suspense>
  );
}