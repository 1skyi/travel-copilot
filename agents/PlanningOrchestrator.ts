// ============================================================
// PlanningOrchestrator — 统一旅行规划编排器
// TripBrief → 数据采集 → 交通 → POI/路线 → Budget → Planner → Timeline → Map
// 用户预算是硬约束；缺失数据标记 NO_DATA，禁止伪造。
// ============================================================

import type { TravelDNA } from "@/types/travel";
import type { TripPlan, BudgetBreakdown, ReviewResult, DecisionOption, PlannerInput } from "@/types/plan";
import type { TripBrief } from "@/types/trip";
import { getTotalBudget, getTravelerCount, isTripBriefComplete } from "@/types/trip";
import type { GeoLocation, POI } from "@/types/location";
import type { TransportationOption } from "@/types/transportation";
import type {
  PlanningDataContext,
  PlanningMapData,
  PlanningProgress,
  PlanningProgressListener,
  PlanningResult,
} from "@/types/planning";
import { PlannerAgent } from "./PlannerAgent";
import { BudgetAgent } from "./BudgetAgent";
import { ReviewAgent } from "./ReviewAgent";
import { ItineraryAgent } from "./ItineraryAgent";
import { BudgetEngine } from "./BudgetEngine";
import { searchTransportationForBrief } from "@/lib/transportation/client";
import { fetchGeocode, fetchPOI, fetchRoute } from "@/lib/travel-data/client";
import { sanitizeLocationName } from "@/lib/travel-data/utils";

const DNA_STORAGE_KEY = "travel-dna";
const PREFIX = "s3-";

export class PlanningOrchestrator {
  private plannerAgent = new PlannerAgent();
  private budgetAgent = new BudgetAgent();
  private reviewAgent = new ReviewAgent();
  private itineraryAgent = new ItineraryAgent();
  private budgetEngine = new BudgetEngine();
  private listeners: PlanningProgressListener[] = [];

  addProgressListener(fn: PlanningProgressListener): void {
    this.listeners.push(fn);
  }

  private emit(progress: PlanningProgress): void {
    this.listeners.forEach((fn) => fn({ ...progress }));
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async run(brief: TripBrief): Promise<PlanningResult> {
    if (!brief || !brief.confirmed) {
      throw new Error("Trip Brief 未确认，Planner Agent 已阻止执行");
    }
    if (!isTripBriefComplete(brief)) {
      throw new Error("Trip Brief 缺少出发地/目的地/人数/日期/预算，Planner Agent 已阻止执行");
    }

    const rawDNA = typeof window !== "undefined" ? localStorage.getItem(DNA_STORAGE_KEY) : null;
    if (!rawDNA) throw new Error("No Travel DNA found");
    const dna: TravelDNA = JSON.parse(rawDNA);

    // 新一轮规划必须重新决策预算与交通，清除上一轮结果
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(PREFIX + "user-selections");
      sessionStorage.removeItem(PREFIX + "budget-summary");
      sessionStorage.removeItem(PREFIX + "transportation-selection");
      sessionStorage.removeItem(PREFIX + "itineraries");
      sessionStorage.removeItem(PREFIX + "planning-map");
      sessionStorage.removeItem(PREFIX + "planning-budget");
    }

    try {
      this.emit({ phase: "COLLECTING_DATA", message: "正在获取真实地理、POI 与交通数据..." });
      const dataContext = await this.collectData(brief);
      await this.delay(400);

      this.emit({
        phase: "PLANNING",
        message: "正在结合 Trip Brief 与 Travel DNA 生成方案...",
        detail: dataContext.pois.length > 0 ? "已收集 " + dataContext.pois.length + " 个真实 POI" : "暂无真实 POI，方案将保持估算标记",
      });
      const input: PlannerInput = {
        destination: brief.destination,
        days: brief.duration,
        dna,
        brief,
      };
      const plans = this.plannerAgent.generate(input);
      await this.delay(500);

      this.emit({ phase: "CALCULATING_BUDGET", message: "正在按用户预算硬约束计算..." });
      const { budgets, budgetSummary } = await this.calculateBudget(plans, brief, dna);
      await this.delay(400);

      this.emit({ phase: "CHECKING", message: "正在检查路线合理性与预算状态..." });
      const reviews = plans.map((plan) => this.reviewAgent.review(plan));
      const decisions = this.buildDecisions(plans, dna, budgets, reviews, brief);
      await this.delay(400);

      this.emit({ phase: "COMPLETED", message: "规划完成，正在生成 Timeline 与地图数据..." });
      const itineraries = this.itineraryAgent.generate({
        plan: plans[0],
        dna: { style: dna.style, pace: dna.pace, avoid: dna.avoid },
      });
      const mapData = await this.collectMapData(plans[0]);

      const result: PlanningResult = {
        plans,
        budgets,
        reviews,
        decisions,
        itineraries,
        mapData,
        budgetSummary,
        overBudget: budgetSummary.isOverBudget,
        dataIncomplete: budgetSummary.hasIncompleteData,
      };

      this.persist(result, brief);
      this.emit({
        phase: "COMPLETED",
        message: budgetSummary.isOverBudget
          ? "规划完成，但当前方案超预算，请在预算页调整"
          : "规划完成，3 个方案已就绪",
        detail: "Timeline / Map / Budget 已同步更新",
      });
      return result;
    } catch (error) {
      this.emit({
        phase: "ERROR",
        message: error instanceof Error ? error.message : "规划失败，请稍后重试",
      });
      throw error;
    }
  }

