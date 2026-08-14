// ============================================================
// 服务端 Travel Data Layer 工厂 + 错误响应
// 高德 Key 只在服务端读取（process.env.AMAP_API_KEY）
// ============================================================

import { NextResponse } from "next/server";
import { AmapProvider } from "./providers/AmapProvider";
import { MemoryCache } from "./cache";
import { TravelDataError } from "./errors";

// 跨请求共享的进程内缓存（不引入 Redis 等基础设施）
const sharedCache = new MemoryCache();

export function getAmapProvider(): AmapProvider {
  return new AmapProvider(process.env.AMAP_API_KEY || "", {
    cache: sharedCache,
  });
}

export function travelDataErrorResponse(e: unknown) {
  if (e instanceof TravelDataError) {
    const status = e.status >= 400 && e.status <= 599 ? e.status : 502;
    return NextResponse.json(
      { error: { status: e.status, message: e.message, provider: e.provider } },
      { status }
    );
  }
  return NextResponse.json(
    { error: { status: 500, message: "Internal server error", provider: "AMAP" } },
    { status: 500 }
  );
}
