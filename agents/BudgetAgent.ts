import { TripPlan, BudgetBreakdown } from "@/types/plan";

export class BudgetAgent {
  estimate(plan: TripPlan): BudgetBreakdown {
    const days = plan.route.length;

    // Count location changes (each change = transport cost)
    let locationChanges = 0;
    for (let i = 1; i < plan.route.length; i++) {
      if (plan.route[i].location !== plan.route[i - 1].location) {
        locationChanges++;
      }
    }

    // Base costs
    const transportPerChange = plan.budget < 6000 ? 200 : plan.budget > 10000 ? 600 : 400;
    const transport = 500 + locationChanges * transportPerChange;

    const hotelPerNight = plan.budget < 6000 ? 120 : plan.budget > 10000 ? 500 : 300;
    const hotel = days * hotelPerNight;

    const foodPerDay = plan.budget < 6000 ? 80 : plan.budget > 10000 ? 250 : 150;
    const food = days * foodPerDay;

    // Count activities that might need tickets
    const activityCount = plan.route.reduce((s, d) => s + d.activities.length, 0);
    const ticket = activityCount * 50;

    const other = Math.round((transport + hotel + food + ticket) * 0.1);

    return {
      transport, hotel, food, ticket, other,
      total: transport + hotel + food + ticket + other,
      note: locationChanges > 0
        ? "换城 " + locationChanges + " 次，" + (locationChanges > 3 ? "交通费用较高" : "路线合理")
        : "单城深度游，交通费用低",
    };
  }
}
