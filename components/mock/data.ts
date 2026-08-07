import { TimelineItem } from "@/components/Timeline";

// ============================================================
// Travel DNA — Preferences
// ============================================================

export const dnaCategories = [
  {
    id: "style",
    label: "旅行风格",
    options: ["悠闲度假", "探险户外", "文化历史", "美食之旅", "都市探索", "自然风光"],
  },
  {
    id: "pace",
    label: "旅行节奏",
    options: ["慢节奏深度", "适中平衡", "紧凑高效"],
  },
  {
    id: "interest",
    label: "兴趣爱好",
    options: ["摄影打卡", "博物馆艺术", "户外运动", "购物逛街", "温泉养生", "夜生活"],
  },
  {
    id: "companion",
    label: "同行伙伴",
    options: ["独自旅行", "情侣出行", "家庭亲子", "朋友结伴"],
  },
];

// ============================================================
// Travel Requirements
// ============================================================

export const destinationTypes = ["不限", "城市", "海岛", "山野", "古镇", "异国风情"];

// ============================================================
// Multi-Agent Planning
// ============================================================

export interface AgentStep {
  agentId: string;
  agentName: string;
  icon: string;
  steps: {
    id: string;
    title: string;
    reasoning: string;
    status: "pending" | "decided" | "rejected";
  }[];
}

export const multiAgentSteps: AgentStep[] = [
  {
    agentId: "destination",
    agentName: "目的地匹配 Agent",
    icon: "MapPin",
    steps: [
      { id: "d1", title: "解析旅行偏好", reasoning: "根据 DNA 标签（文化历史 80%、美食 70%），计算偏好权重矩阵，锁定文化型目的地。", status: "decided" },
      { id: "d2", title: "过滤目的地库", reasoning: "从 200+ 目的地中按季节、预算、签证筛选，剩余 23 个候选。", status: "decided" },
      { id: "d3", title: "综合评分排序", reasoning: "多维度评分：匹配度 × 0.5 + 季节适宜 × 0.3 + 热度 × 0.2 → TOP 3：京都、清迈、巴厘岛。", status: "decided" },
    ],
  },
  {
    agentId: "route",
    agentName: "路线规划 Agent",
    icon: "Route",
    steps: [
      { id: "r1", title: "分析地理拓扑", reasoning: "京都景点集中在东山/岚山/市区三个区域，以区域为单位分组规划可减少通勤。", status: "decided" },
      { id: "r2", title: "优化每日动线", reasoning: "Day1 市区 → Day2 东山 → Day3 岚山 → Day4 西北 → Day5 市区返程，日均通勤 < 40min。", status: "decided" },
    ],
  },
  {
    agentId: "budget",
    agentName: "预算优化 Agent",
    icon: "Wallet",
    steps: [
      { id: "b1", title: "评估成本构成", reasoning: "机票 35% + 住宿 31% + 餐饮 18% + 交通 7% + 门票 9%，总计 ¥10,200 在中等预算范围内。", status: "decided" },
      { id: "b2", title: "优化建议", reasoning: "住宿可选胶囊酒店省 ¥800，但体验降级明显，建议保持当前方案。", status: "decided" },
    ],
  },
  {
    agentId: "experience",
    agentName: "体验设计 Agent",
    icon: "Sparkles",
    steps: [
      { id: "e1", title: "匹配兴趣标签", reasoning: "美食标签匹配：怀石料理、抹茶体验、锦市场巡礼。文化标签匹配：神社寺庙、茶道、和服。", status: "decided" },
      { id: "e2", title: "节奏平衡设计", reasoning: "每天 4-5 个活动，间隔散策+美食，避免博物馆疲劳。预留 Day4 下午弹性时间。", status: "decided" },
    ],
  },
];

// ============================================================
// Plans — Travel plan options
// ============================================================

export const travelPlans = [
  {
    id: "kyoto",
    destination: "京都",
    subtitle: "日本 · 关西",
    image: "",
    highlights: ["伏见稻荷大社千本鸟居", "怀石料理体验", "岚山竹林漫步", "抹茶茶道", "祇园花见小路"],
    estimatedCost: "¥8,000 - 12,000",
    matchScore: 94,
    duration: "5天4晚",
    summary: "千年古都的文化之旅，融合历史底蕴与舌尖上的京都味道。",
  },
  {
    id: "chiangmai",
    destination: "清迈",
    subtitle: "泰国 · 北部",
    image: "",
    highlights: ["素贴山双龙寺", "夜市美食巡礼", "大象保护营", "泰式烹饪课", "古城寺庙漫步"],
    estimatedCost: "¥4,000 - 7,000",
    matchScore: 87,
    duration: "5天4晚",
    summary: "慢节奏小城，超高性价比，寺庙与夜市交织的治愈之旅。",
  },
  {
    id: "bali",
    destination: "巴厘岛",
    subtitle: "印度尼西亚",
    image: "",
    highlights: ["乌布稻田秋千", "海神庙日落", "精油SPA", "悬崖酒吧", "水上寺庙"],
    estimatedCost: "¥6,000 - 10,000",
    matchScore: 81,
    duration: "5天4晚",
    summary: "神之岛屿，自然与灵性的完美结合，适合放松身心。",
  },
];

