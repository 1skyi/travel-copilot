"use client";

import { useState } from "react";
import { Check, X, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DecisionOption } from "@/types/plan";

interface DecisionCardProps {
  decision: DecisionOption;
}

export function DecisionCardNew({ decision }: DecisionCardProps) {
  const [status, setStatus] = useState<"accepted" | "rejected" | null>(null);

  return (
    <Card
      className={
        "transition-all " +
        (status === "accepted" ? "ring-2 ring-green-500/30 border-green-500/30" : "") +
        (status === "rejected" ? "opacity-50" : "")
      }
    >
      <CardContent className="p-5">
        <h3 className="text-sm font-bold mb-2">{decision.title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-3">{decision.description}</p>

        {/* Impact */}
        <div className="flex flex-wrap gap-2 mb-4">
          {decision.impact.map((imp, i) => (
            <Badge
              key={i}
              variant="outline"
              className={
                "text-[10px] gap-1 " +
                (imp.positive ? "text-green-500 border-green-200" : "text-red-500 border-red-200")
              }
            >
              {imp.positive ? (
                <TrendingUp className="h-2.5 w-2.5" />
              ) : (
                <TrendingDown className="h-2.5 w-2.5" />
              )}
              {imp.label} {imp.value}
            </Badge>
          ))}
        </div>

        {/* Alternatives */}
        {decision.alternatives.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] text-muted-foreground mb-1.5">其他方案</p>
            <div className="flex flex-wrap gap-1.5">
              {decision.alternatives.map((alt) => (
                <Badge key={alt} variant="outline" className="text-[10px]">
                  {alt}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {status === null ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 flex-1"
              onClick={() => setStatus("accepted")}
            >
              <Check className="h-3.5 w-3.5" />
              接受推荐
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5 flex-1"
              onClick={() => setStatus("rejected")}
            >
              <X className="h-3.5 w-3.5" />
              查看其他方案
            </Button>
          </div>
        ) : status === "accepted" ? (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <Check className="h-3.5 w-3.5" /> 已采纳
          </p>
        ) : (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <X className="h-3.5 w-3.5" /> 已跳过
          </p>
        )}
      </CardContent>
    </Card>
  );
}
