// ============================================================
// BudgetEngine — 用户驱动的决策式预算引擎
// 只汇总用户已选项，绝不生成“AI 最终预算”，也绝不为满足预算修改价格。
// ============================================================

import type { TripPlan, BudgetSourceType } from "@/types/plan";
import type { TravelDNA } from "@/types/travel";
import type { TripBrief } from "@/types/trip";
import { getTotalBudget, getTravelerCount } from "@/types/trip";
import type {
  TransportMode,
  TransportSegment,
  TransportOption,
  AccommodationSelection,
  AccommodationOption,
  FoodPreference,
  ActivitySelection,
  LocalTransportOption,
  UserSelections,
  BudgetLineDataStatus,
  BudgetSummaryLine,
  BudgetLineKey,
  BudgetSummary,
  BudgetStatus,
  PriceType,
} from "@/types/budget";
import type {
  TransportationOption,
  TransportationType,
  TransportationDataStatus,
  TransportationSelection,
} from "@/types/transportation";
import {
  TransportationService,
  buildSearchRequestFromTripBrief,
} from "@/lib/transportation/TransportationService";
import { toBudgetSourceType } from "@/lib/transportation/adapters";
import { TRANSPORTATION_TYPE_LABELS } from "@/types/transportation";

// ------------------------------------------------------------
// 固定 AI 估算目录（无真实 API，不声称真实价格）
// ------------------------------------------------------------

const TRANSPORT_PRICE: Record<TransportMode, number> = {
  FLIGHT: 1200,
  TRAIN: 700,
  DRIVE: 620,
  BUS: 320,
};

const TRANSPORT_LABEL: Record<TransportMode, string> = {
  FLIGHT: "飞机",
  TRAIN: "高铁/火车",
  DRIVE: "自驾",
  BUS: "大巴",
};

const ACCOMMODATION_CATALOG = [
  { id: "economy", name: "经济型酒店", rating: 4.0, pricePerNight: 260, roomType: "标准间", amenities: ["Wi-Fi", "24 小时热水"] },
  { id: "comfort", name: "舒适型酒店", rating: 4.5, pricePerNight: 480, roomType: "高级双床房", amenities: ["Wi-Fi", "含早餐", "停车场"] },
  { id: "boutique", name: "精品酒店", rating: 4.8, pricePerNight: 780, roomType: "精品大床房", amenities: ["Wi-Fi", "含早餐", "健身房"] },
  { id: "minsu", name: "特色民宿", rating: 4.6, pricePerNight: 520, roomType: "景观房", amenities: ["Wi-Fi", "当地早餐", "拍照点"] },
];

const FOOD_CATALOG: FoodPreference[] = [
  { id: "economy", label: "经济餐饮", minPerPersonPerDay: 80, maxPerPersonPerDay: 120, sourceType: "AI_ESTIMATE", recommendationReason: "控制餐费，适合预算优先" },
  { id: "comfort", label: "舒适餐饮", minPerPersonPerDay: 150, maxPerPersonPerDay: 250, sourceType: "AI_ESTIMATE", recommendationReason: "兼顾品质与预算" },
  { id: "local", label: "在地美食", minPerPersonPerDay: 200, maxPerPersonPerDay: 350, sourceType: "AI_ESTIMATE", recommendationReason: "围绕当地特色，符合美食偏好" },
];

const LOCAL_TRANSPORT_CATALOG: LocalTransportOption[] = [
  { id: "public", label: "公共交通", costPerPersonPerDay: 40, sourceType: "AI_ESTIMATE", recommendationReason: "成本最低，适合城市内移动" },
  { id: "mixed", label: "公交+打车", costPerPersonPerDay: 80, sourceType: "AI_ESTIMATE", recommendationReason: "灵活与成本平衡" },
  { id: "charter", label: "包车", costPerPersonPerDay: 160, sourceType: "AI_ESTIMATE", recommendationReason: "门到门，省体力，适合多人" },
  { id: "self_drive", label: "自驾租车", costPerPersonPerDay: 180, sourceType: "AI_ESTIMATE", recommendationReason: "自由停靠拍照，适合摄影/慢旅行" },
];

