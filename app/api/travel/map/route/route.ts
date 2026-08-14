// GET /api/travel/map/route?origin=乌鲁木齐&destination=赛里木湖&mode=DRIVING
import { NextRequest, NextResponse } from "next/server";
import { getAmapProvider, travelDataErrorResponse } from "@/lib/travel-data/server";
import type { RouteMode } from "@/types/location";

const VALID_MODES: RouteMode[] = ["DRIVING", "WALKING", "TRANSIT"];

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.searchParams.get("origin") || "";
  const destination = req.nextUrl.searchParams.get("destination") || "";
  const modeParam = (req.nextUrl.searchParams.get("mode") || "DRIVING").toUpperCase();

  if (!origin.trim() || !destination.trim()) {
    return NextResponse.json(
      { error: { status: 400, message: "缺少 origin 或 destination 参数", provider: "AMAP" } },
      { status: 400 }
    );
  }
  if (!VALID_MODES.includes(modeParam as RouteMode)) {
    return NextResponse.json(
      { error: { status: 400, message: "无效的 mode，仅支持 DRIVING/WALKING/TRANSIT", provider: "AMAP" } },
      { status: 400 }
    );
  }

  try {
    const provider = getAmapProvider();
    // 地点名 → 真实坐标 → 真实路线（全部走高德 Web Service）
    const originLoc = await provider.geocode(origin.trim());
    const destLoc = await provider.geocode(destination.trim());
    const result = await provider.route(originLoc, destLoc, modeParam as RouteMode);
    return NextResponse.json(result);
  } catch (e) {
    return travelDataErrorResponse(e);
  }
}
