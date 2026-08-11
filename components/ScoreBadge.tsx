"use client";

import { Star } from "lucide-react";

interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "lg";
}

export function ScoreBadge({ score, size = "sm" }: ScoreBadgeProps) {
  const stars = score >= 95 ? 5 : score >= 88 ? 4 : 3;
  const color = score >= 95 ? "text-amber-500" : score >= 85 ? "text-amber-400" : "text-amber-300";
  const SIZE = size === "lg" ? "text-lg" : "text-sm";

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={SIZE + " " + (i < stars ? color + " fill-current" : "text-muted/30")}
        />
      ))}
      <span className={SIZE + " font-bold ml-1 " + color}>{score}分</span>
    </div>
  );
}
