import { JourneyState, JourneyInput, TimelineActivity } from "@/types/plan";

const WEATHER_POOL = [
  { temp: "22°C", desc: "晴朗", icon: "Sun" },
  { temp: "18°C", desc: "多云", icon: "CloudSun" },
  { temp: "25°C", desc: "晴间多云", icon: "CloudSun" },
  { temp: "15°C", desc: "小雨", icon: "CloudRain" },
  { temp: "28°C", desc: "炎热", icon: "Sun" },
  { temp: "12°C", desc: "凉爽", icon: "Wind" },
  { temp: "20°C", desc: "晴", icon: "Sun" },
];

const TIPS_MAP: Record<string, string[]> = {
  "新疆": ["早晚温差大，建议带外套", "日照强烈，注意防晒", "部分景区信号弱，提前下载离线地图", "尊重当地少数民族风俗"],
  "云南": ["高原紫外线强，注意防晒", "昼夜温差大，带薄外套", "雨季备雨具", "部分山路小心驾驶"],
  "日本": ["备好零钱，部分小店只收现金", "注意垃圾分类规则", "公共交通准时，提前到站", "泡温泉前先冲洗身体"],
};

const DEFAULT_TIPS = ["保持手机电量充足", "随身携带身份证件", "注意保管贵重物品"];

// Infer destination from the first route location
function inferDestination(plan: { route: { location: string }[] }): string {
  const firstLoc = plan.route[0]?.location || "";
  for (const key of Object.keys(TIPS_MAP)) {
    if (firstLoc.includes(key)) return key;
  }
  // Try matching against the plan title as fallback
  return "未知目的地";
}

function getTips(destination: string): string[] {
  for (const [key, tips] of Object.entries(TIPS_MAP)) {
    if (destination.includes(key) || key.includes(destination)) return tips;
  }
  return DEFAULT_TIPS;
}

export class JourneyAgent {
  generate(input: JourneyInput): JourneyState {
    const { plan, dayIndex } = input;
    const day = plan.route[dayIndex];
    const weather = WEATHER_POOL[dayIndex % WEATHER_POOL.length];

    // Infer destination from route data
    const destination = inferDestination(plan);

    // Build today's timeline
    const todayTimeline: TimelineActivity[] = [];

    // Morning
    if (dayIndex === 0 && day.day === 1) {
      todayTimeline.push({ time: "07:00", title: "出发", description: "前往" + destination, type: "transport" });
      todayTimeline.push({ time: "09:00", title: "抵达" + day.location, description: "到达" + day.location + "，开始旅程", type: "activity" });
    } else {
      todayTimeline.push({ time: "07:30", title: "早餐", description: day.location + "当地早餐", type: "meal" });
    }

    // Activities from route
    let hour = dayIndex === 0 ? 10 : 9;
    for (let i = (dayIndex === 0 ? 1 : 0); i < day.activities.length; i++) {
      const act = day.activities[i];
      const actTime = String(hour).padStart(2, "0") + ":00";
      const type = act.includes("美食") || act.includes("餐") || act.includes("食") ? "meal" as const
        : act.includes("抵达") || act.includes("返回") ? "transport" as const
        : act.includes("休息") || act.includes("自由") ? "rest" as const
        : "activity" as const;

      todayTimeline.push({
        time: actTime,
        title: act,
        description: day.location + " · " + act,
        type,
      });
      hour += type === "meal" ? 1 : 2;
    }

    // Next stop
    const nextDayIdx = dayIndex + 1;
    const hasNext = nextDayIdx < plan.route.length;
    const nextStop = hasNext
      ? { name: plan.route[nextDayIdx].location, eta: "次日 09:00", tip: "建议早睡，明天继续精彩旅程" }
      : { name: "返程", eta: "次日 08:00", tip: "收拾好行李，检查证件和机票" };

    // Tips based on destination
    const tips = getTips(destination);

    return {
      planTitle: plan.title,
      currentDay: day.day,
      totalDays: plan.route.length,
      date: "2026年9月" + (15 + dayIndex) + "日",
      weather,
      sunrise: "07:" + (15 + dayIndex % 20),
      sunset: "20:" + (10 + dayIndex % 15),
      wind: ["微风 3级", "轻风 2级", "和风 4级", "微风 2级"][dayIndex % 4],
      nextStop,
      todayTimeline,
      tips,
    };
  }
}
