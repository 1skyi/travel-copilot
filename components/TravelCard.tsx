"use client";

import { MapPin, Sparkles, Clock, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TravelCardProps {
  destination: string;
  subtitle?: string;
  image?: string;
  highlights: string[];
  estimatedCost: string;
  matchScore: number;
  duration: string;
  summary?: string;
  onClick?: () => void;
  selected?: boolean;
  rank?: number;
}

export function TravelCard({
  destination,
  subtitle,
  highlights,
  estimatedCost,
  matchScore,
  duration,
  summary,
  onClick,
  selected,
  rank,
}: TravelCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02]",
        selected && "ring-2 ring-primary shadow-lg"
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {subtitle && (
              <p className="text-xs text-muted-foreground mb-1">{subtitle}</p>
            )}
            <div className="flex items-center gap-2">
              {rank && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {rank}
                </span>
              )}
              <CardTitle className="text-xl">{destination}</CardTitle>
            </div>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            {matchScore}% 匹配
          </Badge>
        </div>
        {summary && (
          <p className="text-sm text-muted-foreground leading-relaxed mt-1">{summary}</p>
        )}
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {duration}
          </span>
          <span className="flex items-center gap-1">
            <Wallet className="h-3.5 w-3.5" />
            {estimatedCost}
          </span>
        </div>

        <div className="space-y-2">
          {highlights.slice(0, 4).map((h, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span>{h}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