// ============================================================
// Map Route Data
// ============================================================

export interface MapWaypoint {
  id: string;
  name: string;
  day: number;
  lat: number;
  lng: number;
  type: "activity" | "meal" | "transport" | "rest" | "hotel";
}

export interface MapRouteDay {
  day: number;
  label: string;
  color: string;
  waypoints: MapWaypoint[];
}

export const mapRoutes: MapRouteDay[] = [
  {
    day: 1,
    label: "抵达·初探",
    color: "#6366f1",
    waypoints: [
      { id: "m1", name: "关西机场", day: 1, lat: 34.43, lng: 135.24, type: "transport" },
      { id: "m2", name: "京都站", day: 1, lat: 34.986, lng: 135.759, type: "transport" },
      { id: "m3", name: "酒店", day: 1, lat: 34.988, lng: 135.755, type: "hotel" },
      { id: "m4", name: "京都塔", day: 1, lat: 34.987, lng: 135.759, type: "activity" },
      { id: "m5", name: "先斗町", day: 1, lat: 35.005, lng: 135.771, type: "meal" },
    ],
  },
  {
    day: 2,
    label: "东山·经典",
    color: "#f59e0b",
    waypoints: [
      { id: "m6", name: "伏见稻荷", day: 2, lat: 34.967, lng: 135.773, type: "activity" },
      { id: "m7", name: "和果子店", day: 2, lat: 34.991, lng: 135.768, type: "activity" },
      { id: "m8", name: "锦市场", day: 2, lat: 35.004, lng: 135.766, type: "meal" },
      { id: "m9", name: "清水寺", day: 2, lat: 34.994, lng: 135.785, type: "activity" },
      { id: "m10", name: "祇园", day: 2, lat: 35.004, lng: 135.776, type: "meal" },
    ],
  },
  {
    day: 3,
    label: "岚山·自然",
    color: "#10b981",
    waypoints: [
      { id: "m11", name: "岚山竹林", day: 3, lat: 35.017, lng: 135.671, type: "activity" },
      { id: "m12", name: "天龙寺", day: 3, lat: 35.016, lng: 135.674, type: "activity" },
      { id: "m13", name: "汤豆腐", day: 3, lat: 35.015, lng: 135.677, type: "meal" },
      { id: "m14", name: "岚山小火车", day: 3, lat: 35.018, lng: 135.660, type: "transport" },
      { id: "m15", name: "渡月桥", day: 3, lat: 35.013, lng: 135.678, type: "activity" },
    ],
  },
  {
    day: 4,
    label: "西北·禅意",
    color: "#8b5cf6",
    waypoints: [
      { id: "m16", name: "金阁寺", day: 4, lat: 35.039, lng: 135.729, type: "activity" },
      { id: "m17", name: "龙安寺", day: 4, lat: 35.034, lng: 135.718, type: "activity" },
      { id: "m18", name: "一乘寺拉面", day: 4, lat: 35.042, lng: 135.790, type: "meal" },
      { id: "m19", name: "银阁寺", day: 4, lat: 35.027, lng: 135.798, type: "activity" },
      { id: "m20", name: "祇园夜", day: 4, lat: 35.004, lng: 135.776, type: "meal" },
    ],
  },
  {
    day: 5,
    label: "返程·余韵",
    color: "#ec4899",
    waypoints: [
      { id: "m21", name: "京都御所", day: 5, lat: 35.025, lng: 135.762, type: "activity" },
      { id: "m22", name: "一保堂茶铺", day: 5, lat: 35.009, lng: 135.768, type: "activity" },
      { id: "m23", name: "京都站美食", day: 5, lat: 34.986, lng: 135.759, type: "meal" },
      { id: "m24", name: "关西机场", day: 5, lat: 34.43, lng: 135.24, type: "transport" },
    ],
  },
];

// ============================================================
// Trip Detail — Day-by-day itinerary
// ============================================================

