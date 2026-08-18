// ============================================================
// 纯函数工具 — 无副作用，便于单元测试
// ============================================================

import type { RoutePoint } from "@/types/location";

// 解析高德 "lng,lat" 字符串
export function parseLngLat(str: string): { longitude: number; latitude: number } | null {
  if (!str) return null;
  const parts = str.split(",");
  if (parts.length < 2) return null;
  const longitude = Number(parts[0]);
  const latitude = Number(parts[1]);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
  return { longitude, latitude };
}

// 校验经纬度范围
export function isValidLngLat(longitude: number, latitude: number): boolean {
  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}

// 解码高德 Web Service 路线 step.polyline（"lng,lat;lng,lat;..."）
export function decodeAmapPolyline(polyline: string): RoutePoint[] {
  if (!polyline) return [];
  const points: RoutePoint[] = [];
  for (const segment of polyline.split(";")) {
    const parsed = parseLngLat(segment);
    if (parsed && isValidLngLat(parsed.longitude, parsed.latitude)) {
      points.push({ longitude: parsed.longitude, latitude: parsed.latitude });
    }
  }
  return points;
}

// 缓存键
export function buildCacheKey(operation: string, ...parts: (string | number)[]): string {
  return [operation, ...parts.map((p) => String(p))].join(":");
}

// 地点名清洗：处理 "伊宁 → 那拉提"、"乌市" 缩写与易歧义地名。
// 歧义地名映射到高德可正确定位的名称（仅影响 Geocoding，Timeline 展示原名）。
const GEOCODE_DISAMBIGUATION: Record<string, string> = {
  // "青海湖" 会被高德模糊匹配到乌鲁木齐的同名小区，需指定到共和县
  "青海湖": "共和县青海湖",
};

export function sanitizeLocationName(name: string): string {
  if (!name) return "";
  const parts = name.split("→").map((p) => p.trim()).filter(Boolean);
  const last = parts[parts.length - 1] || "";
  if (last === "乌市") return "乌鲁木齐";
  return GEOCODE_DISAMBIGUATION[last] ?? last;
}

// 距离格式化
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return "—";
  if (meters >= 1000) {
    const km = meters / 1000;
    return (km >= 100 ? Math.round(km) : Math.round(km * 10) / 10) + " km";
  }
  return Math.round(meters) + " m";
}

// 时长格式化
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return minutes + " 分钟";
  if (minutes === 0) return hours + " 小时";
  return hours + " 小时 " + minutes + " 分钟";
}
