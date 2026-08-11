import { TripPlan, ReviewResult } from "@/types/plan";

export class ReviewAgent {
  review(plan: TripPlan): ReviewResult {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let score = plan.score;

    // Check per-day activity density
    for (const day of plan.route) {
      if (day.activities.length > 4) {
        warnings.push("Day " + day.day + " 活动 " + day.activities.length + " 个，建议精简");
        score -= 3;
      }
      if (day.activities.length <= 1 && day.day > 1 && day.day < plan.route.length) {
        suggestions.push("Day " + day.day + " 行程较空，可考虑增加活动");
      }
    }

    // Check location changes — consecutive different locations means travel
    let travelDays = 0;
    for (let i = 1; i < plan.route.length; i++) {
      if (plan.route[i].location !== plan.route[i - 1].location) {
        travelDays++;
        if (plan.route[i].activities.length > 3) {
          warnings.push("Day " + plan.route[i].day + " 换城日安排了 " + plan.route[i].activities.length + " 个活动");
          score -= 2;
        }
      }
    }
    if (travelDays > 3) {
      warnings.push(travelDays + " 天需要换城，节奏较紧凑");
      score -= 3;
    }

    // Photo route check
    if (plan.id === "photo") {
      const hasSunset = plan.route.some((d) =>
        d.activities.some((a) => a.includes("日落") || a.includes("日出") || a.includes("拍摄"))
      );
      if (!hasSunset) {
        suggestions.push("摄影路线建议增加日落/日出拍摄安排");
        score -= 2;
      }
    }

    // Budget route check
    if (plan.id === "budget") {
      const hasTransportWords = plan.route.some((d) =>
        d.activities.some((a) => a.includes("包车") || a.includes("租车"))
      );
      if (hasTransportWords) {
        warnings.push("性价比路线不宜包车，建议公共交通替代");
        score -= 5;
      }
    }

    score = Math.max(70, Math.min(98, score));

    return { score, warnings, suggestions };
  }
}
