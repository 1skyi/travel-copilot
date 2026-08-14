"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Sparkles, MapPin, CalendarDays, Users, Wallet,
  Car, Heart, ShieldAlert, CheckCircle2, Loader2, PencilLine,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AgentStatusList } from "@/components/AgentStatus";
import { TravelController } from "@/agents/TravelAgentController";
import { RequirementAgent } from "@/agents/RequirementAgent";
import { Memory } from "@/lib/memory";
import { AgentStep } from "@/types/travel";
import {
  TripBrief,
  TRANSPORTATION_LABELS,
  TRIP_INTEREST_LABELS,
  TRIP_AVOID_LABELS,
  BUDGET_SCOPE_LABELS,
  getTotalBudget,
  getTravelerCount,
  isTripBriefComplete,
} from "@/types/trip";

const BRIEF_KEY = "s3-brief";

export default function BriefPage() {
  const router = useRouter();
  const agent = useMemo(() => new RequirementAgent(), []);
  const [brief, setBrief] = useState<TripBrief | null>(null);
  const [executing, setExecuting] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem(BRIEF_KEY);
    if (!raw) { router.push("/planning"); return; }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !parsed.preferences || !parsed.budget || !parsed.travelers) {
        router.push("/planning");
        return;
      }
      setBrief(parsed);
    } catch { router.push("/planning"); }
  }, [router]);

  const confirmAndPlan = async () => {
    if (!brief) return;
    if (!isTripBriefComplete(brief)) {
      setError("Trip Brief 信息不完整，无法开始规划");
      return;
    }
    setExecuting(true);
    setError("");

    const confirmed: TripBrief = { ...brief, confirmed: true, confirmedAt: new Date().toISOString() };
    sessionStorage.setItem(BRIEF_KEY, JSON.stringify(confirmed));

    const ctrl = new TravelController();
    ctrl.addProgressListener((s) => setSteps(s));
    try {
      const result = await ctrl.run(confirmed);
      sessionStorage.setItem("s3-plans", JSON.stringify(result.plans));
      sessionStorage.setItem("s3-budgets", JSON.stringify(result.budgets));
      sessionStorage.setItem("s3-reviews", JSON.stringify(result.reviews));
      sessionStorage.setItem("s3-decisions", JSON.stringify(result.decisions));

      Memory.saveLastTrip(result.plans[0], confirmed.destination);
      Memory.addToHistory({
        destination: confirmed.destination,
        days: confirmed.duration,
        dna: Memory.getDNA()!,
        selectedPlan: result.plans[0],
        result,
      });

      setTimeout(() => setDone(true), 500);
    } catch (e: any) {
      setError(e.message || "Agent pipeline failed");
    }
  };

  if (!brief) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  // ============ 执行阶段 ============
  if (executing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/30 px-4 py-1.5 text-sm text-muted-foreground mb-4">
              <Sparkles className="h-3.5 w-3.5" /> Planner Agent 执行中...
            </div>
            <h1 className="text-xl font-bold">正在生成 {brief.duration} 天方案</h1>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-sm">{error}</div>
          )}

          {steps.length > 0 ? <AgentStatusList steps={steps} /> : (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>
          )}

          {done && (
            <div className="mt-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Button size="lg" onClick={() => router.push("/plans")} className="gap-2">
                <Sparkles className="h-4 w-4" /> 查看 3 个方案 <ArrowLeft className="h-4 w-4 rotate-180" />
              </Button>
            </div>
          )}

          {error && !done && (
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={() => { setExecuting(false); setError(""); setSteps([]); }}>返回修改</Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============ 确认阶段 ============
  const understanding = agent.summarize(brief);

  const travelersCount = getTravelerCount(brief.travelers);
  const totalBudget = getTotalBudget(brief);
  const fieldItems: { icon: any; label: string; value: string }[] = [
    { icon: MapPin, label: "出发地", value: brief.origin || "缺失" },
    { icon: MapPin, label: "目的地", value: brief.destination },
    { icon: CalendarDays, label: "出发日期", value: brief.startDate || "待定" },
    { icon: CalendarDays, label: "结束日期", value: brief.endDate || "待定" },
    { icon: CalendarDays, label: "旅行天数", value: brief.duration > 0 ? brief.duration + " 天" : "日期未完整" },
    { icon: Users, label: "出行人数", value: travelersCount + " 人（成人 " + brief.travelers.adults + " · 儿童 " + brief.travelers.children + "）" },
    { icon: Wallet, label: "预算", value: BUDGET_SCOPE_LABELS[brief.budget.scope] + " ¥" + brief.budget.amount.toLocaleString() + (brief.preferences.budgetIncludesTransport ? "（含往返）" : "（不含往返）") + " · 硬约束" },
    { icon: Wallet, label: "预算总额", value: "¥" + totalBudget.toLocaleString() },
    { icon: Car, label: "当地交通", value: TRANSPORTATION_LABELS[brief.preferences.transportation] },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <Link href="/planning">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />修改需求
          </Button>
        </Link>
        <div className="inline-flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" /> Trip Brief 确认
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">确认你的旅行需求</h1>
          <p className="text-sm text-muted-foreground mt-2">确认后 Planner Agent 才会开始规划</p>
        </div>

        {/* 字段清单 */}
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold mb-4">本次 Trip Brief</h2>
            <div className="space-y-3">
              {fieldItems.map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/40">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-medium">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            {/* 旅行重点 */}
            <div className="flex items-start gap-3 mb-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/40">
                <Heart className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-muted-foreground mb-1">本次旅行重点</p>
                <div className="flex flex-wrap gap-1.5">
                  {brief.preferences.interests.length > 0 ? brief.preferences.interests.map((i) => (
                    <Badge key={i} variant="secondary" className="text-[11px]">{TRIP_INTEREST_LABELS[i]}</Badge>
                  )) : <span className="text-xs text-muted-foreground">未特别指定</span>}
                </div>
              </div>
            </div>

            {/* 避雷 */}
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/40">
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-muted-foreground mb-1">希望避开</p>
                <div className="flex flex-wrap gap-1.5">
                  {brief.preferences.avoid.length > 0 ? brief.preferences.avoid.map((a) => (
                    <Badge key={a} variant="outline" className="text-[11px]">{TRIP_AVOID_LABELS[a]}</Badge>
                  )) : <span className="text-xs text-muted-foreground">无特别避雷</span>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI 理解 */}
        <Card className="border-primary/10 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold">AI 对你的需求理解</h2>
            </div>
            <ul className="space-y-1.5">
              {understanding.map((line, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{line}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* 操作 */}
        <div className="space-y-3">
          <Button size="lg" className="w-full gap-2" onClick={confirmAndPlan} disabled={!isTripBriefComplete(brief)}>
            <CheckCircle2 className="h-4 w-4" />{isTripBriefComplete(brief) ? "确认，开始规划" : "信息未完整，无法开始规划"}
          </Button>
          <Link href="/planning" className="block">
            <Button variant="outline" className="w-full gap-1.5 text-xs">
              <PencilLine className="h-3.5 w-3.5" />返回修改需求
            </Button>
          </Link>
          <p className="text-center text-[10px] text-muted-foreground/50">
            未确认 Trip Brief 前，Planner Agent 不会执行
          </p>
        </div>
      </div>
    </div>
  );
}
