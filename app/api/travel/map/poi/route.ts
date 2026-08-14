// GET /api/travel/map/poi?keyword=赛里木湖
import { NextRequest, NextResponse } from "next/server";
import { getAmapProvider, travelDataErrorResponse } from "@/lib/travel-data/server";

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword") || "";
  if (!keyword.trim()) {
    return NextResponse.json(
      { error: { status: 400, message: "缺少 keyword 参数", provider: "AMAP" } },
      { status: 400 }
    );
  }

  try {
    const provider = getAmapProvider();
    const result = await provider.searchPOI(keyword.trim());
    return NextResponse.json(result);
  } catch (e) {
    return travelDataErrorResponse(e);
  }
}
