// ============================================================
// RailProvider — 高铁 / 火车数据提供方
// 当前未接入真实铁路 API；高铁与火车分属两个 type，均返回空结果。
// ============================================================

import type {
  TransportationOption,
  TransportationSearchRequest,
  TransportationType,
} from "@/types/transportation";
import type { TransportationProvider } from "../interfaces/TransportationProvider";

export class RailProvider implements TransportationProvider {
  readonly providerName = "rail";
  readonly types: TransportationType[] = ["high_speed_rail", "train"];

  async search(_request: TransportationSearchRequest): Promise<TransportationOption[]> {
    return [];
  }
}