const OVER_BUDGET_SUGGESTIONS = ["降低住宿等级", "更换交通方式", "减少旅行天数"];

function budgetLineDataStatus(sourceType: BudgetSourceType): BudgetLineDataStatus {
  if (sourceType === "EXTERNAL_DATA" || sourceType === "USER_INPUT") return "REAL";
  if (sourceType === "AI_ESTIMATE") return "ESTIMATED";
  return "NO_DATA";
}

// ------------------------------------------------------------
// 纯计算工具
// ------------------------------------------------------------

function noSelectionLine(key: BudgetLineKey, label: string): BudgetSummaryLine {
  return {
    key,
    label,
    amount: 0,
    minAmount: 0,
    maxAmount: 0,
    source: "未选择",
    sourceType: "UNKNOWN",
    isEstimated: false,
    dataStatus: "NO_DATA",
  };
}

function estimateLine(
  key: BudgetLineKey,
  label: string,
  amount: number,
  minFactor = 0.85,
  maxFactor = 1.2
): BudgetSummaryLine {
  return {
    key,
    label,
    amount: Math.round(amount),
    minAmount: Math.round(amount * minFactor),
    maxAmount: Math.round(amount * maxFactor),
    source: "AI 估算",
    sourceType: "AI_ESTIMATE",
    isEstimated: true,
    dataStatus: "ESTIMATED",
  };
}

export function transportCost(segments: TransportSegment[], people: number): BudgetSummaryLine {
  let amount = 0;
  const selectedOptions: TransportOption[] = [];

  for (const segment of segments) {
    const option = segment.options.find((o) => o.id === segment.selectedOptionId);
    if (!option) continue;
    amount += option.price * people;
    selectedOptions.push(option);
  }

  if (selectedOptions.length === 0) return noSelectionLine("transport", "长途交通");

  const hasReal = selectedOptions.some(
    (option) => option.sourceType === "EXTERNAL_DATA" || option.sourceType === "USER_INPUT"
  );
  const hasEstimate = selectedOptions.some(
    (option) => option.sourceType !== "EXTERNAL_DATA" && option.sourceType !== "USER_INPUT"
  );

  const line = estimateLine("transport", "长途交通", amount);
  line.source = selectedOptions.map((option) => option.source).join(" / ");

  if (hasReal && !hasEstimate) {
    line.sourceType = "EXTERNAL_DATA";
    line.isEstimated = false;
    line.dataStatus = "REAL";
    line.minAmount = line.amount;
    line.maxAmount = line.amount;
  } else {
    line.sourceType = "AI_ESTIMATE";
    line.isEstimated = true;
    line.dataStatus = "ESTIMATED";
  }

  return line;
}

export function accommodationCost(
  selections: AccommodationSelection[],
  rooms: number
): BudgetSummaryLine {
  let amount = 0;
  const sources: string[] = [];

  for (const selection of selections) {
    const option = selection.options.find((o) => o.id === selection.selectedOptionId);
    if (!option) continue;
    amount += option.pricePerNight * selection.nights * rooms;
    sources.push(option.source);
  }

  if (sources.length === 0) return noSelectionLine("accommodation", "住宿");
  const line = estimateLine("accommodation", "住宿", amount);
  line.source = sources.join(" / ");
  return line;
}

export function foodCost(
  option: FoodPreference | null,
  people: number,
  days: number
): BudgetSummaryLine {
  if (!option) return noSelectionLine("food", "餐饮");
  const min = option.minPerPersonPerDay * people * days;
  const max = option.maxPerPersonPerDay * people * days;
  return {
    key: "food",
    label: "餐饮",
    amount: Math.round((min + max) / 2),
    minAmount: Math.round(min),
    maxAmount: Math.round(max),
    source: option.label,
    sourceType: option.sourceType,
    isEstimated: option.sourceType === "AI_ESTIMATE",
    dataStatus: budgetLineDataStatus(option.sourceType),
  };
}

