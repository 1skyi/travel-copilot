// ============================================================
// Travel DNA — Core identity type
// ============================================================

export interface TravelDNA {
  style: string;        // single select
  pace: string;         // single select
  avoid: string[];      // multi select — things user can't accept
  hotel: string;        // single select
  interest: string[];   // multi select
  budget: string;       // derived from hotel
  destination?: string;
  createdAt: string;
}

// ============================================================
// Personality profile — derived from DNA
// ============================================================

export interface PersonalityProfile {
  persona: string;
  emoji: string;
  summary: string;
  strengths: string[];
  watchOuts: string[];
  bestMatch: string;
}

// ============================================================
// Agent orchestration
// ============================================================

export type AgentStatus = "idle" | "thinking" | "done" | "error";

export interface AgentStep {
  id: string;
  agentName: string;
  status: AgentStatus;
  message: string;
  result?: unknown;
}

// ============================================================
// Travel Plan
// ============================================================

export interface DayPlan {
  day: number;
  label: string;
  items: TimelinePlanItem[];
}

export interface TimelinePlanItem {
  time: string;
  title: string;
  desc: string;
  type: "transport" | "activity" | "meal" | "rest" | "arrive" | "next";
}

export interface TravelPlan {
  id: string;
  name: string;
  rating: number;
  budget: string;
  features: string[];
  tag: string;
  desc: string;
  days: DayPlan[];
}

// ============================================================
// Shared timeline type
// ============================================================

export interface TimelineItem {
  time: string;
  title: string;
  description: string;
  icon?: string;
  type: "activity" | "meal" | "transport" | "rest";
}

// ============================================================
// DNA Question definition
// ============================================================

export interface DNAQuestion {
  id: string;
  question: string;
  subtitle?: string;
  type: "single" | "multi";
  options: DNAOption[];
}

export interface DNAOption {
  label: string;
  icon: string;
  desc?: string;
}
