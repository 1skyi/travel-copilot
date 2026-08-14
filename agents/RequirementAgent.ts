import {
  TripBrief,
  TripBriefDraft,
  TripBriefField,
  RequirementQuestion,
  draftToTripBrief,
  TRAVELER_TYPE_LABELS,
  TRANSPORTATION_LABELS,
  TRIP_INTEREST_LABELS,
  TRIP_AVOID_LABELS,
  BUDGET_SCOPE_LABELS,
  TravelerType,
  Transportation,
  TripInterest,
  TripAvoid,
  BudgetScope,
} from "@/types/trip";
import type { TravelDNA } from "@/types/travel";

// ============================================================
// 需要收集的核心字段顺序（提问顺序）
// ============================================================

const FIELD_ORDER: TripBriefField[] = [
  "origin",
  "destination",
  "adults",
  "children",
  "startDate",
  "endDate",
  "budgetAmount",
  "budgetScope",
  "travelerType",
  "budgetIncludesTransport",
  "transportation",
  "interests",
  "avoid",
];

const DESTINATIONS = ["新疆", "云南", "日本", "川西", "泰国", "西藏", "海南", "青海"];
const ORIGINS = ["深圳", "北京", "上海", "广州", "杭州", "成都", "西安", "重庆", "武汉", "南京"];

// ============================================================
// RequirementAgent — 把自然语言需求解析成结构化 Trip Brief，
// 缺少的关键字段不猜，而是逐步追问。
// ============================================================

