// ============================================================
// Trip Planning Orchestrator — 规划闭环状态与结果类型
// ============================================================

import type {
  TripPlan,
  BudgetBreakdown,
  ReviewResult,
  DecisionOption,
  DailyTimeline,
} from "./plan";
import type { GeoLocation, POI, RouteResult } from "./location";
import type { TransportationOption } from "./transportation";
import type { BudgetSummary } from "./budget";

export type PlanningPhase =
  | "UNDERSTANDING"
  | "COLLECTING_DATA"
  | "TRANSPORT"
  | "PLANNING"
  | "CALCULATING_BUDGET"
  | "CHECKING"
  | "COMPLETED"
  | "REPLANNING"
  | "ERROR";

export interface PlanningProgress {
  phase: PlanningPhase;
  message: string;
  detail?: string;
}

export type PlanningProgressListener = (progress: PlanningProgress) => void;

// 数据采集阶段汇总的真实数据；缺失项为 null/[]，禁止伪造。
export interface PlanningDataContext {
  destination: string;
  destinationGeo: GeoLocation | null;
  pois: POI[];
  transportOptions: TransportationOption[];
  collectedAt: string;
}

// 地图数据（与 useTravelMapData 结构对齐，供 /trip 复用）
export interface PlanningMapData {
  locations: GeoLocation[];
  locationDayIds: number[];
  routes: RouteResult[];
  routeDayIds: number[];
}

export interface PlanningResult {
  plans: TripPlan[];
  budgets: BudgetBreakdown[];
  reviews: ReviewResult[];
  decisions: DecisionOption[];
  itineraries: DailyTimeline[];
  mapData: PlanningMapData;
  budgetSummary: BudgetSummary;
  overBudget: boolean;
  dataIncomplete: boolean;
}