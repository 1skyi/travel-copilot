// ============================================================
// Budget-aware Replanner — 超预算局部调整类型
// 只在 OVER_BUDGET 时触发；每次调整记录 改了什么/原金额/新金额/节省/原因。
// V1 保留不覆盖，V2 为调整后的新版本。
// ============================================================

import type { TripPlan } from "./plan";
import type { TripBrief } from "./trip";
import type { TravelDNA } from "./travel";
import type { UserSelections, BudgetSummary } from "./budget";
import type { TransportationSelection } from "./transportation";

export type ReplanCategory =
  | "transport"
  | "accommodation"
  | "food"
  | "tickets"
  | "localTransport"
  | "other";

export interface ReplanAdjustment {
  id: string;
  category: ReplanCategory;
  label: string;          // 修改了什么，例如 "住宿降级"
  detail: string;         // 明细，例如 "舒适型酒店 → 经济型酒店（3 晚）"
  originalAmount: number; // 该分类调整前金额
  newAmount: number;      // 该分类调整后金额
  savedAmount: number;    // originalAmount - newAmount（>= 0）
  reason: string;         // 为什么这样调整
}

export interface ReplanInput {
  plan: TripPlan;
  brief: TripBrief;
  dna: TravelDNA | null;
  selections?: UserSelections | null;
  transportation?: TransportationSelection | null;
}

export interface ReplanResult {
  planId: string;
  baseVersion: number;    // 1
  newVersion: number;     // 2
  success: boolean;       // newBudget.estimatedMin <= totalBudget
  stillOverBudget: boolean;
  originalBudget: BudgetSummary;
  newBudget: BudgetSummary;
  plan: TripPlan;         // V2 方案（route 与 V1 一致，仅标题/描述/标签变化）
  selections: UserSelections; // 调整后的决策选择（接受时写入 s3-user-selections）
  adjustments: ReplanAdjustment[];
  mainOverBudgetSource: { key: ReplanCategory; label: string; amount: number } | null;
  message: string;
  createdAt: string;
}