export class RequirementAgent {
  // ---- 解析自然语言 ----
  parseNaturalLanguage(text: string): TripBriefDraft {
    const draft: TripBriefDraft = {};

    // 出发地：从X出发 / X出发 / 我在X / 从X去
    for (const city of ORIGINS) {
      if (text.includes("从" + city + "出发") || text.includes(city + "出发") || text.includes("我在" + city)) {
        draft.origin = city;
        break;
      }
    }
    if (!draft.origin) {
      const originMatch = text.match(/从(.{2,6}?)(?:出发|飞|走|去)/);
      if (originMatch) {
        const captured = originMatch[1].trim();
        // 捕获值可能夹带交通词（如"从广州坐高铁去新疆"），回退到城市表校验
        const knownCity = ORIGINS.find((c) => captured.includes(c));
        draft.origin = knownCity || captured;
      }
    }
    if (!draft.origin) {
      const firstToken = text.trim().split(/\s+/)[0];
      if (ORIGINS.includes(firstToken)) draft.origin = firstToken;
    }

    // 目的地
    for (const d of DESTINATIONS) {
      if (text.includes(d)) {
        draft.destination = d;
        break;
      }
    }

    // 人数：2大1小 / 两大一小 / 一家三口 / 2个人 / 2人 / 一个人
    const familyMatch = text.match(/(\d+)\s*大\s*(\d+)\s*小/);
    if (familyMatch) {
      draft.adults = Number(familyMatch[1]);
      draft.children = Number(familyMatch[2]);
    } else if (text.includes("两大一小")) {
      draft.adults = 2;
      draft.children = 1;
    } else if (text.includes("一家三口")) {
      draft.adults = 2;
      draft.children = 1;
    } else {
      const peopleMatch = text.match(/(\d+)\s*(个?人|口)/);
      if (peopleMatch) draft.adults = Number(peopleMatch[1]);
      else if (text.includes("自己") || text.includes("独自") || text.includes("一个人")) draft.adults = 1;
      else if (text.includes("两个人") || text.includes("我和")) draft.adults = 2;
      if (draft.adults !== undefined && draft.children === undefined) draft.children = 0;
    }

    // 同行关系
    if (text.includes("女朋友") || text.includes("男朋友") || text.includes("情侣") || text.includes("对象") || text.includes("老婆") || text.includes("老公")) {
      draft.travelerType = "couple";
    } else if (text.includes("家人") || text.includes("父母") || text.includes("爸妈") || text.includes("孩子") || text.includes("老人") || text.includes("亲子")) {
      draft.travelerType = "family";
    } else if (text.includes("同事") || text.includes("团建")) {
      draft.travelerType = "colleagues";
    } else if (text.includes("朋友") || text.includes("闺蜜") || text.includes("兄弟")) {
      draft.travelerType = "friends";
    } else if (text.includes("独自") || text.includes("自己") || text.includes("一个人")) {
      draft.travelerType = "solo";
    }

    // 预算：每人/人均 4000；每人预算 4000；总预算/预算 8000
    const perPersonMatch = text.match(/(?:每人|人均)\s*[¥￥]?\s*(?:预算|花费|费用)?\s*(\d+(?:\.\d+)?)\s*(万|k|千|元|块)?/i);
    const totalBudgetMatch = text.match(/(?:总预算|总价|总共)\s*(\d+(?:\.\d+)?)\s*(万|k|千|元|块)?/i);
    const budgetWithLabelMatch = text.match(/预算\s*(\d+(?:\.\d+)?)\s*(万|k|千|元|块)?/i);
    const budgetWithUnitMatch = text.match(/(\d+(?:\.\d+)?)\s*(万|k|千|元|块)/i);
    const budgetWithCurrencyMatch = text.match(/[¥￥]\s*(\d+(?:\.\d+)?)\s*(万|k|千|元|块)?/i);
    const budgetMatch = budgetWithLabelMatch || budgetWithUnitMatch || budgetWithCurrencyMatch;

    if (perPersonMatch) {
      draft.budgetAmount = this.normalizeBudget(perPersonMatch[1], perPersonMatch[2]);
      draft.budgetScope = "PER_PERSON";
    } else if (totalBudgetMatch) {
      draft.budgetAmount = this.normalizeBudget(totalBudgetMatch[1], totalBudgetMatch[2]);
      draft.budgetScope = "TOTAL";
    } else if (budgetMatch) {
      // 只解析金额，不猜预算口径；后续必须单独确认 TOTAL / PER_PERSON
      draft.budgetAmount = this.normalizeBudget(budgetMatch[1], budgetMatch[2]);
    }

    // 出发/结束日期：2026-09-10 ~ 2026-09-16 / 9月10日-9月16日 / 9月10日 + 玩7天
    const rangeMatch = text.match(
      /(\d{4}\s*[-/年]\s*\d{1,2}\s*[-/月]\s*\d{1,2}日?)\s*(?:~|到|至|-)\s*(\d{4}\s*[-/年]\s*\d{1,2}\s*[-/月]\s*\d{1,2}日?)/
    );
    if (rangeMatch) {
      draft.startDate = rangeMatch[1].trim();
      draft.endDate = rangeMatch[2].trim();
    } else {
      // 无年份区间："9月10日-9月16日"
      const noYearRange = text.match(/(\d{1,2})月(\d{1,2})日?\s*(?:~|到|至|-)\s*(\d{1,2})月(\d{1,2})日?/);
      if (noYearRange) {
        const year = this.inferYear(Number(noYearRange[1]), Number(noYearRange[2]));
        draft.startDate = year + "年" + noYearRange[1] + "月" + noYearRange[2] + "日";
        draft.endDate = year + "年" + noYearRange[3] + "月" + noYearRange[4] + "日";
      } else {
        // 单日期 + 天数："9月10日出发" + "玩7天"
        const singleDate = text.match(/(\d{1,2})月(\d{1,2})日/);
        if (singleDate) {
          const month = Number(singleDate[1]);
          const day = Number(singleDate[2]);
          const year = this.inferYear(month, day);
          draft.startDate = year + "年" + month + "月" + day + "日";
          const daysMatch = text.match(/(\d+)\s*天/);
          if (daysMatch) {
            const days = Number(daysMatch[1]);
            const start = new Date(year, month - 1, day);
            const end = new Date(start.getTime() + (days - 1) * 86400000);
            draft.endDate = end.getFullYear() + "年" + (end.getMonth() + 1) + "月" + end.getDate() + "日";
          }
        }
      }
    }

    // 预算是否包含往返交通
    if (text.includes("不含") || text.includes("不包含")) draft.budgetIncludesTransport = false;
    else if (text.includes("包含") || text.includes("含往返") || text.includes("往返")) draft.budgetIncludesTransport = true;

    // 交通偏好
    if (text.includes("自驾") || text.includes("租车")) draft.transportation = "self_drive";
    else if (text.includes("公共交通") || text.includes("高铁") || text.includes("火车") || text.includes("地铁")) draft.transportation = "public";
    else if (text.includes("包车") || text.includes("包司机")) draft.transportation = "charter";

    // 本次旅行重点
    const interests: TripInterest[] = [];
    const interestKeywords: [TripInterest, string[]][] = [
      ["photography", ["摄影", "拍照", "出片", "相机"]],
      ["nature", ["自然", "风景", "山水", "湖泊", "草原", "雪山"]],
      ["food", ["美食", "吃", "小吃", "火锅", "特色菜"]],
      ["culture", ["人文", "历史", "文化", "古镇", "博物馆"]],
      ["shopping", ["购物", "买", "逛街", "免税"]],
      ["relax", ["放松", "躺平", "度假", "休闲", "慢"]],
      ["outdoor", ["户外", "徒步", "骑行", "露营", "爬山"]],
    ];
    for (const [key, kws] of interestKeywords) {
      if (kws.some((k) => text.includes(k))) interests.push(key);
    }
    if (interests.length > 0) draft.interests = interests;

    // 本次不希望出现
    const avoid: TripAvoid[] = [];
    const avoidKeywords: [TripAvoid, string[]][] = [
      ["long_drive", ["长时间驾驶", "长途开车", "一直开车", "车程长"]],
      ["crowded", ["人多", "拥挤", "人山人海", "排队人多"]],
      ["early_rise", ["早起", "凌晨"]],
      ["frequent_hotel_change", ["频繁换酒店", "天天换酒店", "换酒店"]],
      ["rush", ["赶路", "行程太满", "特种兵", "太累"]],
      ["queue", ["排队", "等位"]],
    ];
    for (const [key, kws] of avoidKeywords) {
      if (kws.some((k) => text.includes(k))) avoid.push(key);
    }
    if (avoid.length > 0) draft.avoid = avoid;

    // 节日日期提示
    const dateKeywords: [string, string][] = [
      ["国庆", "国庆节"],
      ["春节", "春节"],
      ["暑假", "暑假"],
      ["寒假", "寒假"],
      ["五一", "五一"],
      ["端午", "端午"],
      ["中秋", "中秋"],
      ["元旦", "元旦"],
    ];
    if (!draft.startDate) {
      for (const [label, kw] of dateKeywords) {
        if (text.includes(kw)) {
          draft.startDate = label;
          break;
        }
      }
    }

    return draft;
  }

