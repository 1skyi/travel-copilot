import { TravelDNA, TravelPlan, DayPlan } from "@/types/travel";

export class PlannerAgent {
  generate(dna: TravelDNA): TravelPlan[] {
    const dest = dna.destination || "推荐目的地";
    const style = dna.style || "慢旅行";
    const budgetLabel = dna.budget === "low" ? "经济实惠" : dna.budget === "high" ? "高端体验" : "舒适中等";

    return [
      {
        id: "photo",
        name: style.includes("摄影") ? "极致摄影路线" : "经典风光路线",
        rating: 95,
        budget: budgetLabel,
        features: ["湖泊", "日落", "小众地点", "星空"],
        tag: "最佳匹配",
        desc: style + "专属定制 · " + dest + "风光精华",
        days: this.buildDays("photo", style),
      },
      {
        id: "food",
        name: style.includes("美食") ? "深度美食之旅" : "美食探索路线",
        rating: 89,
        budget: budgetLabel,
        features: ["夜市", "老字号", "私房菜", "手作体验"],
        tag: "性价比",
        desc: "舌尖上的" + dest + "，从街头到餐桌",
        days: this.buildDays("food", style),
      },
      {
        id: "slow",
        name: dna.pace === "慢慢体验" ? "治愈慢旅行" : "舒适慢旅",
        rating: 85,
        budget: budgetLabel,
        features: ["精品民宿", "温泉", "下午茶", "自驾"],
        tag: dna.pace === "慢慢体验" ? "首选推荐" : "舒适体验",
        desc: "不赶路，感受" + dest + "每一站的温度",
        days: this.buildDays("slow", style),
      },
    ];
  }

  private buildDays(variant: string, style: string): DayPlan[] {
    return [
      {
        day: 1,
        label: "Day 1 · 抵达",
        items: [
          { time: "12:00", title: "抵达目的地", desc: "接机/接站，入住酒店", type: "transport" },
          { time: "15:00", title: "城市初探", desc: "周边漫步，感受当地氛围", type: "activity" },
          { time: "18:00", title: "欢迎晚餐", desc: variant === "food" ? "夜市美食巡礼" : "当地特色餐厅", type: "meal" },
        ],
      },
      {
        day: 2,
        label: "Day 2 · 核心",
        items: [
          { time: "09:00", title: variant === "photo" ? "日出拍摄" : "主要景点", desc: variant === "photo" ? "黄金时刻出片" : "深度游览", type: "activity" },
          { time: "12:30", title: "午餐", desc: variant === "food" ? "老字号探店" : "当地风味", type: "meal" },
          { time: "14:00", title: style.includes("慢") ? "下午茶时光" : "下午行程", desc: style.includes("慢") ? "咖啡+甜品+发呆" : "继续探索", type: "activity" },
        ],
      },
      {
        day: 3,
        label: "Day 3 · 返程",
        items: [
          { time: "09:00", title: "自由活动", desc: "逛当地市场、购买伴手礼", type: "activity" },
          { time: "12:00", title: "告别午餐", desc: "最后一餐", type: "meal" },
          { time: "14:00", title: "前往机场/车站", desc: "返程", type: "transport" },
        ],
      },
    ];
  }
}