export function ticketsCost(selection: ActivitySelection, people: number): BudgetSummaryLine {
  if (!selection || selection.selectedOptionIds.length === 0) {
    return noSelectionLine("tickets", "门票/活动");
  }
  const selected = selection.options.filter((o) => selection.selectedOptionIds.includes(o.id));
  if (selected.length === 0) return noSelectionLine("tickets", "门票/活动");

  const amount = selected.reduce((sum, option) => sum + option.cost * people, 0);
  return estimateLine("tickets", "门票/活动", amount, 0.85, 1.15);
}

export function localTransportCost(
  option: LocalTransportOption | null,
  people: number,
  days: number
): BudgetSummaryLine {
  if (!option) return noSelectionLine("localTransport", "当地交通");
  const amount = option.costPerPersonPerDay * people * days;
  const line = estimateLine("localTransport", "当地交通", amount, 0.85, 1.15);
  line.source = option.label;
  return line;
}

export function summarize(lines: BudgetSummaryLine[], totalBudget: number): BudgetSummary {
  const enrichedLines: BudgetSummaryLine[] = lines.map((line) => {
    const dataStatus = line.dataStatus ?? budgetLineDataStatus(line.sourceType);
    const isEstimated = line.isEstimated ?? dataStatus === "ESTIMATED";
    return { ...line, dataStatus, isEstimated };
  });

  const countedLines = enrichedLines.filter((line) => line.dataStatus !== "NO_DATA");
  const plannedAmount = countedLines.reduce((sum, line) => sum + line.amount, 0);
  const estimatedMin = countedLines.reduce((sum, line) => sum + line.minAmount, 0);
  const estimatedMax = countedLines.reduce((sum, line) => sum + line.maxAmount, 0);
  const confirmedCost = enrichedLines
    .filter((line) => line.sourceType === "EXTERNAL_DATA" || line.sourceType === "USER_INPUT")
    .reduce((sum, line) => sum + line.amount, 0);

  const isOverBudget = estimatedMin > totalBudget;
  const budgetStatus: BudgetStatus = isOverBudget
    ? "OVER_BUDGET"
    : estimatedMax >= totalBudget
      ? "ON_BUDGET"
      : "UNDER_BUDGET";

  const hasIncompleteData = enrichedLines.some(
    (line) => line.dataStatus === "NO_DATA" && line.key !== "other"
  );

  return {
    totalBudget,
    plannedAmount,
    confirmedCost,
    estimatedMin,
    estimatedMax,
    remainingBudget: totalBudget - plannedAmount,
    remainingMin: totalBudget - estimatedMax,
    remainingMax: totalBudget - estimatedMin,
    isOverBudget,
    budgetStatus,
    hasIncompleteData,
    lines: enrichedLines,
    suggestions: isOverBudget ? [...OVER_BUDGET_SUGGESTIONS] : [],
  };
}

// ------------------------------------------------------------
// 默认选择生成
// ------------------------------------------------------------

function recommendTransportMode(brief: TripBrief, dna: TravelDNA | null): TransportMode {
  let mode: TransportMode = "FLIGHT";
  const preference = brief.preferences.transportation;

  if (preference === "self_drive") mode = "DRIVE";
  else if (preference === "public") mode = "TRAIN";
  else if (preference === "charter") mode = "DRIVE";
  else mode = "FLIGHT";

  const avoidDrive =
    dna?.avoid?.includes("长时间驾驶") || brief.preferences.avoid.includes("long_drive");
  if (avoidDrive && mode === "DRIVE") mode = "TRAIN";

  return mode;
}