  private normalizeBudget(value: string, unit?: string): number {
    let amount = Number(value);
    const u = (unit || "").toLowerCase();
    if (u === "万") amount *= 10000;
    else if (u === "k") amount *= 1000;
    else if (u === "千") amount *= 1000;
    return amount;
  }

  // 无年份日期推断：若已过去超过一个月则取明年，否则取今年
  private inferYear(month: number, day: number): number {
    const now = new Date();
    let year = now.getFullYear();
    const candidate = new Date(year, month - 1, day);
    if (candidate.getTime() < now.getTime() - 30 * 86400000) year += 1;
    return year;
  }

  // ---- 缺失字段 ----
  getMissingFields(brief: TripBriefDraft): TripBriefField[] {
    const missing: TripBriefField[] = [];
    for (const field of FIELD_ORDER) {
      if (this.isFieldMissing(brief, field)) missing.push(field);
    }
    return missing;
  }

  isFieldMissing(brief: TripBriefDraft, field: TripBriefField): boolean {
    switch (field) {
      case "origin":
      case "destination":
      case "startDate":
      case "endDate": {
        const value = brief[field];
        return typeof value !== "string" || value.trim() === "";
      }
      case "adults":
        return brief.adults === undefined || Number(brief.adults) <= 0;
      case "children":
        return brief.children === undefined || Number(brief.children) < 0;
      case "budgetAmount":
        return brief.budgetAmount === undefined || Number(brief.budgetAmount) <= 0;
      case "budgetScope":
        return brief.budgetScope !== "TOTAL" && brief.budgetScope !== "PER_PERSON";
      case "travelerType":
      case "transportation":
        return !brief[field];
      case "interests":
        return !brief.interests || brief.interests.length === 0;
      case "avoid":
        // 允许显式跳过：undefined 表示未回答，[] 表示已确认跳过
        return brief.avoid === undefined;
      case "budgetIncludesTransport":
        return brief.budgetIncludesTransport === undefined;
    }
  }

