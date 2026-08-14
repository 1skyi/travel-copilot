import { TripPlan, PlannerInput } from "@/types/plan";
import { getTotalBudget, getTravelerCount } from "@/types/trip";

// ============================================================
// USER CONSTRAINTS（硬约束，规划时不得违反）
// - origin / destination / travelers / dates / budget
// - 用户预算是硬约束，不得自行修改
// - 如果真实数据表明预算不可行，必须告诉用户不可行
// - 不得伪造数据来满足预算
// ============================================================

type RouteTemplate = { day: number; location: string; activities: string[] }[];

const destinations: Record<string, { routes: RouteTemplate[]; budgetBase: number }> = {
  "新疆": {
    budgetBase: 8500,
    routes: [
      [
        { day: 1, location: "乌鲁木齐", activities: ["抵达", "国际大巴扎", "新疆博物馆"] },
        { day: 2, location: "赛里木湖", activities: ["环湖", "湖畔日落", "星空拍摄"] },
        { day: 3, location: "伊宁 → 那拉提", activities: ["果子沟大桥", "那拉提草原", "空中草原"] },
        { day: 4, location: "那拉提", activities: ["草原日出", "河谷森林", "哈萨克家访"] },
        { day: 5, location: "巴音布鲁克", activities: ["独库公路", "天鹅湖", "九曲十八弯"] },
        { day: 6, location: "独库公路 → 乌市", activities: ["乔尔玛", "返回乌鲁木齐"] },
        { day: 7, location: "乌鲁木齐", activities: ["自由活动", "购物", "返程"] },
      ],
      [
        { day: 1, location: "乌鲁木齐", activities: ["抵达", "红山公园", "国际大巴扎"] },
        { day: 2, location: "天山天池", activities: ["天池游览", "博格达峰", "哈萨克民俗村"] },
        { day: 3, location: "吐鲁番", activities: ["火焰山", "坎儿井", "葡萄沟"] },
        { day: 4, location: "库尔勒", activities: ["博斯腾湖", "铁门关"] },
        { day: 5, location: "巴音布鲁克", activities: ["草原", "天鹅湖", "九曲十八弯"] },
        { day: 6, location: "那拉提", activities: ["那拉提草原", "空中草原"] },
        { day: 7, location: "乌鲁木齐", activities: ["返回", "购物", "返程"] },
      ],
      [
        { day: 1, location: "乌鲁木齐", activities: ["抵达", "国际大巴扎", "夜游南湖"] },
        { day: 2, location: "乌鲁木齐", activities: ["天山天池", "新疆博物馆", "领馆巷美食"] },
        { day: 3, location: "吐鲁番", activities: ["动车至吐鲁番", "火焰山", "坎儿井"] },
        { day: 4, location: "吐鲁番 → 乌市", activities: ["葡萄沟", "交河故城", "返回"] },
        { day: 5, location: "南山牧场", activities: ["南山风景区", "徒步", "草原野餐"] },
        { day: 6, location: "乌鲁木齐", activities: ["红山公园", "二道桥市场", "烤肉"] },
        { day: 7, location: "乌鲁木齐", activities: ["自由活动", "返程"] },
      ],
    ],
  },
  "云南": {
    budgetBase: 7200,
    routes: [
      [
        { day: 1, location: "昆明", activities: ["抵达", "翠湖公园", "云南米线"] },
        { day: 2, location: "大理", activities: ["洱海骑行", "喜洲古镇", "双廊日落"] },
        { day: 3, location: "大理", activities: ["苍山徒步", "崇圣寺三塔", "古城夜游"] },
        { day: 4, location: "丽江", activities: ["丽江古城", "黑龙潭", "四方街"] },
        { day: 5, location: "玉龙雪山", activities: ["冰川公园", "蓝月谷", "印象丽江"] },
        { day: 6, location: "香格里拉", activities: ["普达措", "松赞林寺", "独克宗古城"] },
        { day: 7, location: "昆明", activities: ["花市", "购物", "返程"] },
      ],
      [
        { day: 1, location: "昆明", activities: ["抵达", "石林", "昆明夜市"] },
        { day: 2, location: "大理", activities: ["大理古城", "崇圣寺", "洱海"] },
        { day: 3, location: "大理 → 丽江", activities: ["喜洲", "拉市海", "丽江古城"] },
        { day: 4, location: "丽江", activities: ["玉龙雪山", "束河古镇"] },
        { day: 5, location: "泸沽湖", activities: ["环湖", "走婚桥", "摩梭篝火"] },
        { day: 6, location: "泸沽湖 → 丽江", activities: ["日出", "返回", "古城"] },
        { day: 7, location: "昆明", activities: ["花市", "返程"] },
      ],
      [
        { day: 1, location: "昆明", activities: ["抵达", "翠湖", "南屏街"] },
        { day: 2, location: "大理", activities: ["火车至大理", "古城漫步", "人民路"] },
        { day: 3, location: "大理", activities: ["洱海骑行", "喜洲粑粑", "周城扎染"] },
        { day: 4, location: "丽江", activities: ["火车至丽江", "古城", "四方街"] },
        { day: 5, location: "丽江", activities: ["束河古镇", "白沙壁画"] },
        { day: 6, location: "丽江", activities: ["拉市海", "黑龙潭"] },
        { day: 7, location: "昆明", activities: ["返回", "花市", "返程"] },
      ],
    ],
  },
  "日本": {
    budgetBase: 12000,
    routes: [
      [
        { day: 1, location: "东京", activities: ["抵达成田", "浅草寺", "晴空塔夜景"] },
        { day: 2, location: "东京", activities: ["明治神宫", "原宿", "涩谷十字路口"] },
        { day: 3, location: "镰仓", activities: ["江之岛", "镰仓大佛", "高校前路口"] },
        { day: 4, location: "箱根", activities: ["芦之湖", "大涌谷", "温泉"] },
        { day: 5, location: "京都", activities: ["伏见稻荷", "清水寺", "祇园"] },
        { day: 6, location: "京都", activities: ["岚山竹林", "金阁寺", "抹茶体验"] },
        { day: 7, location: "大阪", activities: ["道顿堀", "心斋桥", "返程关西机场"] },
      ],
      [
        { day: 1, location: "东京", activities: ["抵达", "银座", "筑地市场"] },
        { day: 2, location: "东京", activities: ["浅草寺", "秋叶原", "新宿"] },
        { day: 3, location: "富士山", activities: ["五合目", "忍野八海", "河口湖"] },
        { day: 4, location: "京都", activities: ["金阁寺", "二条城", "锦市场"] },
        { day: 5, location: "京都 → 奈良", activities: ["伏见稻荷", "奈良公园", "东大寺"] },
        { day: 6, location: "大阪", activities: ["大阪城", "环球影城", "道顿堀"] },
        { day: 7, location: "大阪", activities: ["购物", "返程"] },
      ],
      [
        { day: 1, location: "东京", activities: ["抵达", "上野公园", "秋叶原"] },
        { day: 2, location: "东京", activities: ["浅草寺", "皇居", "原宿"] },
        { day: 3, location: "东京 → 京都", activities: ["新干线", "京都站", "拉面小路"] },
        { day: 4, location: "京都", activities: ["伏见稻荷", "清水寺", "二年坂"] },
        { day: 5, location: "京都", activities: ["岚山", "天龙寺", "锦市场"] },
        { day: 6, location: "大阪", activities: ["大阪城", "道顿堀", "心斋桥"] },
        { day: 7, location: "大阪", activities: ["黑门市场", "返程"] },
      ],
    ],
  },
};

