"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Loader2, MapPin, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AgentStatusList } from "@/components/AgentStatus";
import { TravelController } from "@/agents/TravelAgentController";
import { TravelDNA, AgentStep } from "@/types/travel";

const DNA_STORAGE_KEY = "travel-dna";
const S3_PLANS_KEY = "s3-plans";
const S3_BUDGETS_KEY = "s3-budgets";
const S3_REVIEWS_KEY = "s3-reviews";
const S3_DECISIONS_KEY = "s3-decisions";

export default function PlanningPage() {
  const router = useRouter();
  const [dna, setDNA] = useState<TravelDNA | null>(null);
  const [dest, setDest] = useState("");
  const [days, setDays] = useState("7");
  const [started, setStarted] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem(DNA_STORAGE_KEY);
    if (!raw) { router.push("/dna"); return; }
    try {
      const p: TravelDNA = JSON.parse(raw);
      setDNA(p);
      if (p.destination) setDest(p.destination);
    } catch { router.push("/dna"); }
  }, []);

  const handleStart = async () => {
    if (!dest.trim() || !dna) return;
    setStarted(true);
    setError("");

    // Clear old Sprint 2 data
    sessionStorage.removeItem("travel-plans");
    sessionStorage.removeItem("travel-profile");

    const ctrl = new TravelController();
    ctrl.addProgressListener((s) => setSteps(s));

    try {
      const result = await ctrl.run(dest.trim(), Number(days) || 7);
      sessionStorage.setItem(S3_PLANS_KEY, JSON.stringify(result.plans));
      sessionStorage.setItem(S3_BUDGETS_KEY, JSON.stringify(result.budgets));
      sessionStorage.setItem(S3_REVIEWS_KEY, JSON.stringify(result.reviews));
      sessionStorage.setItem(S3_DECISIONS_KEY, JSON.stringify(result.decisions));
      setTimeout(() => setDone(true), 500);
    } catch (e: any) {
      setError(e.message || "Agent pipeline failed");
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] gap-4">
        <p className="text-red-500">{error}</p>
        <Button onClick={() => { setStarted(false); setError(""); setSteps([]); }}>重试</Button>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
        <div className="w-full max-w-sm">
          {dna && (
            <div className="flex justify-center gap-1.5 mb-8 flex-wrap">
              <Badge variant="secondary" className="text-xs">{dna.style}</Badge>
              <Badge variant="secondary" className="text-xs">{dna.pace}</Badge>
              <Badge variant="outline" className="text-xs">{dna.hotel}</Badge>
            </div>
          )}
          <h1 className="text-2xl font-bold text-center mb-2">想去哪里？</h1>
          <p className="text-sm text-muted-foreground text-center mb-8">告诉 AI 你的目的地和天数，5 个 Agent 为你规划</p>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                <MapPin className="h-3 w-3" /> 目的地
              </label>
              <Input
                placeholder="例如：新疆、云南、日本"
                value={dest}
                onChange={(e) => setDest(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
                className="h-12 text-lg"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                <Calendar className="h-3 w-3" /> 旅行天数
              </label>
              <div className="flex gap-2">
                {["3", "5", "7", "10"].map((d) => (
                  <button key={d} onClick={() => setDays(d)}
                    className={"px-4 py-2 rounded-lg text-sm border transition-all " + (days === d ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:border-primary/50")}>
                    {d} 天
                  </button>
                ))}
              </div>
            </div>
            <Button size="lg" className="w-full gap-2" disabled={!dest.trim()} onClick={handleStart}>
              <Sparkles className="h-4 w-4" /> 开始 AI 规划
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center gap-1.5 mb-6 flex-wrap">
          <Badge variant="outline" className="text-xs">{dest} · {days}天</Badge>
          {dna && <Badge variant="secondary" className="text-xs">Sprint 3 · 5 Agent</Badge>}
        </div>
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/30 px-4 py-1.5 text-sm text-muted-foreground mb-4">
            <Sparkles className="h-3.5 w-3.5" /> Agent 协作中...
          </div>
        </div>
        {steps.length > 0 ? <AgentStatusList steps={steps} /> : (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>
        )}
        {done && (
          <div className="mt-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Button size="lg" onClick={() => router.push("/plans")} className="gap-2">
              <Sparkles className="h-4 w-4" /> 查看 3 个方案 + 决策建议 <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