  // ---- 字段顺序 ----
  getFieldOrder(): TripBriefField[] {
    return [...FIELD_ORDER];
  }

  // ---- 生成下一个问题 ----
  getQuestion(field: TripBriefField): RequirementQuestion {
    switch (field) {
      case "origin":
        return {
          field,
          question: "你从哪里出发？",
          type: "single",
          options: ORIGINS.map((d) => ({ label: d, value: d })),
        };
      case "destination":
        return {
          field,
          question: "这次想去哪里旅行？",
          type: "single",
          options: DESTINATIONS.map((d) => ({ label: d, value: d })),
        };
      case "adults":
        return {
          field,
          question: "一共几位成人？",
          type: "single",
          options: ["1 人", "2 人", "3 人", "4 人", "5 人及以上"].map((d) => ({ label: d, value: d.replace(/[^0-9]/g, "") || "5" })),
        };
      case "children":
        return {
          field,
          question: "有几位儿童随行？",
          type: "single",
          options: ["0 人", "1 人", "2 人", "3 人及以上"].map((d) => ({ label: d, value: d.replace(/[^0-9]/g, "") || "0" })),
        };
      case "startDate":
        return {
          field,
          question: "出发日期是哪天？",
          type: "date",
        };
      case "endDate":
        return {
          field,
          question: "结束日期是哪天？",
          type: "date",
        };
      case "budgetAmount":
        return {
          field,
          question: "本次旅行预算金额是多少？",
          type: "number",
        };
      case "budgetScope":
        return {
          field,
          question: "这笔预算是总预算，还是每人预算？",
          type: "single",
          options: (Object.keys(BUDGET_SCOPE_LABELS) as BudgetScope[]).map((k) => ({ label: BUDGET_SCOPE_LABELS[k], value: k })),
        };
      case "travelerType":
        return {
          field,
          question: "和谁一起去？",
          type: "single",
          options: (Object.keys(TRAVELER_TYPE_LABELS) as TravelerType[]).map((k) => ({ label: TRAVELER_TYPE_LABELS[k], value: k })),
        };
      case "budgetIncludesTransport":
        return {
          field,
          question: "这个预算是否包含往返大交通？",
          type: "single",
          options: [
            { label: "包含（机票/火车票在内）", value: "true" },
            { label: "不包含（仅当地开销）", value: "false" },
          ],
        };
      case "transportation":
        return {
          field,
          question: "当地交通倾向哪种方式？",
          type: "single",
          options: (Object.keys(TRANSPORTATION_LABELS) as Transportation[]).map((k) => ({ label: TRANSPORTATION_LABELS[k], value: k })),
        };
      case "interests":
        return {
          field,
          question: "这次旅行最看重什么？（可多选）",
          type: "multi",
          options: (Object.keys(TRIP_INTEREST_LABELS) as TripInterest[]).map((k) => ({ label: TRIP_INTEREST_LABELS[k], value: k })),
        };
      case "avoid":
        return {
          field,
          question: "这次旅行不希望出现什么？（可多选，可不选）",
          type: "multi",
          options: (Object.keys(TRIP_AVOID_LABELS) as TripAvoid[]).map((k) => ({ label: TRIP_AVOID_LABELS[k], value: k })),
        };
    }
  }

