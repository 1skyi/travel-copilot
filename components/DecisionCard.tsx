"use client";

import { Brain, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DecisionCardProps {
  title: string;
  reasoning: string;
  options?: { label: string; selected: boolean }[];
  status: "pending" | "decided" | "rejected";
}

const statusConfig = {
  pending: { icon: Loader2, label: "思考中", className: "text-yellow-500", iconClass: "animate-spin" },
  decided: { icon: CheckCircle2, label: "已决策", className: "text-green-500", iconClass: "" },
  rejected: { icon: XCircle, label: "已排除", className: "text-red-500", iconClass: "" },
};

export function DecisionCard({ title, reasoning, options, status }: DecisionCardProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Card className={cn("transition-all duration-300", status === "pending" && "animate-pulse")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <Badge variant="outline" className={cn("flex items-center gap-1", config.className)}>
            <Icon className={cn("h-3 w-3", config.iconClass)} />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      {reasoning && (
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{reasoning}</p>
        </CardContent>
      )}
    </Card>
  );
}
