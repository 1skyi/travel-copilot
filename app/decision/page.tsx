"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DecisionCardNew } from "@/components/DecisionCardNew";
import { DecisionOption } from "@/types/plan";

export default function DecisionPage() {
  const [decisions, setDecisions] = useState<DecisionOption[]>([]);

  useEffect(() => {
    const raw = sessionStorage.getItem("s3-decisions");
    if (raw) {
      try { setDecisions(JSON.parse(raw)); } catch {}
    }
  }, []);

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-4rem)] px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/30 px-4 py-1.5 text-sm text-muted-foreground mb-4">
            <Sparkles className="h-3.5 w-3.5" />AI 关键推荐
          </div>
          <h1 className="text-2xl font-bold">优化你的行程</h1>
          <p className="text-sm text-muted-foreground mt-2">AI 基于你的 DNA 和路线的决策建议</p>
        </div>

        <div className="space-y-3">
          {decisions.length > 0 ? decisions.map((d) => (
            <DecisionCardNew key={d.id} decision={d} />
          )) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              请先在 /planning 完成 Agent 规划流程
            </p>
          )}
        </div>

        <div className="mt-8 flex justify-center gap-3">
          <Link href="/trip"><Button variant="outline">返回行程</Button></Link>
          <Link href="/journey">
            <Button className="gap-2"><Compass className="h-4 w-4" />进入 Journey<ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
