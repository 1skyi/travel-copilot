// ============================================================
// Trip Brief — 本次旅行的具体需求（区别于长期 Travel DNA）
// origin/destination/travelers/dates/budget 均为硬性必填约束。
// ============================================================

import type { TravelDNA } from "./travel";

export type TravelerType = "couple" | "friends" | "family" | "colleagues" | "solo" | "other";

export type Transportation = "self_drive" | "public" | "charter" | "ai";

export type TripInterest =
  | "photography"
  | "nature"
  | "food"
  | "culture"
  | "shopping"
  | "relax"
  | "outdoor";

export type TripAvoid =
  | "long_drive"
  | "crowded"
  | "early_rise"
  | "frequent_hotel_change"
  | "rush"
  | "queue";

export type BudgetScope = "TOTAL" | "PER_PERSON";

export interface Travelers {
  adults: number;
  children: number;
}

export interface TripBudget {
  amount: number;
  scope: BudgetScope;
  constraint: "HARD"; // 用户预算是硬约束，Agent 不得自行修改
}

export interface TripPreferences {
  travelerType: TravelerType;
  transportation: Transportation;
  interests: TripInterest[];
  avoid: TripAvoid[];
  budgetIncludesTransport: boolean;
}

export interface TripBrief {
  origin: string;
  destination: string;
  travelers: Travelers;
  startDate: string;
  endDate: string;
  duration: number;
  budget: TripBudget;
  preferences: TripPreferences;
  travelDNA: TravelDNA | null;
  confirmed: boolean;
  confirmedAt?: string;
}

// 需求采集阶段使用扁平 Draft，确认后再装配为 TripBrief。
export interface TripBriefDraft {
  origin?: string;
  destination?: string;
  adults?: number;
  children?: number;
  startDate?: string;
  endDate?: string;
  budgetAmount?: number;
  budgetScope?: BudgetScope;
  travelerType?: TravelerType;
  transportation?: Transportation;
  interests?: TripInterest[];
  avoid?: TripAvoid[];
  budgetIncludesTransport?: boolean;
}

export type TripBriefField =
  | "origin"
  | "destination"
  | "adults"
  | "children"
  | "startDate"
  | "endDate"
  | "budgetAmount"
  | "budgetScope"
  | "travelerType"
  | "transportation"
  | "interests"
  | "avoid"
  | "budgetIncludesTransport";

export interface RequirementQuestion {
  field: TripBriefField;
  question: string;
  type: "text" | "number" | "single" | "multi" | "boolean" | "date";
  options?: { label: string; value: string }[];
}

// ============================================================
// 展示用中文映射
// ============================================================

export const TRAVELER_TYPE_LABELS: Record<TravelerType, string> = {
  couple: "情侣",
  friends: "朋友",
  family: "家人",
  colleagues: "同事",
  solo: "独自旅行",
  other: "其他",
};

export const TRANSPORTATION_LABELS: Record<Transportation, string> = {
  self_drive: "自驾",
  public: "公共交通",
  charter: "包车",
  ai: "AI 推荐",
};

export const TRIP_INTEREST_LABELS: Record<TripInterest, string> = {
  photography: "摄影",
  nature: "自然",
  food: "美食",
  culture: "人文",
  shopping: "购物",
  relax: "放松",
  outdoor: "户外",
};

export const TRIP_AVOID_LABELS: Record<TripAvoid, string> = {
  long_drive: "长时间驾驶",
  crowded: "人多",
  early_rise: "早起",
  frequent_hotel_change: "频繁换酒店",
  rush: "赶路",
  queue: "排队",
};

export const BUDGET_SCOPE_LABELS: Record<BudgetScope, string> = {
  TOTAL: "总预算",
  PER_PERSON: "每人预算",
};

// ============================================================
// 计算工具 — 保证全流程只从 TripBrief 读取同一份事实
// ============================================================

export function getTravelerCount(travelers: Travelers): number {
  return Math.max(0, Number(travelers.adults) || 0) + Math.max(0, Number(travelers.children) || 0);
}

export function getTotalBudget(brief: Pick<TripBrief, "budget" | "travelers">): number {
  const amount = Math.max(0, Number(brief.budget.amount) || 0);
  if (brief.budget.scope === "PER_PERSON") {
    const people = getTravelerCount(brief.travelers);
    return amount * Math.max(1, people);
  }
  return amount;
}

function parseDateToMs(value: string): number | null {
  if (!value) return null;
  const match = value.match(/(\d{4})\s*[-/年]\s*(\d{1,2})\s*[-/月]\s*(\d{1,2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return Date.UTC(year, month - 1, day);
}

export function computeDuration(startDate: string, endDate: string): number {
  const start = parseDateToMs(startDate);
  const end = parseDateToMs(endDate);
  if (!start || !end || end < start) return 0;
  return Math.floor((end - start) / 86400000) + 1;
}

// ============================================================
// 默认值与装配
// ============================================================

export function createEmptyDraft(): TripBriefDraft {
  return {
    origin: "",
    destination: "",
    adults: undefined,
    children: undefined,
    startDate: "",
    endDate: "",
    budgetAmount: undefined,
    budgetScope: undefined,
    travelerType: undefined,
    transportation: undefined,
    interests: undefined,
    avoid: undefined,
    budgetIncludesTransport: undefined,
  };
}

export function createEmptyTripBrief(): TripBrief {
  return {
    origin: "",
    destination: "",
    travelers: { adults: 0, children: 0 },
    startDate: "",
    endDate: "",
    duration: 0,
    budget: { amount: 0, scope: "TOTAL", constraint: "HARD" },
    preferences: {
      travelerType: "solo",
      transportation: "ai",
      interests: [],
      avoid: [],
      budgetIncludesTransport: true,
    },
    travelDNA: null,
    confirmed: false,
  };
}

export function isTripBriefComplete(brief: TripBrief): boolean {
  return Boolean(
    brief &&
    brief.origin.trim() &&
    brief.destination.trim() &&
    brief.startDate.trim() &&
    brief.endDate.trim() &&
    brief.duration > 0 &&
    brief.travelers.adults > 0 &&
    brief.travelers.children >= 0 &&
    brief.budget.amount > 0 &&
    (brief.budget.scope === "TOTAL" || brief.budget.scope === "PER_PERSON") &&
    brief.preferences &&
    brief.preferences.travelerType &&
    brief.preferences.transportation
  );
}

export function draftToTripBrief(draft: TripBriefDraft, dna: TravelDNA | null = null): TripBrief {
  const adults = Math.max(0, Number(draft.adults) || 0);
  const children = Math.max(0, Number(draft.children) || 0);
  const startDate = (draft.startDate || "").trim();
  const endDate = (draft.endDate || "").trim();
  const duration = computeDuration(startDate, endDate);

  return {
    origin: (draft.origin || "").trim(),
    destination: (draft.destination || "").trim(),
    travelers: { adults, children },
    startDate,
    endDate,
    duration,
    budget: {
      amount: Math.max(0, Number(draft.budgetAmount) || 0),
      scope: draft.budgetScope || "TOTAL",
      constraint: "HARD",
    },
    preferences: {
      travelerType: draft.travelerType || "solo",
      transportation: draft.transportation || "ai",
      interests: draft.interests || [],
      avoid: draft.avoid || [],
      budgetIncludesTransport: draft.budgetIncludesTransport ?? true,
    },
    travelDNA: dna,
    confirmed: false,
  };
}