// GET /api/travel/map/geocode?address=乌鲁木齐
import { NextRequest, NextResponse } from "next/server";
import { getTravelDataService, travelDataErrorResponse } from "@/lib/travel-data/server";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address") || "";
  if (!address.trim()) {
    return NextResponse.json(
      { error: { status: 400, message: "缺少 address 参数", provider: "AMAP" } },
      { status: 400 }
    );
  }

  try {
    const service = getTravelDataService();
    const result = await service.geocode(address.trim());
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
