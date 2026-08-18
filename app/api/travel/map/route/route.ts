// GET /api/travel/map/route?origin=乌鲁木齐&destination=赛里木湖&mode=DRIVING
import { NextRequest, NextResponse } from "next/server";
import { getTravelDataService, travelDataErrorResponse } from "@/lib/travel-data/server";
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
    const service = getTravelDataService();
    // 地点名 → 真实坐标 → 真实路线（全部走高德 Web Service）
    const originLoc = await service.geocode(origin.trim());
    if (!originLoc) {
      return NextResponse.json(
        { error: { status: 404, message: "暂无真实数据", provider: "AMAP" } },
        { status: 404 }
      );
    }
    const destLoc = await service.geocode(destination.trim());
    if (!destLoc) {
      return NextResponse.json(
        { error: { status: 404, message: "暂无真实数据", provider: "AMAP" } },
        { status: 404 }
      );
    }
    const result = await service.route(originLoc, destLoc, modeParam as RouteMode);
    if (!result) {
      return NextResponse.json(
        { error: { status: 404, message: "暂无真实数据", provider: "AMAP" } },
        { status: 404 }
      );
    }
    return NextResponse.json(result);
  } catch (e) {
    return travelDataErrorResponse(e);
  }
}