  private async collectData(brief: TripBrief): Promise<PlanningDataContext> {
    let destinationGeo: GeoLocation | null = null;
    try {
      destinationGeo = await fetchGeocode(brief.destination);
    } catch {
      destinationGeo = null;
    }

    let pois: POI[] = [];
    try {
      pois = await fetchPOI(
        brief.destination,
        destinationGeo
          ? { longitude: destinationGeo.longitude, latitude: destinationGeo.latitude }
          : undefined
      );
    } catch {
      pois = [];
    }

    let transportOptions: TransportationOption[] = [];
    try {
      const result = await searchTransportationForBrief(brief);
      transportOptions = result.options;
    } catch {
      transportOptions = [];
    }

    return {
      destination: brief.destination,
      destinationGeo,
      pois,
      transportOptions,
      collectedAt: new Date().toISOString(),
    };
  }

  private async calculateBudget(
    plans: TripPlan[],
    brief: TripBrief,
    dna: TravelDNA
  ): Promise<{ budgets: BudgetBreakdown[]; budgetSummary: PlanningResult["budgetSummary"] }> {
    const totalBudget = getTotalBudget(brief);
    const travelerCount = getTravelerCount(brief.travelers);
    const budgets = plans.map((plan) => this.budgetAgent.estimate(plan, totalBudget, travelerCount));

    const selections = await this.budgetEngine.createDefaultSelectionsWithTransportationAsync(
      plans[0],
      brief,
      dna,
      { outbound: null, return: null }
    );
    const budgetSummary = this.budgetEngine.calculate(brief, selections);

    return { budgets, budgetSummary };
  }

  private async collectMapData(plan: TripPlan): Promise<PlanningMapData> {
    const names = plan.route.map((day) => sanitizeLocationName(day.location));
    const uniqueNames = Array.from(new Set(names));

    const geoResults = await Promise.allSettled(uniqueNames.map((name) => fetchGeocode(name)));
    const geoByName = new Map<string, GeoLocation>();
    uniqueNames.forEach((name, index) => {
      const result = geoResults[index];
      if (result.status === "fulfilled") geoByName.set(name, result.value);
    });

    const locations: GeoLocation[] = [];
    const locationDayIds: number[] = [];
    names.forEach((name, index) => {
      const location = geoByName.get(name);
      if (location) {
        locations.push(location);
        locationDayIds.push(index);
      }
    });

    const routeResults = await Promise.allSettled(
      names.slice(0, -1).map((origin, index) => fetchRoute(origin, names[index + 1], "DRIVING"))
    );
    const routes: PlanningMapData["routes"] = [];
    const routeDayIds: number[] = [];
    routeResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        routes.push(result.value);
        routeDayIds.push(index);
      }
    });

    return { locations, locationDayIds, routes, routeDayIds };
  }

  private buildDecisions(
    plans: TripPlan[],
    dna: TravelDNA,
    budgets: BudgetBreakdown[],
    reviews: ReviewResult[],
    brief: TripBrief
  ): DecisionOption[] {
    const transportTitle =
      brief.preferences.transportation === "self_drive"
        ? "自驾租车"
        : brief.preferences.transportation === "public"
          ? "公共交通"
          : brief.preferences.transportation === "charter"
            ? "当地包车"
            : "AI 推荐交通";

    return [
      {
        id: "transport",
        title: "推荐交通：" + transportTitle,
        description: "基于你的 Trip Brief 与 DNA（" + dna.style + "），选择最适合本次出行的交通方式。",
        impact: [
          { label: "预算", value: brief.preferences.budgetIncludesTransport ? "已含往返" : "仅当地", positive: brief.preferences.budgetIncludesTransport },
          { label: "自由度", value: brief.preferences.transportation === "self_drive" ? "+40%" : "+15%", positive: true },
          { label: "疲劳度", value: brief.preferences.transportation === "public" ? "较低" : "中等", positive: true },
        ],
        alternatives: ["自驾租车", "高铁+当地包车", "全程公共交通"],
      },
      {
        id: "hotel",
        title: "住宿建议：" + dna.hotel,
        description: dna.style + "路线配套" + dna.hotel + "住宿推荐，符合" + brief.preferences.travelerType + "出行。",
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

  private persist(result: PlanningResult, brief: TripBrief): void {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(PREFIX + "plans", JSON.stringify(result.plans));
    sessionStorage.setItem(PREFIX + "budgets", JSON.stringify(result.budgets));
    sessionStorage.setItem(PREFIX + "reviews", JSON.stringify(result.reviews));
    sessionStorage.setItem(PREFIX + "decisions", JSON.stringify(result.decisions));
    sessionStorage.setItem(PREFIX + "itineraries", JSON.stringify(result.itineraries));
    sessionStorage.setItem(PREFIX + "planning-map", JSON.stringify(result.mapData));
    sessionStorage.setItem(PREFIX + "planning-budget", JSON.stringify(result.budgetSummary));
    sessionStorage.setItem(PREFIX + "brief", JSON.stringify(brief));
  }
}