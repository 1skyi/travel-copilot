// ============================================================
// Transportation Adapters — 与 Budget / Map / Timeline 的连接层
// 不重复调用路线 API，只做结构映射。
// ============================================================

import type {
  BudgetSourceType,
  BudgetSummaryLine,
  BudgetLineDataStatus,
} from "@/types/budget";
import type { TransportationOption } from "@/types/transportation";

export function toBudgetSourceType(
  option: TransportationOption
): BudgetSourceType {
  if (option.status === "REAL") return "EXTERNAL_DATA";
  if (option.status === "ESTIMATED") return "AI_ESTIMATE";
  return "UNKNOWN";
}

// 交通方案 → Budget 单行。REAL 不虚构范围，ESTIMATED 给区间，NO_DATA 不按 0 计。
export function toBudgetLine(option: TransportationOption): BudgetSummaryLine {
  const amount = option.price.totalPrice;
  const sourceType = toBudgetSourceType(option);
  const isExact = sourceType === "EXTERNAL_DATA";
  const dataStatus: BudgetLineDataStatus =
    option.status === "REAL" ? "REAL" : option.status === "ESTIMATED" ? "ESTIMATED" : "NO_DATA";

  return {
    key: "transport",
    label: "长途交通",
    amount: dataStatus === "NO_DATA" ? 0 : amount,
    minAmount: isExact ? amount : Math.round(amount * 0.85),
    maxAmount: isExact ? amount : Math.round(amount * 1.2),
    source: option.dataSource,
    sourceType,
    isEstimated: dataStatus === "ESTIMATED",
    dataStatus,
    passengerCount: option.passengerCount,
    detailType: option.type,
  };
}

// 交通方案 → MapProvider.route() 所需的起终点字符串对。
// 空间路线渲染仍由 Map 数据层负责，不在这里重复请求。
export function toMapRoutePair(
  option: TransportationOption
): { origin: string; destination: string } {
  return { origin: option.origin, destination: option.destination };
}