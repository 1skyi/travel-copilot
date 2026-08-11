import { TripPlan, DailyTimeline, TimelineActivity, ItineraryInput } from "@/types/plan";

const ACTIVITY_TIME_MAP: Record<string, { start: number; duration: number }> = {
  "抵达": { start: 9, duration: 1 },
  "日出": { start: 6, duration: 0.5 },
  "日落": { start: 18, duration: 0.5 },
  "夜景": { start: 20, duration: 1 },
  "拍摄": { start: 7, duration: 1 },
  "摄影": { start: 7, duration: 1 },
  "星空": { start: 21, duration: 1.5 },
  "徒步": { start: 8, duration: 3 },
  "环湖": { start: 9, duration: 4 },
  "草原": { start: 9, duration: 3 },
  "寺庙": { start: 9, duration: 1.5 },
  "古城": { start: 10, duration: 3 },
  "博物馆": { start: 10, duration: 2 },
  "市场": { start: 10, duration: 1.5 },
  "购物": { start: 14, duration: 2 },
  "骑行": { start: 8, duration: 2 },
  "家访": { start: 14, duration: 1.5 },
  "演出": { start: 19, duration: 2 },
  "野餐": { start: 12, duration: 1 },
  "美食": { start: 12, duration: 1 },
  "烤肉": { start: 18, duration: 1.5 },
  "米线": { start: 12, duration: 0.5 },
  "夜市": { start: 19, duration: 2 },
  "温泉": { start: 19, duration: 2 },
  "抹茶": { start: 14, duration: 1 },
};

function guessType(activity: string): TimelineActivity["type"] {
  const a = activity.toLowerCase();
  if (a.includes("抵达") || a.includes("返回") || a.includes("火车") || a.includes("动车") || a.includes("新干线") || a.includes("机场") || a.includes("开车") || a.includes("驾驶")) return "transport";
  if (a.includes("食") || a.includes("饭") || a.includes("餐") || a.includes("米线") || a.includes("烤肉") || a.includes("市场") && a.includes("鱼") || a.includes("拉面") || a.includes("抹茶") || a.includes("野餐")) return "meal";
  if (a.includes("酒店") || a.includes("民宿") || a.includes("住宿") || a.includes("自由活动") || a.includes("休息")) return "rest";
  if (a.includes("拍摄") || a.includes("摄影") || a.includes("日落") || a.includes("日出") || a.includes("星空")) return "photo";
  return "activity";
}

function formatTime(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

function activityDuration(activity: string): number {
  for (const [key, info] of Object.entries(ACTIVITY_TIME_MAP)) {
    if (activity.includes(key)) return info.duration;
  }
  return 1.5; // default 1.5 hours
}

function activityDescription(activity: string, location: string): string {
  if (activity.includes("抵达")) return location + "到达，办理入住";
  if (activity.includes("返回")) return "返回" + location;
  if (activity.includes("返程")) return "前往机场/车站，准备返程";
  return "在" + location + "进行：" + activity;
}

export class ItineraryAgent {
  generate(input: ItineraryInput): DailyTimeline[] {
    const { plan, dna } = input;
    const isSlow = dna.pace === "慢慢体验";
    const isFast = dna.pace === "快速探索";
    const isPhoto = dna.style === "摄影旅行";

    return plan.route.map((day, dayIdx) => {
      let currentHour = isSlow ? 9 : isFast ? 7 : 8;
      const items: TimelineActivity[] = [];

      for (const activity of day.activities) {
        const dur = activityDuration(activity);
        const type = guessType(activity);
        const time = formatTime(currentHour);

        // Add photo time buffer for photo travelers
        if (isPhoto && type === "activity" && !day.activities.some(a => a.includes("摄影") || a.includes("拍摄"))) {
          items.push({
            time: formatTime(Math.max(currentHour - 0.5, 6)),
            title: "📷 拍摄时间",
            description: day.location + "最佳拍摄时段",
            type: "photo",
          });
        }

        // Check avoid constraints
        if (dna.avoid.includes("每天早起") && currentHour < 8) {
          currentHour = 8;
        }

        items.push({
          time,
          title: type === "meal" ? "🍽️ " + activity : activity,
          description: activityDescription(activity, day.location),
          type,
        });

        // Progress time: meal 1h, transport 2h, activity varies
        const gap = type === "meal" ? 1 : type === "transport" ? 2 : type === "photo" ? 0.5 : dur;
        currentHour += gap;

        // Add rest break for slow pace after 3+ hours
        if (isSlow && items.length >= 2 && items.length % 2 === 0) {
          currentHour += 0.5;
        }
      }

      // Evening rest for last day
      if (dayIdx === plan.route.length - 1) {
        items.push({
          time: formatTime(Math.min(currentHour + 1, 21)),
          title: "🎒 整理行李",
          description: "收拾行装，准备返程",
          type: "rest",
        });
      }

      return {
        day: day.day,
        location: day.location,
        items,
      };
    });
  }
}
