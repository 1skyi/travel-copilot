import { TravelDNA, AgentStep } from "@/types/travel";
import { TripPlan, BudgetBreakdown, ReviewResult, DecisionOption, PlannerInput, PipelineResult } from "@/types/plan";
import { TripBrief, getTotalBudget, getTravelerCount, isTripBriefComplete } from "@/types/trip";
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

  // 关键规则：Trip Brief 未确认或必填约束不完整时，Planner Agent 不得执行
  async run(brief: TripBrief): Promise<PipelineResult> {
    if (!brief || !brief.confirmed) {
      throw new Error("Trip Brief 未确认，Planner Agent 已阻止执行");
    }
    if (!isTripBriefComplete(brief)) {
      throw new Error("Trip Brief 缺少出发地/目的地/人数/日期/预算，Planner Agent 已阻止执行");
    }

    const rawDNA = typeof window !== "undefined" ? localStorage.getItem(DNA_STORAGE_KEY) : null;
    if (!rawDNA) throw new Error("No Travel DNA found");

    // 新一轮规划必须重新完成决策预算，清除上一轮的旧选择
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(PREFIX + "user-selections");
      sessionStorage.removeItem(PREFIX + "budget-summary");
      sessionStorage.removeItem(PREFIX + "transportation-selection");
    }

    const dna: TravelDNA = JSON.parse(rawDNA);
    const destination = brief.destination;
    const days = brief.duration;
    const totalBudget = getTotalBudget(brief);
    const travelerCount = getTravelerCount(brief.travelers);

    const input: PlannerInput = { destination, days, dna, brief };

    const steps: AgentStep[] = [
      { id: "pref", agentName: "PreferenceAgent", status: "idle", message: "分析用户长期偏好..." },
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
    steps[1].message = "结合 Trip Brief 生成 " + destination + " " + days + "天方案...";
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
    const budgets = plans.map((p) => this.budgetAgent.estimate(p, totalBudget, travelerCount));
    const hasOverBudget = budgets.some((budget) => budget.overBudget);
    steps[2].status = "done";
    steps[2].message = hasOverBudget
      ? "预算不足：最低估算 ¥" + budgets.reduce((min, b) => Math.min(min, b.estimatedMin), Infinity).toLocaleString() + " > 用户预算 ¥" + totalBudget.toLocaleString()
      : "预算硬约束检查通过，估算 ¥" + budgets[0].estimatedMin.toLocaleString() + " ~ ¥" + budgets[0].estimatedMax.toLocaleString();
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
    const decisions = this.buildDecisions(plans, dna, budgets, reviews, brief);
    steps[4].status = "done";
    steps[4].message = "已生成 " + decisions.length + " 条决策";
    this.emit(steps);

    if (typeof window !== "undefined") {
      sessionStorage.setItem(PREFIX + "plans", JSON.stringify(plans));
      sessionStorage.setItem(PREFIX + "budgets", JSON.stringify(budgets));
      sessionStorage.setItem(PREFIX + "reviews", JSON.stringify(reviews));
      sessionStorage.setItem(PREFIX + "decisions", JSON.stringify(decisions));
      sessionStorage.setItem(PREFIX + "brief", JSON.stringify(brief));
    }

    return { plans, budgets, reviews, decisions };
  }

  private buildDecisions(
    plans: TripPlan[],
    dna: TravelDNA,
    budgets: BudgetBreakdown[],
    reviews: ReviewResult[],
    brief: TripBrief
  ): DecisionOption[] {
    const preferences = brief.preferences;
    const transportTitle =
      preferences.transportation === "self_drive" ? "自驾租车"
      : preferences.transportation === "public" ? "公共交通"
      : preferences.transportation === "charter" ? "当地包车"
      : "AI 推荐交通";

    return [
      {
        id: "transport",
        title: "推荐交通：" + transportTitle,
        description: "基于你的 Trip Brief（" + preferences.transportation + "）与 DNA（" + dna.style + "），选择最适合本次出行的交通方式。",
        impact: [
          { label: "预算", value: preferences.budgetIncludesTransport ? "已含往返" : "仅当地", positive: preferences.budgetIncludesTransport },
          { label: "自由度", value: preferences.transportation === "self_drive" ? "+40%" : "+15%", positive: true },
          { label: "疲劳度", value: preferences.transportation === "public" ? "较低" : "中等", positive: true },
        ],
        alternatives: ["自驾租车", "高铁+当地包车", "全程公共交通"],
      },
      {
        id: "hotel",
        title: "住宿建议：" + dna.hotel,
        description: dna.style + "路线配套" + dna.hotel + "住宿推荐，符合" + preferences.travelerType + "出行。",
        impact: [
          { label: "预算差", value: "¥" + (budgets[0] ? budgets[0].estimatedMax - budgets[0].estimatedMin : 0), positive: false },
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
