"use client";

import { cn } from "@/lib/utils";
import { MapPin, Utensils, Bus, Coffee } from "lucide-react";

export interface TimelineItem {
  time: string;
  title: string;
  description: string;
  icon?: string;
  type: "activity" | "meal" | "transport" | "rest";
}

interface TimelineProps {
  items: TimelineItem[];
  variant?: "vertical" | "horizontal";
}

const typeConfig = {
  activity: { icon: MapPin, bg: "bg-blue-500/10 text-blue-500", dot: "bg-blue-500" },
  meal: { icon: Utensils, bg: "bg-orange-500/10 text-orange-500", dot: "bg-orange-500" },
  transport: { icon: Bus, bg: "bg-green-500/10 text-green-500", dot: "bg-green-500" },
  rest: { icon: Coffee, bg: "bg-purple-500/10 text-purple-500", dot: "bg-purple-500" },
};

export function Timeline({ items, variant = "vertical" }: TimelineProps) {
  if (variant === "horizontal") {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {items.map((item, i) => {
          const config = typeConfig[item.type];
          const Icon = config.icon;
          return (
            <div key={i} className="flex-shrink-0 w-48">
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl mb-3", config.bg)}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-xs text-muted-foreground mb-1">{item.time}</p>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative">
      {items.map((item, i) => {
        const config = typeConfig[item.type];
        const Icon = config.icon;
        const isLast = i === items.length - 1;

        return (
          <div key={i} className="relative flex gap-4 pb-8">
            {/* Timeline line */}
            {!isLast && (
              <div className="absolute left-[19px] top-10 bottom-0 w-px bg-border" />
            )}

            {/* Dot */}
            <div className={cn("relative z-10 mt-1 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full", config.bg)}>
              <Icon className="h-4 w-4" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-muted-foreground">{item.time}</span>
              </div>
              <h4 className="text-sm font-medium">{item.title}</h4>
              <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{item.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