function buildTransportOptions(
  origin: string,
  destination: string,
  date: string,
  brief: TripBrief,
  dna: TravelDNA | null
): TransportOption[] {
  const avoidDrive =
    dna?.avoid?.includes("长时间驾驶") || brief.preferences.avoid.includes("long_drive");

  return (["FLIGHT", "TRAIN", "DRIVE", "BUS"] as TransportMode[]).map((mode) => {
    const reason =
      mode === "FLIGHT"
        ? "长途目的地通常更省时，适合有限的假期"
        : mode === "TRAIN"
          ? "兼顾舒适与沿途风景"
          : mode === "DRIVE"
            ? avoidDrive
              ? "你的 DNA 避雷长时间驾驶，建议避开自驾"
              : "自由停靠拍照，适合摄影/慢旅行"
            : "价格最低，但耗时较长";

    return {
      id: mode.toLowerCase(),
      mode,
      provider: TRANSPORT_LABEL[mode] + "（AI 估算）",
      origin,
      destination,
      departure: date + " 08:00",
      arrival:
        date +
        (mode === "FLIGHT" ? " 11:00" : mode === "TRAIN" ? " 14:00" : mode === "BUS" ? " 18:00" : " 16:00"),
      duration:
        mode === "FLIGHT" ? "约3小时" : mode === "TRAIN" ? "约6小时" : mode === "BUS" ? "约10小时" : "约8小时",
      price: TRANSPORT_PRICE[mode],
      priceType: "ESTIMATE",
      source: "AI 估算",
      sourceType: "AI_ESTIMATE" as BudgetSourceType,
      recommendationReason: reason,
    };
  });
}

function buildTransportSegment(
  id: string,
  label: string,
  type: TransportSegment["type"],
  origin: string,
  destination: string,
  date: string,
  brief: TripBrief,
  dna: TravelDNA | null
): TransportSegment {
  const options = buildTransportOptions(origin, destination, date, brief, dna);
  const recommendedId = recommendTransportMode(brief, dna).toLowerCase();
  return {
    id,
    label,
    origin,
    destination,
    type,
    selectedOptionId: options.some((o) => o.id === recommendedId) ? recommendedId : options[0]?.id ?? null,
    options,
  };
}

// ------------------------------------------------------------
// Transportation 数据层 → Budget 选项映射
// 真实数据(REAL)直接进入选项；估算(ESTIMATED)与无数据(NO_DATA)也如实标记。
// ------------------------------------------------------------

const DATA_LAYER_MODE_MAP: Record<TransportationType, TransportMode> = {
  flight: "FLIGHT",
  high_speed_rail: "TRAIN",
  train: "TRAIN",
  bus: "BUS",
  self_drive: "DRIVE",
};

const DATA_LAYER_PRICE_TYPE_MAP: Record<TransportationDataStatus, PriceType> = {
  REAL: "REAL",
  ESTIMATED: "ESTIMATE",
  NO_DATA: "UNKNOWN",
};

function mapDataLayerOption(option: TransportationOption): TransportOption {
  const perPersonPrice =
    option.price.unitPrice ??
    Math.round(option.price.totalPrice / Math.max(1, option.passengerCount));

  return {
    id: option.id,
    mode: DATA_LAYER_MODE_MAP[option.type],
    provider:
      TRANSPORTATION_TYPE_LABELS[option.type] +
      (option.status === "REAL" ? "" : "（AI 估算）"),
    origin: option.origin,
    destination: option.destination,
    departure: option.departureTime,
    arrival: option.arrivalTime,
    duration: option.duration,
    price: perPersonPrice,
    priceType: DATA_LAYER_PRICE_TYPE_MAP[option.status],
    source: option.dataSource,
    sourceType: toBudgetSourceType(option),
    recommendationReason:
      option.status === "REAL"
        ? "来自真实数据源，价格可靠"
        : option.type === "self_drive"
          ? "自驾为总成本估算（油费/过路费/停车/租车），非单张票价"
          : "AI 估算价格，实际以购买时为准",
  };
}

function recommendAccommodationId(dna: TravelDNA | null): string {
  const map: Record<string, string> = {
    "经济型": "economy",
    "舒适型": "comfort",
    "精品酒店": "boutique",
    "特色民宿": "minsu",
  };
  return map[dna?.hotel ?? ""] ?? "comfort";
}