export const tripDetail = {
  id: "kyoto",
  destination: "京都",
  subtitle: "日本 · 关西",
  dates: "2026年9月15日 — 9月19日",
  weather: "秋季 · 20°C ~ 28°C · 宜人",
  mapCenter: { lat: 35.0, lng: 135.75 },
  budget: {
    total: "¥10,200",
    breakdown: [
      { label: "机票", amount: "¥3,500" },
      { label: "住宿", amount: "¥3,200" },
      { label: "餐饮", amount: "¥1,800" },
      { label: "交通", amount: "¥700" },
      { label: "门票活动", amount: "¥1,000" },
    ],
  },
  packingList: [
    "护照、签证",
    "舒适步行鞋",
    "薄外套（寺庙参观）",
    "充电宝、转换插头",
    "现金（部分小店仅收现金）",
    "ICOCA交通卡（可提前购买）",
  ],
};

export const tripTimeline: Record<string, TimelineItem[]> = {
  day1: [
    { time: "12:00", title: "抵达关西国际机场", description: "办理入境手续，乘坐HARUKA特急前往京都站", type: "transport" },
    { time: "14:00", title: "入住酒店", description: "京都站附近精品酒店，安顿行李稍作休息", type: "rest" },
    { time: "16:00", title: "京都塔观景", description: "登上京都塔俯瞰城市全景，感受千年古都的现代与传统的交融", type: "activity" },
    { time: "18:30", title: "先斗町晚餐", description: "在先斗町小巷品尝京都传统会席料理，体验鸭川纳凉床", type: "meal" },
  ],
  day2: [
    { time: "08:00", title: "伏见稻荷大社", description: "清晨前往千本鸟居，避开人潮，感受神秘的红色隧道", type: "activity" },
    { time: "11:00", title: "和果子手作体验", description: "在百年老铺学习制作传统和果子", type: "activity" },
    { time: "12:30", title: "锦市场午餐", description: "京都的厨房——锦市场，品尝烤鳗鱼、豆乳甜甜圈、渍物", type: "meal" },
    { time: "14:30", title: "清水寺 & 二年坂", description: "参拜清水寺，漫步二年坂三年坂石板路，租和服拍照", type: "activity" },
    { time: "18:00", title: "抹茶怀石", description: "在祇园附近的米其林推荐餐厅享用抹茶怀石料理", type: "meal" },
  ],
  day3: [
    { time: "09:00", title: "岚山竹林", description: "清晨漫步岚山竹林小径，在静谧中感受自然之美", type: "activity" },
    { time: "10:30", title: "天龙寺庭园", description: "参观世界文化遗产天龙寺，欣赏枯山水庭园", type: "activity" },
    { time: "12:00", title: "汤豆腐料理", description: "岚山名物——嵯峨野汤豆腐，清淡鲜美的京都味道", type: "meal" },
    { time: "14:00", title: "岚山小火车", description: "乘坐嵯峨野观光小火车沿保津川峡谷欣赏自然风光", type: "transport" },
    { time: "17:00", title: "渡月桥夕阳", description: "在渡月桥上欣赏夕阳西下，桂川水面倒映金色余晖", type: "activity" },
  ],
  day4: [
    { time: "08:30", title: "金阁寺", description: "参观金阁寺（鹿苑寺），阳光下金碧辉煌的舍利殿倒映在镜湖池中", type: "activity" },
    { time: "10:30", title: "龙安寺石庭", description: "静坐龙安寺方丈庭园，面对15块石头参禅冥想", type: "activity" },
    { time: "12:00", title: "京都拉面", description: "一乘寺拉面激战区，品尝浓郁豚骨背脂拉面", type: "meal" },
    { time: "14:00", title: "银阁寺 & 哲学之道", description: "参观银阁寺，沿哲学之道散步，感受东山文化", type: "activity" },
    { time: "18:00", title: "祇园夜游", description: "在祇园花见小路偶遇舞伎，晚餐享用鸭川川床料理", type: "meal" },
  ],
  day5: [
    { time: "09:00", title: "京都御所", description: "参观天皇旧居京都御所，了解日本皇家历史", type: "activity" },
    { time: "11:00", title: "抹茶体验", description: "在一保堂茶铺参加抹茶点茶体验，学习茶道礼仪", type: "activity" },
    { time: "12:30", title: "最后一餐", description: "京都站伊势丹百货美食街，自由选择最想回味的美食", type: "meal" },
    { time: "14:30", title: "前往关西机场", description: "乘坐HARUKA特急返回关西国际机场", type: "transport" },
  ],
};

// ============================================================
// Journey Mode — Gallery
// ============================================================

export const journeyMoments = [
  { id: "1", label: "伏见稻荷", desc: "千本鸟居的第一缕晨光" },
  { id: "2", label: "清水寺", desc: "悬空舞台俯瞰京都" },
  { id: "3", label: "岚山竹林", desc: "风吹竹叶的声音" },
  { id: "4", label: "金阁寺", desc: "镜湖池中的倒影" },
  { id: "5", label: "先斗町", desc: "鸭川边的会席料理" },
  { id: "6", label: "祇园", desc: "花见小路的夜" },
];
