// ============================================================
// Trip Plan — Core plan type for Planner Agent output
// ============================================================

import type { TripBrief } from "./trip";

export interface RouteDay {
  day: number;
  location: string;
  activities: string[];
}

export interface TripPlan {
  id: string;
  title: string;
  score: number;
  budget: number; // 始终等于用户 TripBrief 预算，不允许 Planner 自行修改
  tags: string[];
  route: RouteDay[];
  suitableFor: string;
  desc: string;
}

// ============================================================
// Budget Breakdown — 预算明细与硬约束检查
// ============================================================

export type BudgetSourceType = "EXTERNAL_DATA" | "AI_ESTIMATE" | "USER_INPUT" | "UNKNOWN";

export interface BudgetLineItem {
  amount: number;
  minAmount: number;
  maxAmount: number;
  source: string;
  sourceType: BudgetSourceType;
}

export interface BudgetBreakdown {
  transport: BudgetLineItem;
  accommodation: BudgetLineItem;
  food: BudgetLineItem;
  tickets: BudgetLineItem;
  localTransport: BudgetLineItem;
  other: BudgetLineItem;
  knownCost: number;
  estimatedMin: number;
  estimatedMax: number;
  remainingMin: number;
  remainingMax: number;
  total: number;
  overBudget: boolean;
  note?: string;
}

// ============================================================
// Review Result — ReviewAgent output
// ============================================================

export interface ReviewResult {
  score: number;
  warnings: string[];
  suggestions: string[];
}

// ============================================================
// Decision Card — AI recommendation
// ============================================================

export interface DecisionOption {
  id: string;
  title: string;
  description: string;
  impact: DecisionImpact[];
  alternatives: string[];
}

export interface DecisionImpact {
  label: string;
  value: string;
  positive: boolean;
}

// ============================================================
// Agent pipeline input
// ============================================================

export interface PlannerInput {
  destination: string;
  days: number;
  dna: {
    style: string;
    pace: string;
    avoid: string[];
    hotel: string;
    interest: string[];
    budget: string;
  };
  brief: TripBrief;
}

// ============================================================
// Full pipeline result
// ============================================================

export interface PipelineResult {
  plans: TripPlan[];
  budgets: BudgetBreakdown[];
  reviews: ReviewResult[];
  decisions: DecisionOption[];
}

// ============================================================
// Sprint 4 — Timeline & Map & Journey types
// ============================================================

export interface TimelineActivity {
  time: string;            // "09:00"
  title: string;           // "抵达乌鲁木齐"
  description: string;     // "乌鲁木齐地窝堡国际机场"
  type: "transport" | "activity" | "meal" | "rest" | "photo";
  icon?: string;
}

export interface DailyTimeline {
  day: number;
  location: string;
  items: TimelineActivity[];
}

export interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "city" | "attraction" | "hotel" | "restaurant" | "transport";
}

export interface JourneyState {
  planTitle: string;
  currentDay: number;
  totalDays: number;
  date: string;
  weather: {
    temp: string;
    desc: string;
    icon: string;   // lucide icon name
  };
  sunrise: string;
  sunset: string;
  wind: string;
  nextStop: {
    name: string;
    eta: string;
    tip: string;
  };
  todayTimeline: TimelineActivity[];
  tips: string[];
}

// ============================================================
// ItineraryAgent input
// ============================================================

export interface ItineraryInput {
  plan: TripPlan;
  dna: {
    style: string;
    pace: string;
    avoid: string[];
  };
}

// ============================================================
// JourneyAgent input
// ============================================================

export interface JourneyInput {
  plan: TripPlan;
  dayIndex: number;
}