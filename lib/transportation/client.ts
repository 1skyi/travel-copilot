// ============================================================
// Transportation client helper — 前端入口
// 前端不直接调用第三方交通 API；自驾距离/时长来自高德 Web Service API Route。
// ============================================================

import type { TripBrief } from "@/types/trip";
import type { TransportationSearchResult } from "@/types/transportation";
import {
  TransportationService,
  buildSearchRequestFromTripBrief,
  dedupeTransportationOptions,
} from "./TransportationService";
import { fetchRoute } from "@/lib/travel-data/client";

export async function searchTransportationForBrief(
  brief: TripBrief
): Promise<TransportationSearchResult> {
  const request = buildSearchRequestFromTripBrief(brief);

  // 自驾需要真实起终点距离与预计时长；高德路线失败时不伪造，只让自驾 Provider 返回 NO_DATA。
  try {
    const amapRoute = await fetchRoute(brief.origin, brief.destination, "DRIVING");
    if (amapRoute.distance.value > 0) {
      request.distanceKm = amapRoute.distance.value / 1000;
    }
    if (amapRoute.duration.value > 0) {
      request.routeDurationSeconds = amapRoute.duration.value;
    }
  } catch {
    request.distanceKm = undefined;
    request.routeDurationSeconds = undefined;
  }

  request.durationDays = brief.duration || undefined;

  const returnRequest: typeof request = {
    ...request,
    origin: brief.destination,
    destination: brief.origin,
    departureDate: brief.endDate || brief.startDate,
    returnDate: undefined,
    // 返程自驾独立请求高德返程路线（距离/时长可能与去程不同），失败时不伪造。
    distanceKm: undefined,
    routeDurationSeconds: undefined,
  };
  try {
    const returnRoute = await fetchRoute(brief.destination, brief.origin, "DRIVING");
    if (returnRoute.distance.value > 0) {
      returnRequest.distanceKm = returnRoute.distance.value / 1000;
    }
    if (returnRoute.duration.value > 0) {
      returnRequest.routeDurationSeconds = returnRoute.duration.value;
    }
  } catch {
    // 返程高德路线失败：自驾 Provider 返回 NO_DATA，其他交通方式不受影响
  }

  const service = new TransportationService();
  const [outboundResult, returnResult] = await Promise.all([
    service.search(request),
    service.search(returnRequest),
  ]);

  return {
    options: dedupeTransportationOptions([
      ...outboundResult.options,
      ...returnResult.options,
    ]),
    providerStatus: outboundResult.providerStatus,
    errors: [...outboundResult.errors, ...returnResult.errors],
    searchedAt: new Date().toISOString(),
  };
}