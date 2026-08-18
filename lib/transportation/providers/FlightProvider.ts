// ============================================================
// FlightProvider — 航班数据提供方
// 当前未接入真实航班 API；返回空结果，禁止生成假航班价格。
// ============================================================

import type {
  TransportationOption,
  TransportationSearchRequest,
  TransportationType,
} from "@/types/transportation";
import type { TransportationProvider } from "../interfaces/TransportationProvider";

export class FlightProvider implements TransportationProvider {
  readonly providerName = "flight";
  readonly types: TransportationType[] = ["flight"];

  async search(_request: TransportationSearchRequest): Promise<TransportationOption[]> {
    return [];
  }
}