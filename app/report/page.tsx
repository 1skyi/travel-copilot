"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Download, Share2, Sparkles, MapPin,
  Clock, Wallet, CalendarDays, CheckCircle2, TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { WhyCard } from "@/components/WhyCard";
import { TripPlan, BudgetBreakdown, ReviewResult } from "@/types/plan";
import { TravelDNA, PersonalityProfile } from "@/types/travel";
import { Memory } from "@/lib/memory";

const dayColors = ["#6366f1", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#ef4444", "#06b6d4"];

function buildWhyReasons(plan: TripPlan, dna: TravelDNA | null): string[] {
  const reasons: string[] = [];
  if (dna) {
    if (dna.style === "摄影旅行") reasons.push("路线优先安排日出日落拍摄点，符合摄影偏好");
    if (dna.style === "美食旅行") reasons.push("沿途穿插地道美食体验，满足味蕾探索");
    if (dna.pace === "慢慢体验") reasons.push("每天不超过 3 个核心景点，预留充足自由时间");
    if (dna.avoid.includes("人多")) reasons.push("避开人流密集景区，选择小众深度打卡点");
    if (dna.hotel === "特色民宿") reasons.push("住宿推荐当地特色民宿，沉浸式文化体验");
  }
  reasons.push("路线经 ReviewAgent 合理性检查，驾驶时间可控");
  reasons.push("预算精确到交通、住宿、餐饮、门票明细");
  return reasons;
}

function buildDNAMatch(dna: TravelDNA | null): { trait: string; match: string }[] {
  if (!dna) return [];
  return [
    { trait: "旅行风格", match: dna.style },
    { trait: "节奏偏好", match: dna.pace === "慢慢体验" ? "慢节奏 · 深度体验" : dna.pace === "快速探索" ? "快节奏 · 高效覆盖" : "适中节奏" },
    { trait: "住宿偏好", match: dna.hotel },
    { trait: "避雷清单", match: dna.avoid.slice(0, 3).join("、") },
  ];
}

function ReportContent() {
  const router = useRouter();
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [budget, setBudget] = useState<BudgetBreakdown | null>(null);
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [dna, setDNA] = useState<TravelDNA | null>(null);
  const [profile, setProfile] = useState<PersonalityProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const rawPlans = sessionStorage.getItem("s3-plans");
    if (!rawPlans) { router.push("/planning"); return; }

    try {
      const plans: TripPlan[] = JSON.parse(rawPlans);
      const urlPlanIdx = Number(new URLSearchParams(window.location.search).get("plan")) || 0;
      const idx = Math.min(urlPlanIdx, plans.length - 1);
      setPlan(plans[idx]);

      const rawBudgets = sessionStorage.getItem("s3-budgets");
      const rawReviews = sessionStorage.getItem("s3-reviews");
      if (rawBudgets) {
        const budgets: BudgetBreakdown[] = JSON.parse(rawBudgets);
        setBudget(budgets[idx] || null);
      }
      if (rawReviews) {
        const reviews: ReviewResult[] = JSON.parse(rawReviews);
        setReview(reviews[idx] || null);
      }

      const savedDNA = Memory.getDNA();
      if (savedDNA) setDNA(savedDNA);
      const savedProfile = Memory.getProfile();
      if (savedProfile) setProfile(savedProfile);
    } catch { router.push("/planning"); }
    setLoading(false);
  }, [router]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] gap-4">
        <p className="text-muted-foreground">暂无旅行数据</p>
        <Link href="/planning"><Button size="sm">开始规划</Button></Link>
      </div>
    );
  }

  const whyReasons = buildWhyReasons(plan, dna);
  const dnaMatch = buildDNAMatch(dna);

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <Link href={"/trip?plan=0"}>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />返回行程
          </Button>
        </Link>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-xs gap-1"><Download className="h-3 w-3" />导出</Button>
          <Button variant="ghost" size="sm" className="text-xs gap-1"><Share2 className="h-3 w-3" />分享</Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Hero */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/30 px-4 py-1.5 text-sm text-muted-foreground mb-4">
            <Sparkles className="h-3.5 w-3.5" />AI 旅行报告
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{plan.title}</h1>
          <p className="text-sm text-muted-foreground mt-2">{plan.suitableFor} · {plan.route.length} 天深度游</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: CalendarDays, label: "天数", value: plan.route.length + " 天" },
            { icon: Wallet, label: "总预算", value: "¥" + (budget?.total || plan.budget).toLocaleString() },
            { icon: TrendingUp, label: "AI评分", value: plan.score + " 分" },
          ].map((stat) => (
            <Card key={stat.label} className="text-center">
              <CardContent className="p-3">
                <stat.icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tags + Desc */}
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">{plan.desc}</p>
            <div className="flex flex-wrap gap-1.5">
              {plan.tags.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
            </div>
          </CardContent>
        </Card>

        {/* Why this plan */}
        <WhyCard
          title="AI 为什么推荐这个方案"
          reasons={whyReasons}
          dnaMatch={dnaMatch}
          score={plan.score}
        />

        {/* Budget breakdown */}
        {budget && (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                预算明细
              </h3>
              <div className="grid grid-cols-5 gap-2 text-center">
                {[
                  { label: "交通", val: budget.transport },
                  { label: "住宿", val: budget.hotel },
                  { label: "餐饮", val: budget.food },
                  { label: "门票", val: budget.ticket },
                  { label: "其他", val: budget.other },
                ].map((item) => (
                  <div key={item.label} className="p-2 rounded-lg bg-muted/30">
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-semibold mt-0.5">¥{item.val}</p>
                  </div>
                ))}
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">总计</span>
                <span className="font-bold text-lg">¥{budget.total.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Route overview */}
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              路线总览
            </h3>
            <div className="relative">
              {plan.route.map((day, i) => {
                const isLast = i === plan.route.length - 1;
                return (
                  <div key={i} className="relative flex gap-3 pb-4">
                    {!isLast && <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />}
                    <div
                      className="relative z-10 mt-0.5 h-[22px] w-[22px] shrink-0 rounded-full border-2 border-background flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ background: dayColors[i % dayColors.length] }}
                    >
                      {day.day}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium">{day.location}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {day.activities.slice(0, 3).join(" · ")}
                        {day.activities.length > 3 && " · +" + (day.activities.length - 3)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Review warnings */}
        {review && review.warnings.length > 0 && (
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4">
              <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-500" />
                ReviewAgent 检查 · {review.score} 分
              </h3>
              {review.warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-600">⚠️ {w}</p>
              ))}
              {review.suggestions.map((s, i) => (
                <p key={i} className="text-xs text-muted-foreground">💡 {s}</p>
              ))}
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <div className="flex gap-3 pt-4">
          <Link href="/trip?plan=0" className="flex-1">
            <Button variant="outline" className="w-full gap-1.5 text-xs">
              <MapPin className="h-3.5 w-3.5" />查看详细行程
            </Button>
          </Link>
          <Link href="/journey?day=0" className="flex-1">
            <Button className="w-full gap-1.5 text-xs">
              <Sparkles className="h-3.5 w-3.5" />进入 Journey
            </Button>
          </Link>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/50 pb-8">
          Travel Copilot · AI 旅行决策助手 · L1 MVP
        </p>
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[calc(100vh-4rem)]" />}>
      <ReportContent />
    </Suspense>
  );
}
