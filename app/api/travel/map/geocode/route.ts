// GET /api/travel/map/geocode?address=乌鲁木齐
import { NextRequest, NextResponse } from "next/server";
import { getAmapProvider, travelDataErrorResponse } from "@/lib/travel-data/server";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address") || "";
  if (!address.trim()) {
    return NextResponse.json(
      { error: { status: 400, message: "缺少 address 参数", provider: "AMAP" } },
      { status: 400 }
    );
  }

  try {
    const provider = getAmapProvider();
    const result = await provider.geocode(address.trim());
    return NextResponse.json(result);
  } catch (e) {
    return travelDataErrorResponse(e);
  }
}