function buildAccommodationOptions(location: string, dna: TravelDNA | null): AccommodationOption[] {
  const recommendedId = recommendAccommodationId(dna);
  return ACCOMMODATION_CATALOG.map((item) => ({
    ...item,
    location,
    source: "AI 估算",
    sourceType: "AI_ESTIMATE" as BudgetSourceType,
    recommendationReason:
      item.id === recommendedId
        ? "匹配你的长期住宿偏好"
        : item.id === "economy"
          ? "预算友好，适合控制总花费"
          : item.id === "minsu"
            ? "当地体验更强，适合想贴近在地生活的你"
            : "均衡舒适与成本",
  }));
}

function groupStays(route: TripPlan["route"]) {
  const groups: { location: string; count: number }[] = [];
  for (const day of route) {
    const last = groups[groups.length - 1];
    if (last && last.location === day.location) {
      last.count += 1;
    } else {
      groups.push({ location: day.location, count: 1 });
    }
  }

  return groups
    .map((group, index) => ({
      ...group,
      nights: group.count - (index === groups.length - 1 ? 1 : 0),
    }))
    .filter((group) => group.nights > 0);
}

function recommendFoodId(dna: TravelDNA | null): string {
  if (dna?.interest?.includes("美食")) return "local";
  if (dna?.budget === "经济型") return "economy";
  return "comfort";
}

function recommendLocalTransportId(brief: TripBrief): string {
  const preference = brief.preferences.transportation;
  if (preference === "self_drive") return "self_drive";
  if (preference === "charter") return "charter";
  if (preference === "public") return "public";
  return "mixed";
}

function buildActivitySelection(plan: TripPlan): ActivitySelection {
  const options = plan.route.map((day) => ({
    id: `ticket-${day.day}`,
    day: day.day,
    title: day.location + " 门票/体验",
    cost: 60,
    optional: true,
    source: "AI 估算：按景点/体验均值",
    sourceType: "AI_ESTIMATE" as BudgetSourceType,
  }));

  return { selectedOptionIds: options.map((option) => option.id), options };
}

// ------------------------------------------------------------
// BudgetEngine
// ------------------------------------------------------------

export class BudgetEngine {
  // 交通数据层接入：TransportationService 的结果优先；
  // 数据层暂无结果的类型以 AI 估算目录补齐，真实 API 接入后自动升级为 REAL。
  async buildTransportSegmentsFromDataLayer(
    brief: TripBrief,
    dna: TravelDNA | null
  ): Promise<TransportSegment[]> {
    const segments = [
      { id: "outbound", label: "去程", type: "outbound" as const, origin: brief.origin, destination: brief.destination, date: brief.startDate },
      { id: "return", label: "返程", type: "return" as const, origin: brief.destination, destination: brief.origin, date: brief.endDate },
    ];

    let dataOptions: TransportationOption[] = [];
    try {
      const request = buildSearchRequestFromTripBrief(brief);
      const service = new TransportationService();
      const result = await service.search(request);
      dataOptions = result.options;
    } catch {
      // 数据层异常时退回 AI 估算目录，不阻塞预算流程
      dataOptions = [];
    }

    return segments.map((segment) => {
      const fromDataLayer = dataOptions
        .filter((option) => option.origin === segment.origin && option.destination === segment.destination)
        .map((option) => mapDataLayerOption(option));

      // 数据层已覆盖的类型不再重复生成目录项
      const coveredModes = new Set(fromDataLayer.map((option) => option.mode));
      const fallback = buildTransportOptions(
        segment.origin,
        segment.destination,
        segment.date,
        brief,
        dna
      ).filter((catalog) => !coveredModes.has(catalog.mode));

      const options = [...fromDataLayer, ...fallback];
      const recommendedId = recommendTransportMode(brief, dna).toLowerCase();
      return {
        id: segment.id,
        label: segment.label,
        origin: segment.origin,
        destination: segment.destination,
        type: segment.type,
        selectedOptionId: options.some((option) => option.id === recommendedId)
          ? recommendedId
          : options[0]?.id ?? null,
        options,
      };
    });
  }

