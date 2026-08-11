import { TravelDNA, AgentStep } from "@/types/travel";
import { TripPlan, BudgetBreakdown, ReviewResult, DecisionOption, PlannerInput, PipelineResult } from "@/types/plan";
import { PreferenceAgent } from "./PreferenceAgent";
import { PlannerAgent } from "./PlannerAgent";
import { BudgetAgent } from "./BudgetAgent";
import { ReviewAgent } from "./ReviewAgent";

const DNA_STORAGE_KEY = "travel-dna";
const PREFIX = "s3-";

export class TravelController {
  private preferenceAgent = new PreferenceAgent();
  private plannerAgent = new PlannerAgent();
  private budgetAgent = new BudgetAgent();
  private reviewAgent = new ReviewAgent();
  private listeners: Array<(steps: AgentStep[]) => void> = [];

  addProgressListener(fn: (steps: AgentStep[]) => void) {
    this.listeners.push(fn);
  }

  private emit(steps: AgentStep[]) {
    this.listeners.forEach((fn) => fn([...steps]));
  }

  async run(destination: string, days: number): Promise<PipelineResult> {
    const rawDNA = typeof window !== "undefined" ? localStorage.getItem(DNA_STORAGE_KEY) : null;
    if (!rawDNA) throw new Error("No Travel DNA found");

    const dna: TravelDNA = JSON.parse(rawDNA);
    const input: PlannerInput = { destination, days, dna };

    const steps: AgentStep[] = [
      { id: "pref", agentName: "PreferenceAgent", status: "idle", message: "分析用户偏好..." },
      { id: "plan", agentName: "PlannerAgent", status: "idle", message: "等待生成方案..." },
      { id: "budget", agentName: "BudgetAgent", status: "idle", message: "等待预算估算..." },
      { id: "review", agentName: "ReviewAgent", status: "idle", message: "等待路线检查..." },
      { id: "decision", agentName: "DecisionEngine", status: "idle", message: "等待生成决策建议..." },
    ];

    steps[0].status = "thinking";
    steps[0].message = "分析 DNA: " + dna.style + " / " + dna.pace;
    this.emit(steps);
    await this.delay(600);
    const constraints = this.preferenceAgent.analyze(dna);
    steps[0].status = "done";
    steps[0].message = "约束: 优先 " + constraints.priorities.length + " 项，避雷 " + constraints.avoids.length + " 项";
    this.emit(steps);

    steps[1].status = "thinking";
    steps[1].message = "生成 " + destination + " " + days + "天方案...";
    this.emit(steps);
    await this.delay(1000);
    const plans = this.plannerAgent.generate(input);
    steps[1].status = "done";
    steps[1].message = "已生成 " + plans.length + " 个方案";
    this.emit(steps);

    steps[2].status = "thinking";
    steps[2].message = "估算预算明细...";
    this.emit(steps);
    await this.delay(700);
    const budgets = plans.map((p) => this.budgetAgent.estimate(p));
    steps[2].status = "done";
    steps[2].message = "预算: ¥" + budgets[2].total + " ~ ¥" + budgets[0].total;
    this.emit(steps);

    steps[3].status = "thinking";
    steps[3].message = "ReviewAgent 检查路线...";
    this.emit(steps);
    await this.delay(800);
    const reviews = plans.map((p) => this.reviewAgent.review(p));
    const totalWarnings = reviews.reduce((s, r) => s + r.warnings.length, 0);
    steps[3].status = "done";
    steps[3].message = totalWarnings > 0 ? "发现 " + totalWarnings + " 条建议" : "路线检查通过";
    this.emit(steps);

    steps[4].status = "thinking";
    steps[4].message = "生成决策建议...";
    this.emit(steps);
    await this.delay(600);
    const decisions = this.buildDecisions(plans, dna, budgets, reviews);
    steps[4].status = "done";
    steps[4].message = "已生成 " + decisions.length + " 条决策";
    this.emit(steps);

    if (typeof window !== "undefined") {
      sessionStorage.setItem(PREFIX + "plans", JSON.stringify(plans));
      sessionStorage.setItem(PREFIX + "budgets", JSON.stringify(budgets));
      sessionStorage.setItem(PREFIX + "reviews", JSON.stringify(reviews));
      sessionStorage.setItem(PREFIX + "decisions", JSON.stringify(decisions));
    }

    return { plans, budgets, reviews, decisions };
  }

  private buildDecisions(
    plans: TripPlan[],
    dna: TravelDNA,
    budgets: BudgetBreakdown[],
    reviews: ReviewResult[]
  ): DecisionOption[] {
    return [
      {
        id: "transport",
        title: "推荐交通：自驾租车",
        description: "基于你的 DNA（" + dna.style + "），自驾可随时停车拍照，符合" + dna.pace + "偏好。",
        impact: [
          { label: "预算", value: "+¥800", positive: false },
          { label: "自由度", value: "+40%", positive: true },
          { label: "疲劳度", value: "降低 20%", positive: true },
        ],
        alternatives: ["高铁+当地包车", "全程公共交通"],
      },
      {
        id: "hotel",
        title: "住宿建议：" + dna.hotel,
        description: dna.style + "路线配套" + dna.hotel + "住宿推荐。",
        impact: [
          { label: "预算差", value: "¥" + (budgets[0] ? budgets[0].total - budgets[2].total : 0), positive: false },
          { label: "体验", value: "+30%", positive: true },
        ],
        alternatives: ["经济型替代", "高端升级方案"],
      },
      {
        id: "route",
        title: "路线优化提示",
        description: reviews[0]?.warnings?.[0] || "路线经 ReviewAgent 检查通过，合理性良好。",
        impact: [{ label: "综合评分", value: reviews[0]?.score ? reviews[0].score + " 分" : "-", positive: true }],
        alternatives: reviews[0]?.suggestions || [],
      },
    ];
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
