import { TripPlan, BudgetBreakdown, BudgetLineItem } from "@/types/plan";

// 预算硬约束：只读取用户 TripBrief 计算的 totalBudget，
// 不修改用户预算，也不为满足预算而伪造真实成本。
export class BudgetAgent {
  estimate(plan: TripPlan, totalBudget: number, travelerCount: number): BudgetBreakdown {
    const days = plan.route.length;
    const people = Math.max(1, travelerCount);

    let locationChanges = 0;
    for (let i = 1; i < plan.route.length; i++) {
      if (plan.route[i].location !== plan.route[i - 1].location) {
        locationChanges++;
      }
    }

    const activityCount = plan.route.reduce((s, d) => s + d.activities.length, 0);

    // 当前阶段没有航班/酒店/铁路/门票真实 API，因此全部为 AI 估算。
    // sourceType 仍显式标记，禁止无来源金额进入 UI。
    const line = (
      amount: number,
      source: string = "AI_ESTIMATE",
      minAmount: number = Math.round(amount * 0.85),
      maxAmount: number = Math.round(amount * 1.2)
    ): BudgetLineItem => ({
      amount: Math.round(amount),
      minAmount,
      maxAmount,
      source,
      sourceType: "AI_ESTIMATE",
    });

    const transport = line(locationChanges * 380 * people + 400);
    const accommodation = line(days * (220 + people * 60));
    const food = line(days * people * 120);
    const tickets = line(activityCount * 55);
    const localTransport = line(days * people * 70);
    const other = line((locationChanges > 0 ? 300 : 150) + days * 40);

    const items = [transport, accommodation, food, tickets, localTransport, other];
    const knownCost = 0; // 本阶段没有 EXTERNAL_DATA，已知成本为 0
    const estimatedMin = items.reduce((sum, item) => sum + item.minAmount, 0);
    const estimatedMax = items.reduce((sum, item) => sum + item.maxAmount, 0);
    const total = items.reduce((sum, item) => sum + item.amount, 0);

    const remainingMin = totalBudget - estimatedMax;
    const remainingMax = totalBudget - estimatedMin;
    const overBudget = estimatedMin > totalBudget;

    return {
      transport,
      accommodation,
      food,
      tickets,
      localTransport,
      other,
      knownCost,
      estimatedMin,
      estimatedMax,
      remainingMin,
      remainingMax,
      total,
      overBudget,
      note: overBudget
        ? "当前预算无法覆盖该行程。建议：缩短天数、提高预算、降低交通成本，或更换目的地。"
        : "预算覆盖正常。",
    };
  }
}