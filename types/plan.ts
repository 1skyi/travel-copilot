// ============================================================
// Trip Plan — Core plan type for Planner Agent output
// ============================================================

export interface RouteDay {
  day: number;
  location: string;
  activities: string[];
}

export interface TripPlan {
  id: string;
  title: string;
  score: number;
  budget: number;
  tags: string[];
  route: RouteDay[];
  suitableFor: string;
  desc: string;
}

// ============================================================
// Budget Breakdown — BudgetAgent output
// ============================================================

export interface BudgetBreakdown {
  transport: number;
  hotel: number;
  food: number;
  ticket: number;
  other: number;
  total: number;
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