  // ---- 应用答案 ----
  applyAnswer(brief: TripBriefDraft, field: TripBriefField, value: unknown): TripBriefDraft {
    const next: TripBriefDraft = { ...brief };
    switch (field) {
      case "origin":
      case "destination":
      case "startDate":
      case "endDate":
        next[field] = String(value).trim();
        break;
      case "adults":
      case "children":
      case "budgetAmount":
        next[field] = Number(value);
        break;
      case "budgetScope":
        next.budgetScope = value as BudgetScope;
        break;
      case "travelerType":
        next.travelerType = value as TravelerType;
        break;
      case "transportation":
        next.transportation = value as Transportation;
        break;
      case "budgetIncludesTransport":
        next.budgetIncludesTransport = value === true || value === "true" || value === "包含";
        break;
      case "interests":
        next.interests = Array.isArray(value) ? (value as TripInterest[]) : [];
        break;
      case "avoid":
        next.avoid = Array.isArray(value) ? (value as TripAvoid[]) : [];
        break;
    }
    return next;
  }

  // ---- 是否完整 ----
  isComplete(brief: TripBriefDraft): boolean {
    return this.getMissingFields(brief).length === 0;
  }

  // ---- 生成"AI 对你当前已提供的理解" ----
  summarizePresent(partial: TripBriefDraft): string[] {
    const lines: string[] = [];
    if (partial.origin) lines.push("出发地：" + partial.origin);
    if (partial.destination) lines.push("目的地：" + partial.destination);
    if (partial.startDate) lines.push("出发日期：" + partial.startDate);
    if (partial.endDate) lines.push("结束日期：" + partial.endDate);
    if (partial.adults !== undefined) lines.push("成人：" + partial.adults + " 人");
    if (partial.children !== undefined) lines.push("儿童：" + partial.children + " 人");
    if (partial.budgetAmount !== undefined && partial.budgetAmount > 0) {
      lines.push("预算金额：¥" + partial.budgetAmount.toLocaleString());
    }
    if (partial.budgetScope) lines.push("预算口径：" + BUDGET_SCOPE_LABELS[partial.budgetScope]);
    if (partial.travelerType) lines.push("同行关系：" + TRAVELER_TYPE_LABELS[partial.travelerType]);
    if (partial.budgetIncludesTransport !== undefined) lines.push("交通是否含往返：" + (partial.budgetIncludesTransport ? "包含" : "不包含"));
    if (partial.transportation) lines.push("当地交通：" + TRANSPORTATION_LABELS[partial.transportation]);
    if (partial.interests && partial.interests.length > 0) lines.push("本次重点：" + partial.interests.map((i) => TRIP_INTEREST_LABELS[i]).join("、"));
    if (partial.avoid && partial.avoid.length > 0) lines.push("希望避开：" + partial.avoid.map((a) => TRIP_AVOID_LABELS[a]).join("、"));
    return lines;
  }

  // ---- 生成"AI 对你的需求理解" ----
  summarize(brief: TripBrief): string[] {
    const lines: string[] = [];
    lines.push("出发地：" + brief.origin);
    lines.push("目的地：" + brief.destination);
    lines.push("日期：" + brief.startDate + " — " + brief.endDate + "（" + brief.duration + " 天）");
    lines.push("人数：" + brief.travelers.adults + " 成人" + (brief.travelers.children > 0 ? " + " + brief.travelers.children + " 儿童" : "") + "（" + TRAVELER_TYPE_LABELS[brief.preferences.travelerType] + "）");
    lines.push("预算：" + BUDGET_SCOPE_LABELS[brief.budget.scope] + " ¥" + brief.budget.amount.toLocaleString() + (brief.preferences.budgetIncludesTransport ? "（含往返交通）" : "（不含往返交通）") + "（硬约束，AI 不会自行修改）");
    lines.push("当地交通：" + TRANSPORTATION_LABELS[brief.preferences.transportation]);
    if (brief.preferences.interests.length > 0) lines.push("本次重点：" + brief.preferences.interests.map((i) => TRIP_INTEREST_LABELS[i]).join("、"));
    if (brief.preferences.avoid.length > 0) lines.push("希望避开：" + brief.preferences.avoid.map((a) => TRIP_AVOID_LABELS[a]).join("、"));
    return lines;
  }

  // ---- 创建一个空的完整结构（合并默认值） ----
  toFullBrief(partial: TripBriefDraft, dna: TravelDNA | null = null): TripBrief {
    return draftToTripBrief(partial, dna);
  }
}