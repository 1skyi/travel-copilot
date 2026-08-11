"use client";

import { Sparkles, CheckCircle2, Lightbulb } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WhyCardProps {
  title: string;
  reasons: string[];
  dnaMatch?: { trait: string; match: string }[];
  score?: number;
  variant?: "default" | "compact";
}

export function WhyCard({ title, reasons, dnaMatch, score, variant = "default" }: WhyCardProps) {
  if (variant === "compact") {
    return (
      <div className="rounded-xl border bg-muted/20 p-3">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs font-semibold">{title}</span>
        </div>
        <ul className="space-y-1">
          {reasons.slice(0, 3).map((r, i) => (
            <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
              {r}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <Card className="border-primary/10 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold">{title}</h3>
            {score !== undefined && (
              <p className="text-[10px] text-muted-foreground">AI 匹配度 {score}%</p>
            )}
          </div>
          {score !== undefined && (
            <Badge className="ml-auto" variant="secondary">{score}% 匹配</Badge>
          )}
        </div>

        {/* Reasons */}
        <ul className="space-y-2.5 mb-4">
          {reasons.map((reason, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span className="text-muted-foreground leading-relaxed">{reason}</span>
            </li>
          ))}
        </ul>

        {/* DNA Match */}
        {dnaMatch && dnaMatch.length > 0 && (
          <div className="pt-3 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">你的旅行 DNA 匹配</p>
            <div className="space-y-1.5">
              {dnaMatch.map((m, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{m.trait}</span>
                  <span className="font-medium text-primary">{m.match}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