  // 异步版本：交通部分走数据层；其余部分与同步版本一致。
  // 数据层异常时不抛错，回退为 AI 估算目录。
  async createDefaultSelectionsAsync(
    plan: TripPlan,
    brief: TripBrief,
    dna: TravelDNA | null
  ): Promise<UserSelections> {
    const selections = this.createDefaultSelections(plan, brief, dna);
    try {
      const transportSelections = await this.buildTransportSegmentsFromDataLayer(brief, dna);
      return { ...selections, transportSelections };
    } catch {
      return selections;
    }
  }

  // 用户在交通方案页主动选择的 TransportationOption 优先进入预算。
  // 未选择的去程/返程继续使用数据层结果或 AI 估算目录。
  async createDefaultSelectionsWithTransportationAsync(
    plan: TripPlan,
    brief: TripBrief,
    dna: TravelDNA | null,
    transportation: TransportationSelection
  ): Promise<UserSelections> {
    const selections = this.createDefaultSelections(plan, brief, dna);
    try {
      const transportSelections = await this.buildTransportSegmentsFromDataLayer(brief, dna);
      const overridden = transportSelections.map((segment) => {
        const selected =
          segment.type === "outbound" ? transportation.outbound : transportation.return;
        if (!selected) return segment;
        if (selected.origin !== segment.origin || selected.destination !== segment.destination) {
          return segment;
        }
        const mapped = mapDataLayerOption(selected);
        return {
          ...segment,
          selectedOptionId: mapped.id,
          options: [mapped],
        };
      });
      return { ...selections, transportSelections: overridden };
    } catch {
      return selections;
    }
  }

  createDefaultSelections(
    plan: TripPlan,
    brief: TripBrief,
    dna: TravelDNA | null
  ): UserSelections {
    const transportSelections = [
      buildTransportSegment(
        "outbound",
        "去程",
        "outbound",
        brief.origin,
        brief.destination,
        brief.startDate,
        brief,
        dna
      ),
      buildTransportSegment(
        "return",
        "返程",
        "return",
        brief.destination,
        brief.origin,
        brief.endDate,
        brief,
        dna
      ),
    ];

    const stays = groupStays(plan.route);
    const accommodationSelections: AccommodationSelection[] = stays.map((stay, index) => ({
      id: `stay-${index + 1}`,
      label: `第 ${index + 1} 段 · ${stay.location}`,
      location: stay.location,
      nights: stay.nights,
      selectedOptionId: recommendAccommodationId(dna),
      options: buildAccommodationOptions(stay.location, dna),
    }));

    const foodOptions = FOOD_CATALOG.map((option) => ({ ...option }));
    const localTransportOptions = LOCAL_TRANSPORT_CATALOG.map((option) => ({ ...option }));

    return {
      planId: plan.id,
      transportSelections,
      accommodationSelections,
      foodPreferenceId: recommendFoodId(dna),
      foodOptions,
      activitySelections: buildActivitySelection(plan),
      localTransportId: recommendLocalTransportId(brief),
      localTransportOptions,
    };
  }

  calculate(brief: TripBrief, selections: UserSelections): BudgetSummary {
    const people = Math.max(1, getTravelerCount(brief.travelers));
    const days = Math.max(1, brief.duration);
    const rooms = Math.max(1, Math.ceil(people / 2));
    const totalBudget = getTotalBudget(brief);

    const food =
      selections.foodOptions.find((option) => option.id === selections.foodPreferenceId) ?? null;
    const local =
      selections.localTransportOptions.find((option) => option.id === selections.localTransportId) ?? null;

    const lines: BudgetSummaryLine[] = [
      transportCost(selections.transportSelections, people),
      accommodationCost(selections.accommodationSelections, rooms),
      foodCost(food, people, days),
      ticketsCost(selections.activitySelections, people),
      localTransportCost(local, people, days),
      {
        key: "other",
        label: "其他",
        amount: 0,
        minAmount: 0,
        maxAmount: 0,
        source: "暂无数据",
        sourceType: "UNKNOWN",
        isEstimated: false,
        dataStatus: "NO_DATA",
      },
    ];

    return summarize(lines, totalBudget);
  }
}
