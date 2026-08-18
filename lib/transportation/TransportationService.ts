// ============================================================
// TransportationService — 协调多个 TransportationProvider
// 只做候选数据聚合与错误隔离，不做 AI 推荐决策。
// ============================================================

import type { TripBrief } from "@/types/trip";
import { getTravelerCount } from "@/types/trip";
import type {
  TransportationOption,
  TransportationSearchRequest,
  TransportationSearchResult,
  TransportationProviderError,
  TransportationProviderStatus,
  TransportationSortBy,
} from "@/types/transportation";
import type { TransportationProvider } from "./interfaces/TransportationProvider";
import { FlightProvider } from "./providers/FlightProvider";
import { RailProvider } from "./providers/RailProvider";
import { BusProvider } from "./providers/BusProvider";
import { SelfDriveProvider } from "./providers/SelfDriveProvider";

export class TransportationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransportationValidationError";
  }
}

export function validateTransportationSearchRequest(
  request: TransportationSearchRequest
): void {
  const missing: string[] = [];
  if (!request.origin?.trim()) missing.push("origin");
  if (!request.destination?.trim()) missing.push("destination");
  if (!request.departureDate?.trim()) missing.push("departureDate");
  if (!Number.isFinite(request.passengerCount) || request.passengerCount < 1) {
    missing.push("passengerCount");
  }

  if (missing.length > 0) {
    throw new TransportationValidationError("缺少必要旅行信息: " + missing.join(", "));
  }
}

// 出发地/目的地/日期/人数只能来自 TripBrief，绝不自行猜测。
export function buildSearchRequestFromTripBrief(
  brief: TripBrief
): TransportationSearchRequest {
  const origin = (brief?.origin || "").trim();
  const destination = (brief?.destination || "").trim();
  const departureDate = (brief?.startDate || "").trim();
  const returnDate = (brief?.endDate || "").trim() || undefined;
  const passengerCount = getTravelerCount(brief?.travelers);

  const missing: string[] = [];
  if (!origin) missing.push("origin");
  if (!destination) missing.push("destination");
  if (!departureDate) missing.push("departureDate");
  if (passengerCount < 1) missing.push("passengerCount");

  if (missing.length > 0) {
    throw new TransportationValidationError("缺少必要旅行信息: " + missing.join(", "));
  }

  return {
    origin,
    destination,
    departureDate,
    returnDate,
    passengerCount,
    durationDays: brief.duration || undefined,
  };
}

export function defaultTransportationProviders(): TransportationProvider[] {
  return [
    new FlightProvider(),
    new RailProvider(),
    new BusProvider(),
    new SelfDriveProvider(),
  ];
}

function durationToMinutes(duration: string): number {
  if (!duration) return 0;
  const hours = Number(duration.match(/(\d+(?:\.\d+)?)\s*(?:小时|h)/i)?.[1] || 0);
  const minutes = Number(duration.match(/(\d+)\s*(?:分钟|分|m)/i)?.[1] || 0);
  return Math.round(hours * 60 + minutes);
}

export function dedupeTransportationOptions(
  options: TransportationOption[]
): TransportationOption[] {
  const seen = new Set<string>();
  const result: TransportationOption[] = [];
  for (const option of options) {
    const key = [
      option.type,
      option.provider,
      option.origin,
      option.destination,
      option.departureTime,
      option.passengerCount,
      option.price.totalPrice,
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(option);
  }
  return result;
}

export function sortTransportationOptions(
  options: TransportationOption[],
  sortBy: TransportationSortBy = "price"
): TransportationOption[] {
  const sorted = [...options];
  if (sortBy === "departureTime") {
    sorted.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
  } else if (sortBy === "duration") {
    sorted.sort(
      (a, b) =>
        (a.durationMinutes ?? durationToMinutes(a.duration)) -
        (b.durationMinutes ?? durationToMinutes(b.duration))
    );
  } else {
    sorted.sort((a, b) => a.price.totalPrice - b.price.totalPrice);
  }
  return sorted;
}

export class TransportationService {
  private providers: TransportationProvider[];

  constructor(providers: TransportationProvider[] = defaultTransportationProviders()) {
    this.providers = providers;
  }

  // 部分 Provider 失败不影响其他 Provider 的结果。
  async search(request: TransportationSearchRequest): Promise<TransportationSearchResult> {
    validateTransportationSearchRequest(request);

    const searchedAt = new Date().toISOString();
    const preferredTypes =
      request.preferredTypes && request.preferredTypes.length > 0
        ? request.preferredTypes
        : undefined;

    const activeProviders = preferredTypes
      ? this.providers.filter((provider) =>
          provider.types.some((type) => preferredTypes.includes(type))
        )
      : [...this.providers];

    const settled = await Promise.allSettled(
      activeProviders.map((provider) => provider.search(request))
    );

    const options: TransportationOption[] = [];
    const errors: TransportationProviderError[] = [];
    const providerStatus: TransportationProviderStatus[] = [];

    settled.forEach((result, index) => {
      const provider = activeProviders[index];
      if (result.status === "fulfilled") {
        const found = result.value;
        options.push(...found);
        providerStatus.push({
          provider: provider.providerName,
          types: provider.types,
          status: found.length > 0 ? "OK" : "NO_DATA",
          message: found.length > 0 ? "找到 " + found.length + " 个方案" : "暂无实时数据",
          searchedAt,
        });
      } else {
        const message =
          result.reason instanceof Error ? result.reason.message : "交通数据查询失败";
        errors.push({
          provider: provider.providerName,
          type: provider.types[0],
          code: "PROVIDER_ERROR",
          message,
        });
        providerStatus.push({
          provider: provider.providerName,
          types: provider.types,
          status: "ERROR",
          message,
          searchedAt,
        });
      }
    });

    return {
      options: dedupeTransportationOptions(options),
      providerStatus,
      errors,
      searchedAt,
    };
  }
}