"use client";

import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationMarkerProps {
  name: string;
  isActive?: boolean;
  isNext?: boolean;
  index?: number;
  color?: string;
  onClick?: () => void;
  className?: string;
}

export function LocationMarker({
  name,
  isActive = false,
  isNext = false,
  index,
  color = "#6366f1",
  onClick,
  className,
}: LocationMarkerProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-2 transition-all",
        className
      )}
    >
      <div className="relative flex-shrink-0">
        {isActive && (
          <div
            className="absolute rounded-full animate-ping opacity-20"
            style={{ width: "32px", height: "32px", left: "-11px", top: "-11px", background: color }}
          />
        )}
        <div
          className={cn(
            "flex items-center justify-center rounded-full border-2 border-background shadow-sm transition-transform",
            isActive ? "h-7 w-7 group-hover:scale-110" : isNext ? "h-5 w-5" : "h-4 w-4",
          )}
          style={{ background: color }}
        >
          {isActive ? (
            <MapPin className="h-3.5 w-3.5 text-white" />
          ) : index !== undefined ? (
            <span className="text-[8px] font-bold text-white">{index}</span>
          ) : null}
        </div>
      </div>

      <span
        className={cn(
          "text-xs transition-colors",
          isActive ? "font-semibold text-foreground" : "text-muted-foreground",
          isNext && "text-foreground font-medium"
        )}
      >
        {name}
      </span>

      {/* Hover tooltip */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <span className="text-[10px] bg-popover border px-1.5 py-0.5 rounded shadow whitespace-nowrap">
          {name}
        </span>
      </div>
    </button>
  );
}
