import { TravelDNA, PersonalityProfile } from "@/types/travel";

export class PreferenceAgent {
  analyze(dna: TravelDNA): PersonalityProfile {
    const style = dna.style;
    const pace = dna.pace;
    const avoid = dna.avoid;

    const profiles: PersonalityProfile[] = [
      {
        persona: "光影猎手",
        emoji: "📷",
        summary: "你以镜头为眼，追逐日出日落与绝美构图。每一帧都是作品。",
        strengths: ["自然风光", "拍照", "小众机位"],
        watchOuts: avoid.length > 0 ? avoid : ["人太多", "排队"],
        bestMatch: "自然风光路线 + 自驾 + 弹性时间",
      },
      {
        persona: "味蕾旅行家",
        emoji: "🍜",
        summary: "你的旅行地图由美食标记，从街头小吃到精致餐厅。",
        strengths: ["美食", "本地推荐", "从早到晚"],
        watchOuts: avoid.length > 0 ? avoid : ["排队", "频繁换酒店"],
        bestMatch: "美食城市 + 夜市文化 + 手作体验",
      },
      {
        persona: "慢生活探索者",
        emoji: "🌿",
        summary: "你偏爱深度体验，享受旅途中的每一刻。不赶路，感受路。",
        strengths: ["自然风光", "历史文化", "深度体验"],
        watchOuts: avoid.length > 0 ? avoid : ["人太多", "太累"],
        bestMatch: "2-3 个核心目的地 + 精品民宿",
      },
      {
        persona: "高效打卡达人",
        emoji: "🏃",
        summary: "时间就是体验，你用最高效的方式收集世界。",
        strengths: ["覆盖广", "效率高", "行动力强"],
        watchOuts: avoid.length > 0 ? avoid : ["太累", "长时间坐车"],
        bestMatch: "城市密集区域 + 公共交通",
      },
      {
        persona: "家庭旅行规划师",
        emoji: "👨‍👩‍👧",
        summary: "舒适与安全第一，兼顾全家人的快乐。",
        strengths: ["舒适安全", "亲子友好", "节奏合理"],
        watchOuts: avoid.length > 0 ? avoid : ["太累", "频繁换酒店"],
        bestMatch: "一站式度假村 + 主题乐园",
      },
    ];

    if (style === "摄影旅行") return profiles[0];
    if (style === "美食旅行") return profiles[1];
    if (pace === "慢慢体验") return profiles[2];
    if (style === "特种兵旅行") return profiles[3];
    if (style === "家庭旅行") return profiles[4];
    return profiles[2]; // default: slow
  }
}
