// ============================================================
// ReplannerAgent — Budget-aware 局部重规划
// 只在 OVER_BUDGET 时触发；优先局部调整，不重建整个行程；
// 每步调整后重新调用 BudgetEngine 计算；仍超预算时不伪造结果。
// 每次调整记录：改了什么 / 原金额 / 新金额 / 节省金额 / 修改原因。
// ============================================================

import type { TripPlan } from "@/types/plan";
import type { TripBrief } from "@/types/trip";
import { getTravelerCount } from "@/types/trip";
import type { TravelDNA } from "@/types/travel";
import type {
  UserSelections,
  TransportMode,
  FoodPreference,
  BudgetSummary,
} from "@/types/budget";
import { BudgetEngine } from "./BudgetEngine";
import type {
  ReplanAdjustment,
  ReplanCategory,
  ReplanInput,
  ReplanResult,
} from "@/types/replanner";

const MAX_ADJUSTMENTS = 12;

// 各分项从低到高的档位顺序（用于“降档”判断）
const FOOD_PRIORITY = ["economy", "comfort", "local"];
const LOCAL_TRANSPORT_PRIORITY = ["public", "mixed", "charter", "self_drive"];

const TRANSPORT_MODE_LABEL: Record<TransportMode, string> = {
  FLIGHT: "飞机",
  TRAIN: "高铁/火车",
  DRIVE: "自驾",
  BUS: "大巴",
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function foodMid(food: FoodPreference): number {
  return (food.minPerPersonPerDay + food.maxPerPersonPerDay) / 2;
}

interface CandidateAdjustment {
  category: ReplanCategory;
  label: string;
  detail: string;
  reason: string;
  estimatedSavings: number;
  apply: (selections: UserSelections) => UserSelections;
}

export class ReplannerAgent {
  private engine = new BudgetEngine();

  async replan(input: ReplanInput): Promise<ReplanResult> {
    const { plan, brief, dna } = input;
    const people = Math.max(1, getTravelerCount(brief.travelers));
    const rooms = Math.max(1, Math.ceil(people / 2));
    const days = Math.max(1, brief.duration);

    // 1) 获取/生成决策选择（用户已保存的优先，否则按 DNA 生成默认）
    let selections: UserSelections;
    if (input.selections && input.selections.planId === plan.id) {
      selections = clone(input.selections);
    } else {
      selections = await this.engine.createDefaultSelectionsWithTransportationAsync(
        plan,
        brief,
        dna,
        input.transportation ?? { outbound: null, return: null }
      );
    }

    // 2) 用现有 Budget Engine 计算当前预算
    const originalBudget = this.engine.calculate(brief, selections);

    // 只有 OVER_BUDGET 才触发 Replanner
    if (!originalBudget.isOverBudget) {
      return {
        planId: plan.id,
        baseVersion: 1,
        newVersion: 1,
        success: true,
        stillOverBudget: false,
        originalBudget,
        newBudget: originalBudget,
        plan,
        selections,
        adjustments: [],
        mainOverBudgetSource: null,
        message: "当前方案在预算内，无需调整。",
        createdAt: new Date().toISOString(),
      };
    }

    const mainOverBudgetSource = this.findMainSource(originalBudget);
    const adjustments: ReplanAdjustment[] = [];
    let current = clone(selections);
    let currentBudget = originalBudget;

    // 3) 逐步局部调整：每步选节省最大的候选，调整后立即重算
    while (currentBudget.isOverBudget && adjustments.length < MAX_ADJUSTMENTS) {
      const candidate = this.pickNextAdjustment(current, brief, dna, people, rooms, days);
      if (!candidate) break;

      const beforeLine = this.lineAmount(currentBudget, candidate.category);
      current = candidate.apply(current);
      const afterBudget = this.engine.calculate(brief, current);
      const afterLine = this.lineAmount(afterBudget, candidate.category);

      adjustments.push({
        id: "adj-" + String(adjustments.length + 1).padStart(2, "0"),
        category: candidate.category,
        label: candidate.label,
        detail: candidate.detail,
        originalAmount: beforeLine,
        newAmount: afterLine,
        savedAmount: Math.max(0, beforeLine - afterLine),
        reason: candidate.reason,
      });
      currentBudget = afterBudget;
    }

    const success = !currentBudget.isOverBudget;
    const v2 = this.buildVersion2(plan, success, adjustments.length);
    const message = success
      ? "已生成符合预算的新方案（V2），预计花费已控制在预算内。"
      : "已尽力局部压缩，仍超出预算；已保留当前方案（V1），未伪造结果。";

    return {
      planId: plan.id,
      baseVersion: 1,
      newVersion: 2,
      success,
      stillOverBudget: !success,
      originalBudget,
      newBudget: currentBudget,
      plan: v2,
      selections: current,
      adjustments,
      mainOverBudgetSource,
      message,
      createdAt: new Date().toISOString(),
    };
  }

  // 找出主要超支来源：非 other 分项中金额最大的一项
  private findMainSource(budget: BudgetSummary): ReplanResult["mainOverBudgetSource"] {
    const lines = budget.lines.filter((line) => line.key !== "other" && line.amount > 0);
    if (lines.length === 0) return null;
    lines.sort((a, b) => b.amount - a.amount);
    const main = lines[0];
    return { key: main.key, label: main.label, amount: main.amount };
  }

  private lineAmount(budget: BudgetSummary, key: ReplanCategory): number {
    return budget.lines.find((line) => line.key === key)?.amount ?? 0;
  }

  // 候选生成：住宿降级 → 交通降档 → 餐饮降档 → 削减可选活动 → 当地交通降档
  private pickNextAdjustment(
    selections: UserSelections,
    brief: TripBrief,
    dna: TravelDNA | null,
    people: number,
    rooms: number,
    days: number
  ): CandidateAdjustment | null {
    const candidates: CandidateAdjustment[] = [];

    // 1) 住宿：每个停留段选最低价档位
    for (const stay of selections.accommodationSelections) {
      const current = stay.options.find((option) => option.id === stay.selectedOptionId);
      if (!current) continue;
      const cheaper = stay.options
        .filter((option) => option.pricePerNight < current.pricePerNight)
        .sort((a, b) => a.pricePerNight - b.pricePerNight);
      if (cheaper.length === 0) continue;
      const best = cheaper[0];
      candidates.push({
        category: "accommodation",
        label: "住宿降级",
        detail: stay.label + "：" + current.name + " → " + best.name + "（" + stay.nights + " 晚）",
        reason: "酒店费用较高，因此将部分住宿调整为更低价方案。",
        estimatedSavings: (current.pricePerNight - best.pricePerNight) * stay.nights * rooms,
        apply: (next) => ({
          ...next,
          accommodationSelections: next.accommodationSelections.map((item) =>
            item.id === stay.id ? { ...item, selectedOptionId: best.id } : item
          ),
        }),
      });
    }

    // 2) 交通：仅对 AI 估算/未确认选项降档；不覆盖用户已确认的真实选择
    const avoidDrive =
      dna?.avoid?.includes("长时间驾驶") || brief.preferences.avoid.includes("long_drive");
    for (const segment of selections.transportSelections) {
      const current = segment.options.find((option) => option.id === segment.selectedOptionId);
      if (!current) continue;
      if (current.sourceType === "EXTERNAL_DATA" || current.sourceType === "USER_INPUT") continue;
      const cheaper = segment.options
        .filter(
          (option) => option.price < current.price && !(avoidDrive && option.mode === "DRIVE")
        )
        .sort((a, b) => a.price - b.price);
      if (cheaper.length === 0) continue;
      const best = cheaper[0];
      candidates.push({
        category: "transport",
        label: "交通降档",
        detail: segment.label + "：" + TRANSPORT_MODE_LABEL[current.mode] + " → " + TRANSPORT_MODE_LABEL[best.mode],
        reason: "长途交通占比较高，更换为更经济的交通方式。",
        estimatedSavings: (current.price - best.price) * people,
        apply: (next) => ({
          ...next,
          transportSelections: next.transportSelections.map((item) =>
            item.id === segment.id ? { ...item, selectedOptionId: best.id } : item
          ),
        }),
      });
    }

    // 3) 餐饮：降一档更经济的餐标
    const food = selections.foodOptions.find((option) => option.id === selections.foodPreferenceId);
    if (food) {
      const cheaper = selections.foodOptions
        .filter(
          (option) =>
            FOOD_PRIORITY.indexOf(option.id) >= 0 &&
            FOOD_PRIORITY.indexOf(option.id) < FOOD_PRIORITY.indexOf(food.id)
        )
        .sort((a, b) => foodMid(a) - foodMid(b));
      if (cheaper.length > 0) {
        const best = cheaper[0];
        candidates.push({
          category: "food",
          label: "餐饮降档",
          detail: food.label + " → " + best.label + "（每人每天）",
          reason: "餐饮费用较高，降低每日餐标以节省预算。",
          estimatedSavings: (foodMid(food) - foodMid(best)) * people * days,
          apply: (next) => ({ ...next, foodPreferenceId: best.id }),
        });
      }
    }

    // 4) 门票/活动：取消最高价的可选活动
    const removableActivities = selections.activitySelections.options
      .filter(
        (option) =>
          option.optional && selections.activitySelections.selectedOptionIds.includes(option.id)
      )
      .sort((a, b) => b.cost - a.cost);
    if (removableActivities.length > 0) {
      const target = removableActivities[0];
      candidates.push({
        category: "tickets",
        label: "削减可选活动",
        detail: "取消：" + target.title,
        reason: "该活动为可选项，取消后不影响主线行程。",
        estimatedSavings: target.cost * people,
        apply: (next) => ({
          ...next,
          activitySelections: {
            ...next.activitySelections,
            selectedOptionIds: next.activitySelections.selectedOptionIds.filter(
              (id) => id !== target.id
            ),
          },
        }),
      });
    }

    // 5) 当地交通：降档更经济的方式
    const local = selections.localTransportOptions.find(
      (option) => option.id === selections.localTransportId
    );
    if (local) {
      const cheaper = selections.localTransportOptions
        .filter(
          (option) =>
            LOCAL_TRANSPORT_PRIORITY.indexOf(option.id) >= 0 &&
            LOCAL_TRANSPORT_PRIORITY.indexOf(option.id) < LOCAL_TRANSPORT_PRIORITY.indexOf(local.id)
        )
        .sort((a, b) => a.costPerPersonPerDay - b.costPerPersonPerDay);
      if (cheaper.length > 0) {
        const best = cheaper[0];
        candidates.push({
          category: "localTransport",
          label: "当地交通降档",
          detail: local.label + " → " + best.label,
          reason: "当地交通费用较高，更换为更经济的接驳方式。",
          estimatedSavings: (local.costPerPersonPerDay - best.costPerPersonPerDay) * people * days,
          apply: (next) => ({ ...next, localTransportId: best.id }),
        });
      }
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.estimatedSavings - a.estimatedSavings);
    return candidates[0];
  }

  // V2 方案：route 与 V1 完全一致（保证 Map/Timeline 正常），只调整标题/描述/标签
  private buildVersion2(plan: TripPlan, success: boolean, adjustmentCount: number): TripPlan {
    const prefix = success
      ? "已通过预算重规划（" + adjustmentCount + " 项局部调整）将总花费控制在预算内。"
      : "已尽力压缩（" + adjustmentCount + " 项局部调整），仍超出预算。";
    return {
      ...plan,
      id: plan.id + "-v2",
      title: "省钱版 · " + plan.title,
      desc: prefix + plan.desc,
      tags: plan.tags.includes("省钱优化") ? plan.tags : [...plan.tags, "省钱优化"],
    };
  }
}