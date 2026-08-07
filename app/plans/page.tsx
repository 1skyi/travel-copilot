"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Wallet, Star, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TravelPlan, PersonalityProfile } from "@/types/travel";

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<TravelPlan[]>([]);
  const [profile, setProfile] = useState<PersonalityProfile | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const rawPlans = sessionStorage.getItem("travel-plans");
    const rawProfile = sessionStorage.getItem("travel-profile");
    if (!rawPlans) { router.push("/planning"); return; }
    try {
      setPlans(JSON.parse(rawPlans));
      if (rawProfile) setProfile(JSON.parse(rawProfile));
    } catch { router.push("/planning"); }
  }, [router]);

  if (plans.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            {profile ? profile.persona + " · " : ""}为你生成 {plans.length} 个方案
          </h1>
          <p className="text-sm text-muted-foreground mt-2">AI 多 Agent 协作完成，基于你的旅行 DNA 精准匹配</p>
        </div>

        <div className="space-y-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className={"cursor-pointer transition-all hover:shadow-md " + (selected === plan.id ? "ring-2 ring-primary shadow-md" : "")}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold">{plan.name}</span>
                      <Badge variant="secondary" className="text-[10px]">{plan.tag}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.desc}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="h-4 w-4 fill-amber-500" />
                      <span className="text-lg font-bold">{plan.rating}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">评分</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Wallet className="h-3.5 w-3.5" />
                    {plan.budget}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {plan.days.length} 天行程
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {plan.features.map((f) => (
                    <span key={f} className="px-2 py-0.5 text-xs rounded-md bg-muted text-muted-foreground">{f}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selected && (
          <div className="mt-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Button size="lg" onClick={() => router.push("/trip")} className="gap-2">
              <MapPin className="h-4 w-4" />
              查看行程详情
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
