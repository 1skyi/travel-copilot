// GET /api/travel/map/poi?keyword=赛里木湖
import { NextRequest, NextResponse } from "next/server";
import { getTravelDataService, travelDataErrorResponse } from "@/lib/travel-data/server";
import type { GeoLocation } from "@/types/location";

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword") || "";
  if (!keyword.trim()) {
    return NextResponse.json(
      { error: { status: 400, message: "缺少 keyword 参数", provider: "AMAP" } },
      { status: 400 }
    );
  }

  try {
    const service = getTravelDataService();
    let location: GeoLocation | undefined;
    const locationParam = req.nextUrl.searchParams.get("location") || "";
    if (locationParam) {
      const [longitude, latitude] = locationParam.split(",").map(Number);
      if (Number.isFinite(longitude) && Number.isFinite(latitude)) {
        location = {
          id: "search-location",
          name: "当前位置",
          address: "",
          latitude,
          longitude,
          source: "AMAP",
          sourceType: "EXTERNAL_DATA",
          fetchedAt: new Date().toISOString(),
        };
      }
    }
    const result = await service.searchPOI(keyword.trim(), location);
    return NextResponse.json(result);
  } catch (e) {
    return travelDataErrorResponse(e);
  }
}
