"use client";

import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentStep, AgentStatus } from "@/types/travel";

interface AgentStatusProps {
  steps: AgentStep[];
}

const statusIcon: Record<AgentStatus, React.ElementType | null> = {
  idle: null,
  thinking: Loader2,
  done: CheckCircle2,
  error: AlertCircle,
};

const statusColor: Record<AgentStatus, string> = {
  idle: "text-muted-foreground/30",
  thinking: "text-primary",
  done: "text-green-500",
  error: "text-red-500",
};

export function AgentStatusList({ steps }: AgentStatusProps) {
  return (
    <div className="space-y-1">
      {steps.map((step) => {
        const Icon = statusIcon[step.status];
        return (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
              step.status === "thinking" && "bg-accent/50",
              step.status === "idle" && "opacity-30"
            )}
          >
            {Icon ? (
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  statusColor[step.status],
                  step.status === "thinking" && "animate-spin"
                )}
              />
            ) : (
              <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/20 shrink-0" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono">{step.agentName}</span>
              </div>
              <p className={cn("text-sm", step.status === "idle" ? "text-muted-foreground" : "text-foreground")}>
                {step.message}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
