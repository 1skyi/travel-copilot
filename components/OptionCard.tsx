"use client";

import { cn } from "@/lib/utils";

interface OptionCardProps {
  label: string;
  icon: string;
  desc?: string;
  selected: boolean;
  onClick: () => void;
  variant?: "single" | "multi";
}

export function OptionCard({ label, icon, desc, selected, onClick, variant = "single" }: OptionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left group",
        selected
          ? "border-primary bg-primary/5 shadow-sm"
          : "bg-card hover:border-primary/50 hover:bg-accent/50"
      )}
    >
      <span className="text-2xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <span className={cn("font-medium", selected && "text-primary")}>{label}</span>
        {desc && (
          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
        )}
      </div>
      {variant === "multi" ? (
        <div
          className={cn(
            "h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition-all",
            selected ? "border-primary bg-primary" : "border-muted-foreground/30"
          )}
        >
          {selected && (
            <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      ) : (
        <div
          className={cn(
            "h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-all",
            selected ? "border-primary" : "border-muted-foreground/30"
          )}
        >
          {selected && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
        </div>
      )}
    </button>
  );
}