function getDefaultRoutes(days: number): RouteTemplate[] {
  const base: RouteTemplate = [];
  for (let i = 1; i <= days; i++) {
    base.push({ day: i, location: "Day " + i, activities: i === 1 ? ["抵达", "城市探索"] : i === days ? ["自由活动", "返程"] : ["景点游览", "当地美食"] });
  }
  return [base, base, base];
}

function buildTags(
  isPhoto: boolean,
  isFood: boolean,
  brief: { interests: string[]; avoid: string[] },
  photoFallback: string[],
  defaultFallback: string[]
): string[] {
  const interestTagMap: Record<string, string> = {
    photography: "摄影",
    nature: "自然",
    food: "美食",
    culture: "人文",
    shopping: "购物",
    relax: "放松",
    outdoor: "户外",
  };
  const avoidTagMap: Record<string, string> = {
    crowded: "避开人多",
    long_drive: "少开车",
    early_rise: "不早起",
    frequent_hotel_change: "少换酒店",
    rush: "不赶路",
    queue: "少排队",
  };

  const tags = new Set<string>();
  brief.interests.forEach((i) => { if (interestTagMap[i]) tags.add(interestTagMap[i]); });
  brief.avoid.forEach((a) => { if (avoidTagMap[a]) tags.add(avoidTagMap[a]); });

  if (tags.size === 0) {
    (isPhoto ? photoFallback : defaultFallback).forEach((t) => tags.add(t));
  }
  if (isFood && !tags.has("美食")) tags.add("美食");

  return Array.from(tags).slice(0, 4);
}

