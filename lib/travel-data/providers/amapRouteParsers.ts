// ============================================================
// Amap route parsers — 纯解析函数，便于单元测试。
// 只处理高德返回的数据结构，不发起网络请求。
// ============================================================

import type { RoutePoint } from "@/types/location";
import { decodeAmapPolyline } from "../utils";

export interface AmapPathRouteResponse {
  route?: {
    paths?: Array<{
      distance?: string | number;
      duration?: string | number;
      steps?: Array<{ polyline?: string }>;
    }>;
  };
}

export interface AmapTransitSegment {
  walking?: {
    steps?: Array<{ polyline?: string }>;
  };
  bus?: {
    buslines?: Array<{ polyline?: string }>;
  };
}

export interface AmapTransitRouteResponse {
  route?: {
    transits?: Array<{
      distance?: string | number;
      duration?: string | number;
      segments?: AmapTransitSegment[];
    }>;
  };
}

export interface AmapRouteNumbers {
  distance: number;
  duration: number;
  polyline: RoutePoint[];
}

function toNonNegativeNumber(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return number;
}

// DRIVING 与 WALKING 共用 paths[0] 结构。
export function parseAmapPathRoute(data: AmapPathRouteResponse): AmapRouteNumbers | null {
  const path = data?.route?.paths?.[0];
  if (!path) return null;

  const distance = toNonNegativeNumber(path.distance);
  const duration = toNonNegativeNumber(path.duration);
  if (distance === null || duration === null) return null;

  const polyline: RoutePoint[] = [];
  for (const step of path.steps || []) {
    polyline.push(...decodeAmapPolyline(step.polyline || ""));
  }
  if (polyline.length === 0) return null;

  return { distance, duration, polyline };
}

// TRANSIT 使用 transits[0].segments，逐段收集步行与公交 polyline。
export function parseAmapTransitRoute(
  data: AmapTransitRouteResponse
): AmapRouteNumbers | null {
  const transit = data?.route?.transits?.[0];
  if (!transit) return null;

  const distance = toNonNegativeNumber(transit.distance);
  const duration = toNonNegativeNumber(transit.duration);
  if (distance === null || duration === null) return null;

  const polyline: RoutePoint[] = [];
  for (const segment of transit.segments || []) {
    const steps = segment.walking?.steps || [];
    for (const step of steps) {
      polyline.push(...decodeAmapPolyline(step.polyline || ""));
    }
    const buslines = segment.bus?.buslines || [];
    for (const busline of buslines) {
      polyline.push(...decodeAmapPolyline(busline.polyline || ""));
    }
  }
  if (polyline.length === 0) return null;

  return { distance, duration, polyline };
}