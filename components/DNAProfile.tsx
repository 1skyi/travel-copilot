"use client";

import { Sparkles, ShieldAlert, TrendingUp, Compass } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TravelDNA, PersonalityProfile } from "@/types/travel";

interface DNAProfileProps {
  dna: TravelDNA;
  profile: PersonalityProfile;
}

const labelMap: Record<string, string> = {
  style: "旅行风格",
  pace: "旅行节奏",
  avoid: "不能接受",
  hotel: "住宿偏好",
  interest: "兴趣标签",
  budget: "预算水平",
};

const budgetLabels: Record<string, string> = {
  low: "经济实惠",
  medium: "舒适中等",
  high: "高端体验",
};

export function DNAProfile({ dna, profile }: DNAProfileProps) {
  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      {/* Persona Hero */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardContent className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-4xl">
              {profile.emoji}
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-1">{profile.persona}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{profile.summary}</p>
        </CardContent>
      </Card>

      {/* Strengths & Watch-outs */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              <span className="text-xs font-semibold text-green-600">喜欢</span>
            </div>
            <ul className="space-y-1">
              {profile.strengths.map((s) => (
                <li key={s} className="text-xs text-muted-foreground">{s}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-amber-600">避雷</span>
            </div>
            <ul className="space-y-1">
              {profile.watchOuts.map((w) => (
                <li key={w} className="text-xs text-muted-foreground">{w}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Best Match */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Compass className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold">最佳匹配</span>
          </div>
          <p className="text-sm text-muted-foreground">{profile.bestMatch}</p>
        </CardContent>
      </Card>

      {/* DNA Tags */}
      <div className="space-y-2">
        {["style", "pace", "interest", "hotel", "avoid", "budget"].map((key) => {
          const value = (dna as unknown as Record<string, unknown>)[key];
          if (key === "createdAt" || key === "destination") return null;

          let displayValue = "";
          if (Array.isArray(value)) {
            displayValue = value.join(" · ");
          } else if (key === "budget") {
            displayValue = budgetLabels[String(value)] || String(value);
          } else {
            displayValue = String(value || "");
          }

          if (!displayValue) return null;
          return (
            <div key={key} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
              <span className="text-xs text-muted-foreground">{labelMap[key] || key}</span>
              <Badge variant="secondary" className="text-[10px]">{displayValue}</Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}
