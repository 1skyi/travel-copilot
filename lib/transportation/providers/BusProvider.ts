// ============================================================
// BusProvider — 长途汽车数据提供方
// 当前未接入真实客运 API；返回空结果，禁止生成假票价。
// ============================================================

import type {
  TransportationOption,
  TransportationSearchRequest,
  TransportationType,
} from "@/types/transportation";
import type { TransportationProvider } from "../interfaces/TransportationProvider";

export class BusProvider implements TransportationProvider {
  readonly providerName = "bus";
  readonly types: TransportationType[] = ["bus"];

  async search(_request: TransportationSearchRequest): Promise<TransportationOption[]> {
    return [];
  }
}