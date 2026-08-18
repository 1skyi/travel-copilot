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
  "川西": {
    budgetBase: 6500,
    routes: [
      [
        { day: 1, location: "成都", activities: ["抵达", "宽窄巷子", "锦里"] },
        { day: 2, location: "康定", activities: ["泸定桥", "折多山", "康定情歌广场"] },
        { day: 3, location: "新都桥镇", activities: ["摄影天堂", "塔公草原", "雅拉雪山观景"] },
        { day: 4, location: "稻城", activities: ["海子山", "尊胜塔林", "香格里拉镇"] },
        { day: 5, location: "稻城亚丁", activities: ["亚丁景区", "冲古寺", "珍珠海"] },
        { day: 6, location: "成都", activities: ["返程成都", "人民公园", "川剧表演"] },
        { day: 7, location: "成都", activities: ["熊猫基地", "购物", "返程"] },
      ],
      [
        { day: 1, location: "成都", activities: ["抵达", "春熙路", "太古里"] },
        { day: 2, location: "海螺沟冰川", activities: ["冰川森林公园", "红石滩", "温泉"] },
        { day: 3, location: "泸定", activities: ["泸定桥", "磨西古镇", "燕子沟"] },
        { day: 4, location: "康定", activities: ["木格措", "跑马山", "康定古城"] },
        { day: 5, location: "丹巴", activities: ["甲居藏寨", "梭坡碉楼", "中路藏寨"] },
        { day: 6, location: "成都", activities: ["返回", "玉林路", "川味火锅"] },
        { day: 7, location: "成都", activities: ["自由活动", "返程"] },
      ],
      [
        { day: 1, location: "成都", activities: ["抵达", "人民公园", "天府广场"] },
        { day: 2, location: "都江堰", activities: ["都江堰景区", "南桥", "灌县古城"] },
        { day: 3, location: "青城山", activities: ["青城前山", "天师洞", "老君阁"] },
        { day: 4, location: "成都", activities: ["熊猫基地", "东郊记忆", "九眼桥"] },
        { day: 5, location: "成都", activities: ["金沙遗址", "杜甫草堂", "锦江夜游"] },
        { day: 6, location: "成都", activities: ["博物馆", "购物", "盖碗茶"] },
        { day: 7, location: "成都", activities: ["自由活动", "返程"] },
      ],
    ],
  },
  "西藏": {
    budgetBase: 9000,
    routes: [
      [
        { day: 1, location: "拉萨", activities: ["抵达", "八廓街", "布达拉宫广场夜景"] },
        { day: 2, location: "拉萨", activities: ["布达拉宫", "大昭寺", "色拉寺辩经"] },
        { day: 3, location: "纳木错", activities: ["圣湖纳木错", "扎西半岛", "星空"] },
        { day: 4, location: "羊卓雍措", activities: ["羊湖观景台", "卡若拉冰川", "日喀则"] },
        { day: 5, location: "日喀则", activities: ["扎什伦布寺", "宗山古堡", "江孜"] },
        { day: 6, location: "拉萨", activities: ["返回", "罗布林卡", "甜茶馆"] },
        { day: 7, location: "拉萨", activities: ["购物", "返程"] },
      ],
      [
        { day: 1, location: "拉萨", activities: ["抵达", "适应海拔", "八廓街"] },
        { day: 2, location: "林芝", activities: ["巴松措", "鲁朗林海", "石锅鸡"] },
        { day: 3, location: "林芝", activities: ["雅鲁藏布大峡谷", "南迦巴瓦峰观景"] },
        { day: 4, location: "山南", activities: ["桑耶寺", "雍布拉康", "泽当"] },
        { day: 5, location: "拉萨", activities: ["布达拉宫", "大昭寺", "文成公主演出"] },
        { day: 6, location: "拉萨", activities: ["纳木错一日游", "星空拍摄"] },
        { day: 7, location: "拉萨", activities: ["购物", "返程"] },
      ],
      [
        { day: 1, location: "拉萨", activities: ["抵达", "适应海拔", "布达拉宫广场"] },
        { day: 2, location: "拉萨", activities: ["布达拉宫", "大昭寺", "八廓街"] },
        { day: 3, location: "拉萨", activities: ["色拉寺", "哲蚌寺", "甜茶馆"] },
        { day: 4, location: "纳木错", activities: ["纳木错一日游", "扎西半岛"] },
        { day: 5, location: "拉萨", activities: ["罗布林卡", "西藏博物馆", "夜游布宫"] },
        { day: 6, location: "拉萨", activities: ["购物", "藏餐体验"] },
        { day: 7, location: "拉萨", activities: ["返程"] },
      ],
    ],
  },
  "海南": {
    budgetBase: 5500,
    routes: [
      [
        { day: 1, location: "海口", activities: ["抵达", "骑楼老街", "假日海滩"] },
        { day: 2, location: "文昌", activities: ["东郊椰林", "石头公园", "航天科普中心"] },
        { day: 3, location: "万宁", activities: ["日月湾", "石梅湾", "兴隆热带植物园"] },
        { day: 4, location: "三亚", activities: ["海棠湾", "后海村", "夜市"] },
        { day: 5, location: "三亚", activities: ["亚龙湾", "热带天堂森林公园", "日落"] },
        { day: 6, location: "海口", activities: ["返回", "海鲜市场", "免税店"] },
        { day: 7, location: "海口", activities: ["返程"] },
      ],
      [
        { day: 1, location: "海口", activities: ["抵达", "骑楼老街", "假日海滩"] },
        { day: 2, location: "三亚", activities: ["三亚湾", "椰梦长廊", "第一市场"] },
        { day: 3, location: "三亚", activities: ["亚龙湾", "热带天堂森林公园"] },
        { day: 4, location: "蜈支洲岛", activities: ["蜈支洲岛一日游", "潜水", "环岛电瓶车"] },
        { day: 5, location: "南山", activities: ["南山文化旅游区", "海上观音", "天涯海角"] },
        { day: 6, location: "海口", activities: ["返回", "火山口地质公园"] },
        { day: 7, location: "海口", activities: ["免税店", "返程"] },
      ],
      [
        { day: 1, location: "海口", activities: ["抵达", "骑楼老街", "海大南门夜市"] },
        { day: 2, location: "海口", activities: ["火山口", "假日海滩", "观澜湖"] },
        { day: 3, location: "三亚", activities: ["高铁至三亚", "三亚湾", "椰梦长廊"] },
        { day: 4, location: "三亚", activities: ["亚龙湾", "大东海", "第一市场"] },
        { day: 5, location: "三亚", activities: ["后海村", "海棠湾", "免税店"] },
        { day: 6, location: "海口", activities: ["返回", "骑楼小吃街"] },
        { day: 7, location: "海口", activities: ["返程"] },
      ],
    ],
  },
  "青海": {
    budgetBase: 6000,
    routes: [
      [
        { day: 1, location: "西宁", activities: ["抵达", "东关清真大寺", "莫家街"] },
        { day: 2, location: "青海湖", activities: ["二郎剑景区", "环湖骑行", "湖畔日落"] },
        { day: 3, location: "茶卡盐湖", activities: ["天空之镜", "盐雕广场", "星空拍摄"] },
        { day: 4, location: "大柴旦", activities: ["翡翠湖", "雅丹地貌", "大柴旦湖"] },
        { day: 5, location: "德令哈", activities: ["克鲁克湖", "托素湖", "外星人遗址"] },
        { day: 6, location: "西宁", activities: ["返回", "塔尔寺", "手抓羊肉"] },
        { day: 7, location: "西宁", activities: ["购物", "返程"] },
      ],
      [
        { day: 1, location: "西宁", activities: ["抵达", "东关清真大寺", "水井巷"] },
        { day: 2, location: "塔尔寺", activities: ["塔尔寺", "藏医药博物馆", "西宁夜景"] },
        { day: 3, location: "青海湖", activities: ["二郎剑", "环湖西路", "黑马河"] },
        { day: 4, location: "茶卡盐湖", activities: ["天空之镜", "盐湖日落"] },
        { day: 5, location: "祁连", activities: ["卓尔山", "阿咪东索", "祁连草原"] },
        { day: 6, location: "门源", activities: ["百里油菜花海", "达坂山观景", "返回西宁"] },
        { day: 7, location: "西宁", activities: ["购物", "返程"] },
      ],
      [
        { day: 1, location: "西宁", activities: ["抵达", "莫家街", "中心广场"] },
        { day: 2, location: "西宁", activities: ["塔尔寺", "青海省博物馆", "南山公园"] },
        { day: 3, location: "青海湖", activities: ["青海湖一日游", "二郎剑"] },
        { day: 4, location: "西宁", activities: ["东关清真大寺", "北山土楼观", "水井巷"] },
        { day: 5, location: "西宁", activities: ["丹噶尔古城", "湟源", "农家院"] },
        { day: 6, location: "西宁", activities: ["购物", "手抓羊肉"] },
        { day: 7, location: "西宁", activities: ["返程"] },
      ],
    ],
  },
  "泰国": {
    budgetBase: 7500,
    routes: [
      [
        { day: 1, location: "曼谷", activities: ["抵达", "考山路", "湄南河夜游"] },
        { day: 2, location: "曼谷", activities: ["大皇宫", "玉佛寺", "卧佛寺"] },
        { day: 3, location: "大城", activities: ["大城遗址", "玛哈泰寺", "水上市场"] },
        { day: 4, location: "清迈", activities: ["清迈古城", "契迪龙寺", "周日夜市"] },
        { day: 5, location: "清莱", activities: ["白庙", "黑庙", "金三角"] },
        { day: 6, location: "清迈", activities: ["素贴山", "双龙寺", "宁曼路"] },
        { day: 7, location: "曼谷", activities: ["返回", "暹罗广场", "返程"] },
      ],
      [
        { day: 1, location: "曼谷", activities: ["抵达", "大皇宫", "考山路"] },
        { day: 2, location: "芭提雅", activities: ["海滩", "格兰岛", "蒂芬妮人妖秀"] },
        { day: 3, location: "普吉岛", activities: ["芭东海滩", "西蒙人妖秀", "海鲜夜市"] },
        { day: 4, location: "普吉岛", activities: ["大小PP岛一日游", "浮潜", "玛雅湾"] },
        { day: 5, location: "普吉岛", activities: ["神仙半岛", "查龙寺", "卡塔海滩日落"] },
        { day: 6, location: "曼谷", activities: ["返回", "暹罗商圈", "拉差达夜市"] },
        { day: 7, location: "曼谷", activities: ["购物", "返程"] },
      ],
      [
        { day: 1, location: "曼谷", activities: ["抵达", "考山路", "湄南河渡轮"] },
        { day: 2, location: "曼谷", activities: ["大皇宫", "玉佛寺", "恰图恰市场"] },
        { day: 3, location: "清迈", activities: ["火车至清迈", "古城", "周日夜市"] },
        { day: 4, location: "清迈", activities: ["素贴山", "双龙寺", "宁曼路"] },
        { day: 5, location: "清迈", activities: ["大象营", "泰餐烹饪课", "夜市"] },
        { day: 6, location: "曼谷", activities: ["返回", "暹罗广场", "购物"] },
        { day: 7, location: "曼谷", activities: ["返程"] },
      ],
    ],
  },
};

// 模板库未覆盖的目的地：以目的地名作为每天地点（可真实定位），
// 不使用 "Day N" 占位名（占位名无法通过真实 Geocoding）。
function getDefaultRoutes(destination: string, days: number): RouteTemplate[] {
  const base: RouteTemplate = [];
  for (let i = 1; i <= days; i++) {
    base.push({ day: i, location: destination, activities: i === 1 ? ["抵达", "城市探索"] : i === days ? ["自由活动", "返程"] : ["景点游览", "当地美食"] });
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

    const destData = destinations[destination] || { routes: getDefaultRoutes(destination, days), budgetBase: 0 };

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
