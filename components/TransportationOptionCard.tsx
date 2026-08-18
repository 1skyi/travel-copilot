"use client";

import { Plane, Train, Bus, Car, Clock, MapPin, CheckCircle2, Database } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TransportationOption, TransportationType } from "@/types/transportation";
import {
  TRANSPORTATION_TYPE_LABELS,
  TRANSPORTATION_STATUS_LABELS,
} from "@/types/transportation";

const TYPE_ICON: Record<TransportationType, typeof Plane> = {
  flight: Plane,
  high_speed_rail: Train,
  train: Train,
  bus: Bus,
  self_drive: Car,
};

interface TransportationOptionCardProps {
  option: TransportationOption;
  selected: boolean;
  onSelect: (option: TransportationOption) => void;
}

export function TransportationOptionCard({
  option,
  selected,
  onSelect,
}: TransportationOptionCardProps) {
  const Icon = TYPE_ICON[option.type];
  const unitPrice = option.price.unitPrice;
  const isEstimated = option.status === "ESTIMATED";

  return (
    <button
      type="button"
      onClick={() => onSelect(option)}
      className={cn(
        "w-full rounded-2xl border p-4 text-left transition-all",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border hover:border-primary/40 hover:bg-muted/10"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/40">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">
                {TRANSPORTATION_TYPE_LABELS[option.type]}
              </p>
              <Badge variant="outline" className="text-[9px]">
                {TRANSPORTATION_STATUS_LABELS[option.status]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {option.origin} → {option.destination}
            </p>
          </div>
        </div>
        {selected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3 w-3" />
          {option.departureTime} → {option.arrivalTime}
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {option.duration}
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-lg font-bold">
            ¥{option.price.totalPrice.toLocaleString()}
            <span className="text-[10px] font-normal text-muted-foreground">
              {unitPrice !== null ? " / 人" : " / 全程"}
            </span>
          </p>
          {isEstimated && (
            <p className="text-[10px] text-amber-600">⚠️ 估算，实际以购买时为准</p>
          )}
          {option.type === "self_drive" && (
            <p className="text-[10px] text-muted-foreground">
              单车全程价 · 按车计价，不按人数分摊
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Database className="h-3 w-3" />
          {option.dataSource}
        </div>
      </div>
    </button>
  );
}