// ============================================================
// Decision Budget — 用户驱动的决策式预算类型
// 本阶段无真实酒店/机票/火车 API，所有分项价格标记为 AI_ESTIMATE。
// 用户预算始终来自 TripBrief，标记为 USER_INPUT。
// NO_DATA 不等于 0 元：缺失数据必须显示“暂无数据/未计入”。
// ============================================================

// 与 plan.ts 中的 BudgetSourceType 结构一致（结构化类型互操作）
export type BudgetSourceType = "EXTERNAL_DATA" | "AI_ESTIMATE" | "USER_INPUT" | "UNKNOWN";

export type TransportMode = "FLIGHT" | "TRAIN" | "DRIVE" | "BUS";

export type PriceType = "REAL" | "RANGE" | "ESTIMATE" | "UNKNOWN";

// 预算分类数据状态：真实、估算、暂无数据
export type BudgetLineDataStatus = "REAL" | "ESTIMATED" | "NO_DATA";

// 预算整体状态：不把 NO_DATA 当作 0 元后的可规划状态
export type BudgetStatus = "UNDER_BUDGET" | "ON_BUDGET" | "OVER_BUDGET";

export interface TransportOption {
  id: string;
  mode: TransportMode;
  provider: string;
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  duration: string;
  price: number;
  priceType: PriceType;
  source: string;
  sourceType: BudgetSourceType;
  recommendationReason?: string;
}

export interface TransportSegment {
  id: string;
  label: string;
  origin: string;
  destination: string;
  type: "outbound" | "local" | "return";
  selectedOptionId: string | null;
  options: TransportOption[];
}

export interface AccommodationOption {
  id: string;
  name: string;
  location: string;
  rating: number;
  pricePerNight: number;
  roomType: string;
  amenities: string[];
  source: string;
  sourceType: BudgetSourceType;
  recommendationReason?: string;
}

export interface AccommodationSelection {
  id: string;
  label: string;
  location: string;
  nights: number;
  selectedOptionId: string | null;
  options: AccommodationOption[];
}

export interface FoodPreference {
  id: string;
  label: string;
  minPerPersonPerDay: number;
  maxPerPersonPerDay: number;
  sourceType: BudgetSourceType;
  recommendationReason?: string;
}

export interface ActivityOption {
  id: string;
  day: number;
  title: string;
  cost: number;
  optional: boolean;
  source: string;
  sourceType: BudgetSourceType;
}

export interface ActivitySelection {
  selectedOptionIds: string[];
  options: ActivityOption[];
}

export interface LocalTransportOption {
  id: string;
  label: string;
  costPerPersonPerDay: number;
  sourceType: BudgetSourceType;
  recommendationReason?: string;
}

export interface UserSelections {
  planId: string;
  transportSelections: TransportSegment[];
  accommodationSelections: AccommodationSelection[];
  foodPreferenceId: string | null;
  foodOptions: FoodPreference[];
  activitySelections: ActivitySelection;
  localTransportId: string | null;
  localTransportOptions: LocalTransportOption[];
  savedAt?: string;
}

export type BudgetLineKey =
  | "transport"
  | "accommodation"
  | "food"
  | "tickets"
  | "localTransport"
  | "other";

export interface BudgetSummaryLine {
  key: BudgetLineKey;
  label: string;
  amount: number;
  minAmount: number;
  maxAmount: number;
  source: string;
  sourceType: BudgetSourceType;
  // 是否为估算；真实数据/用户输入为 false
  isEstimated: boolean;
  // REAL / ESTIMATED / NO_DATA
  dataStatus: BudgetLineDataStatus;
  // 交通类明细的补充信息（其他分项可不填）
  passengerCount?: number;
  detailType?: string;
}

export interface BudgetSummary {
  totalBudget: number;
  // 已规划金额：只汇总有数据的分项，NO_DATA 不计入 0
  plannedAmount: number;
  confirmedCost: number;
  estimatedMin: number;
  estimatedMax: number;
  remainingBudget: number;
  remainingMin: number;
  remainingMax: number;
  isOverBudget: boolean;
  budgetStatus: BudgetStatus;
  // 是否存在 NO_DATA 分项；UI 必须提示“部分费用暂无数据”
  hasIncompleteData: boolean;
  lines: BudgetSummaryLine[];
  suggestions: string[];
}