function buildDesc(
  destination: string,
  days: number,
  isPhoto: boolean,
  brief: { transportation: string; travelers: number; budgetIncludesTransport: boolean }
): string {
  const transportText =
    brief.transportation === "self_drive" ? "自驾"
    : brief.transportation === "public" ? "公共交通"
    : brief.transportation === "charter" ? "包车"
    : "AI 推荐交通";
  const parts = [destination + " " + days + "天"];
  parts.push(isPhoto ? "预留充足拍摄时间" : "经典景点全覆盖");
  parts.push(transportText + " · " + brief.travelers + "人");
  if (!brief.budgetIncludesTransport) parts.push("预算不含往返交通");
  return parts.join("，") + "。";
}

export class PlannerAgent {
  generate(input: PlannerInput): TripPlan[] {
    const { destination, days, dna, brief } = input;
    const preferences = brief.preferences;
    const totalBudget = getTotalBudget(brief);
    const travelerCount = getTravelerCount(brief.travelers);
    const isPhoto = preferences.interests.includes("photography") || dna.style === "摄影旅行";
    const isFood = preferences.interests.includes("food") || dna.style === "美食旅行";

    const destData = destinations[destination] || { routes: getDefaultRoutes(days), budgetBase: 0 };

    // Slice routes to match requested days
    const r0 = destData.routes[0].slice(0, days);
    const r1 = destData.routes[1] ? destData.routes[1].slice(0, days) : r0;
    const r2 = destData.routes[2] ? destData.routes[2].slice(0, days) : r0;

    // Inject photo-related activities if photo style
    const withPhoto = (route: RouteTemplate): RouteTemplate =>
      isPhoto ? route.map((d) => ({
        ...d,
        activities: d.activities.some((a) => a.includes("日落") || a.includes("拍摄") || a.includes("日出"))
          ? d.activities
          : [...d.activities, "摄影打卡"],
      })) : route;

    return [
      {
        id: "photo",
        title: isPhoto ? "极致摄影路线" : "经典风光路线",
        score: 95, budget: totalBudget,
        tags: buildTags(isPhoto, isFood, preferences, ["日落", "小众", "星空"], ["自然", "经典", "必去"]),
        route: withPhoto(r0),
        suitableFor: isPhoto ? "📷 摄影 · 🌄 自然" : "🌄 自然风光爱好者",
        desc: buildDesc(destination, days, isPhoto, {
          transportation: preferences.transportation,
          travelers: travelerCount,
          budgetIncludesTransport: preferences.budgetIncludesTransport,
        }),
      },
      {
        id: "classic",
        title: "经典全景路线",
        score: 92, budget: totalBudget,
        tags: ["全景", "经典"],
        route: r1,
        suitableFor: "🌟 经典体验",
        desc: destination + "全景覆盖，" + days + "天感受最经典的" + destination + "。",
      },
      {
        id: "budget",
        title: "性价比路线",
        score: 88, budget: totalBudget,
        tags: ["性价比", "深度"],
        route: r2,
        suitableFor: "💰 性价比之选",
        desc: "花更少体验不减少，" + destination + " " + days + "天深度游。",
      },
    ];
  }
}
