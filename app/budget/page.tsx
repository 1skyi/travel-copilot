"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Plane, BedDouble, Utensils, Ticket, Bus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TransportationSelector } from "@/components/TransportationSelector";
import { AccommodationSelector } from "@/components/AccommodationSelector";
import { FoodSelector } from "@/components/FoodSelector";
import { ActivitySelector } from "@/components/ActivitySelector";
import { LocalTransportSelector } from "@/components/LocalTransportSelector";
import { BudgetSummaryCard } from "@/components/BudgetSummaryCard";
import { BudgetEngine } from "@/agents/BudgetEngine";
import type { TripPlan } from "@/types/plan";
import type { TripBrief } from "@/types/trip";
import type { TravelDNA } from "@/types/travel";
import type { UserSelections } from "@/types/budget";
import type { TransportationSelection } from "@/types/transportation";

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof Plane;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/40">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-sm font-bold">{title}</h2>
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function BudgetPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planIdx = Number(searchParams.get("plan")) || 0;

  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [brief, setBrief] = useState<TripBrief | null>(null);
  const [dna, setDNA] = useState<TravelDNA | null>(null);
  const [selections, setSelections] = useState<UserSelections | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const rawPlans = sessionStorage.getItem("s3-plans");
      const rawBrief = sessionStorage.getItem("s3-brief");
      const rawDNA = localStorage.getItem("travel-dna");

      if (!rawPlans || !rawBrief) {
        router.push("/planning");
        return;
      }

      try {
        const plans: TripPlan[] = JSON.parse(rawPlans);
        const parsedBrief: TripBrief = JSON.parse(rawBrief);
        const parsedDNA: TravelDNA | null = rawDNA ? JSON.parse(rawDNA) : null;
        const idx = Math.min(Math.max(planIdx, 0), plans.length - 1);
        const selectedPlan = plans[idx];

        const engine = new BudgetEngine();
        const rawSelections = sessionStorage.getItem("s3-user-selections");
        const rawTransportSelection = sessionStorage.getItem("s3-transportation-selection");
        const transportSelection: TransportationSelection = rawTransportSelection
          ? JSON.parse(rawTransportSelection)
          : { outbound: null, return: null };
        let nextSelections: UserSelections | null = null;
        if (rawSelections) {
          const parsed: UserSelections = JSON.parse(rawSelections);
          if (parsed.planId === selectedPlan.id) nextSelections = parsed;
        }
        const selectionWithTransport = await engine.createDefaultSelectionsWithTransportationAsync(
          selectedPlan,
          parsedBrief,
          parsedDNA,
          transportSelection
        );
        nextSelections = nextSelections
          ? { ...nextSelections, transportSelections: selectionWithTransport.transportSelections }
          : selectionWithTransport;

        if (cancelled) return;
        setPlan(selectedPlan);
        setBrief(parsedBrief);
        setDNA(parsedDNA);
        setSelections(nextSelections);
      } catch {
        if (!cancelled) router.push("/planning");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, planIdx]);

  const summary = useMemo(() => {
    if (!plan || !brief || !selections) return null;
    return new BudgetEngine().calculate(brief, selections);
  }, [plan, brief, selections]);

  if (!plan || !brief || !selections) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const updateSelections = (patch: Partial<UserSelections>) => {
    setSelections((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const handleSave = () => {
    if (!selections || !summary) return;
    setSaving(true);
    sessionStorage.setItem("s3-user-selections", JSON.stringify(selections));
    sessionStorage.setItem("s3-budget-summary", JSON.stringify(summary));
    router.push("/trip?plan=" + planIdx);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/plans">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
              <ArrowLeft className="h-3.5 w-3.5" />
              返回方案选择
            </Button>
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            决策预算 · {plan.title}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <SectionCard icon={Plane} title="长途交通" subtitle="去程与返程 · 价格为每人 AI 估算">
              <TransportationSelector
                segments={selections.transportSelections}
                onChange={(transportSelections) => updateSelections({ transportSelections })}
              />
              <div className="mt-3">
                <Link href={"/transportation?plan=" + planIdx}>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <RefreshCw className="h-3 w-3" />
                    重新选择交通方案
                  </Button>
                </Link>
              </div>
            </SectionCard>

            <SectionCard icon={BedDouble} title="住宿" subtitle="按行程停留段选择档位 · 价格为每间每晚">
              <AccommodationSelector
                selections={selections.accommodationSelections}
                onChange={(accommodationSelections) => updateSelections({ accommodationSelections })}
              />
            </SectionCard>

            <SectionCard icon={Utensils} title="餐饮" subtitle="每人每天餐标区间">
              <FoodSelector
                options={selections.foodOptions}
                selectedId={selections.foodPreferenceId}
                onChange={(foodPreferenceId) => updateSelections({ foodPreferenceId })}
              />
            </SectionCard>

            <SectionCard icon={Ticket} title="门票/活动" subtitle="勾选本次要包含的项目">
              <ActivitySelector
                selection={selections.activitySelections}
                onChange={(activitySelections) => updateSelections({ activitySelections })}
              />
            </SectionCard>

            <SectionCard icon={Bus} title="当地交通" subtitle="城市间与日常接驳方式">
              <LocalTransportSelector
                options={selections.localTransportOptions}
                selectedId={selections.localTransportId}
                onChange={(localTransportId) => updateSelections({ localTransportId })}
              />
            </SectionCard>
          </div>

          <div>
            {summary && (
              <BudgetSummaryCard summary={summary} onSave={handleSave} saving={saving} />
            )}
            <p className="mt-3 flex items-center justify-center gap-1 text-[10px] text-muted-foreground/50">
              <Badge variant="outline" className="text-[9px]">AI 估算</Badge>
              当前分项均为估算，接入真实数据源后自动替换
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BudgetPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[calc(100vh-4rem)]" />}>
      <BudgetPageContent />
    </Suspense>
  );
}
