"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AgentStatusList } from "@/components/AgentStatus";
import { TravelAgentController } from "@/agents/TravelAgentController";
import { TravelDNA, AgentStep } from "@/types/travel";

const DNA_STORAGE_KEY = "travel-dna";

export default function PlanningPage() {
  const router = useRouter();
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [done, setDone] = useState(false);
  const [dna, setDNA] = useState<TravelDNA | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(DNA_STORAGE_KEY);
    if (!raw) {
      router.push("/dna");
      return;
    }
    try {
      const parsed: TravelDNA = JSON.parse(raw);
      setDNA(parsed);

      const controller = new TravelAgentController();
      controller.addProgressListener((updatedSteps) => {
        setSteps(updatedSteps);
      });

      controller.run(parsed).then((result) => {
        sessionStorage.setItem("travel-plans", JSON.stringify(result.plans));
        sessionStorage.setItem("travel-profile", JSON.stringify(result.profile));
        setTimeout(() => setDone(true), 400);
      });
    } catch {
      router.push("/dna");
    }
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <div className="w-full max-w-md">
        {dna && (
          <div className="flex justify-center gap-1.5 mb-6 flex-wrap">
            <Badge variant="secondary" className="text-xs">{dna.style}</Badge>
            <Badge variant="secondary" className="text-xs">{dna.pace}</Badge>
            <Badge variant="secondary" className="text-xs">{dna.hotel}</Badge>
            {dna.destination && (
              <Badge variant="outline" className="text-xs">{dna.destination}</Badge>
            )}
          </div>
        )}

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/30 px-4 py-1.5 text-sm text-muted-foreground mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            AI Agent 规划中...
          </div>
        </div>

        {steps.length > 0 ? (
          <AgentStatusList steps={steps} />
        ) : (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
        )}

        {done && (
          <div className="mt-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Button size="lg" onClick={() => router.push("/plans")} className="gap-2">
              <Sparkles className="h-4 w-4" />
              查看生成的方案
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
