// ============================================================
// TransportationProvider — 交通数据提供方抽象
// 只负责返回候选方案，不做推荐，也不伪装真实价格。
// ============================================================

import type {
  TransportationSearchRequest,
  TransportationOption,
  TransportationType,
} from "@/types/transportation";

export interface TransportationProvider {
  readonly providerName: string;
  readonly types: TransportationType[];
  search(request: TransportationSearchRequest): Promise<TransportationOption[]>;
}