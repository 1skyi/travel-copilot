import { TravelDNA, PersonalityProfile } from "@/types/travel";
import { PlannerInput } from "@/types/plan";

export interface PlanningConstraints {
  priorities: string[];
  avoids: string[];
  paceLabel: string;
  budgetLevel: "low" | "medium" | "high";
}

export class PreferenceAgent {
  analyze(dna: TravelDNA): PlanningConstraints {
    const priorities: string[] = [];
    const avoids: string[] = [];

    if (dna.style === "摄影旅行") {
      priorities.push("日出日落拍摄点", "小众景观", "停留时间>=2小时");
    } else if (dna.style === "美食旅行") {
      priorities.push("当地美食集中区", "夜市", "老字号");
    } else if (dna.style === "慢旅行") {
      priorities.push("深度体验", "自然景观", "精品民宿周边");
    } else if (dna.style === "特种兵旅行") {
      priorities.push("高效率路线", "多景点覆盖", "公共交通便利");
    } else if (dna.style === "家庭旅行") {
      priorities.push("安全舒适", "亲子设施", "轻松节奏");
    }

    if (dna.interest.includes("自然风光")) priorities.push("自然景观优先");
    if (dna.interest.includes("历史文化")) priorities.push("文化遗产地");
    if (dna.interest.includes("拍照")) priorities.push("摄影机位");
    if (dna.interest.includes("美食")) priorities.push("本地美食路线");

    dna.avoid.forEach((a) => avoids.push(a));

    const paceLabel = dna.pace === "慢慢体验" ? "慢" : dna.pace === "快速探索" ? "快" : "适中";
    const budgetLevel = (dna.budget || "medium") as "low" | "medium" | "high";

    return { priorities, avoids, paceLabel, budgetLevel };
  }

  buildProfile(dna: TravelDNA): PersonalityProfile {
    const style = dna.style;
    const avoid = dna.avoid;

    const profiles: Record<string, PersonalityProfile> = {
      "摄影旅行": {
        persona: "光影猎手", emoji: "📷",
        summary: "你以镜头为眼，追逐日出日落与绝美构图。",
        strengths: ["自然风光", "拍照", "小众机位"],
        watchOuts: avoid.length > 0 ? avoid : ["人太多", "排队"],
        bestMatch: "自然风光路线 + 自驾 + 弹性时间",
      },
      "美食旅行": {
        persona: "味蕾旅行家", emoji: "🍜",
        summary: "你的旅行地图由美食标记，从街头到餐桌。",
        strengths: ["美食", "本地推荐", "夜市"],
        watchOuts: avoid.length > 0 ? avoid : ["排队", "频繁换酒店"],
        bestMatch: "美食城市 + 夜市文化 + 手作体验",
      },
      "慢旅行": {
        persona: "慢生活探索者", emoji: "🌿",
        summary: "你偏爱深度体验，不赶路，感受路。",
        strengths: ["自然风光", "历史文化", "深度体验"],
        watchOuts: avoid.length > 0 ? avoid : ["人太多", "太累"],
        bestMatch: "2-3 个核心目的地 + 精品民宿",
      },
      "特种兵旅行": {
        persona: "高效打卡达人", emoji: "🏃",
        summary: "时间就是体验，高效收集世界。",
        strengths: ["覆盖广", "效率高", "行动力强"],
        watchOuts: avoid.length > 0 ? avoid : ["太累", "长时间坐车"],
        bestMatch: "城市密集区 + 公共交通",
      },
      "家庭旅行": {
        persona: "家庭旅行规划师", emoji: "👨‍👩‍👧",
        summary: "舒适安全第一，兼顾全家快乐。",
        strengths: ["舒适安全", "亲子友好", "节奏合理"],
        watchOuts: avoid.length > 0 ? avoid : ["太累", "频繁换酒店"],
        bestMatch: "度假村 + 主题乐园",
      },
    };

    return profiles[style] || profiles["慢旅行"];
  }

  convertToPrompt(dna: TravelDNA): string {
    const c = this.analyze(dna);
    let prompt = "规划约束：\n";
    prompt += "优先：" + c.priorities.join("、") + "\n";
    prompt += "避免：" + c.avoids.join("、") + "\n";
    prompt += "节奏：" + c.paceLabel;
    return prompt;
  }
}
