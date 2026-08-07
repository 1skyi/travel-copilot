"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Check, X, ArrowRight, AlertCircle, TrendingUp, DollarSign, Compass } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const decisions = [
  {
    id: "transport",
    icon: Compass,
    title: "推荐交通方式：租车",
    why: "符合你的慢旅行偏好，可以随时停车拍照",
    impact: [
      { label: "预算", value: "+800", icon: DollarSign, negative: true },
      { label: "自由度", value: "+40%", icon: TrendingUp, negative: false },
    ],
  },
  {
    id: "hotel",
    icon: Sparkles,
    title: "推荐住宿：赛里木湖畔民宿",
    why: "日出日落绝佳机位，评分 4.8",
    impact: [
      { label: "预算", value: "+500", icon: DollarSign, negative: true },
      { label: "体验", value: "+60%", icon: TrendingUp, negative: false },
    ],
  },
  {
    id: "food",
    icon: AlertCircle,
    title: "风险提示：天山路段",
    why: "9月可能有降雪，建议备选路线",
    impact: [
      { label: "风险", value: "中等", icon: AlertCircle, negative: true },
    ],
  },
];

export default function DecisionPage() {
  const [statuses, setStatuses] = useState<Record<string, "accepted" | "rejected" | null>>({});

  const handleAccept = (id: string) => setStatuses({ ...statuses, [id]: "accepted" });
  const handleReject = (id: string) => setStatuses({ ...statuses, [id]: "rejected" });

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-4rem)] px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/30 px-4 py-1.5 text-sm text-muted-foreground mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            AI 关键推荐
          </div>
          <h1 className="text-2xl font-bold">优化你的行程</h1>
          <p className="text-sm text-muted-foreground mt-2">AI 发现了一些可以提升体验的建议</p>
        </div>

        <div className="space-y-4">
          {decisions.map((d) => {
            const Icon = d.icon;
            const status = statuses[d.id];

            return (
              <Card
                key={d.id}
                className={
                  "transition-all " +
                  (status === "accepted" ? "ring-2 ring-green-500/30 border-green-500/30" : "") +
                  (status === "rejected" ? "opacity-50" : "")
                }
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold">{d.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        <span className="text-muted-foreground/70">为什么：</span>
                        {d.why}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {d.impact.map((imp, i) => {
                      const ImpIcon = imp.icon;
                      return (
                        <Badge
                          key={i}
                          variant="outline"
                          className={
                            "text-[10px] gap-1 " +
                            (imp.negative ? "text-red-500 border-red-200" : "text-green-500 border-green-200")
                          }
                        >
                          <ImpIcon className="h-2.5 w-2.5" />
                          {imp.label} {imp.value}
                        </Badge>
                      );
                    })}
                  </div>

                  {status === null ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 flex-1"
                        onClick={() => handleAccept(d.id)}
                      >
                        <Check className="h-3.5 w-3.5" />
                        接受
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 flex-1"
                        onClick={() => handleReject(d.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                        换方案
                      </Button>
                    </div>
                  ) : status === "accepted" ? (
                    <div className="flex items-center gap-1.5 text-xs text-green-600">
                      <Check className="h-3.5 w-3.5" />
                      已采纳
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <X className="h-3.5 w-3.5" />
                      已跳过
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Link href="/journey">
            <Button size="lg" className="gap-2">
              <Compass className="h-4 w-4" />
              进入 Journey 模式
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
