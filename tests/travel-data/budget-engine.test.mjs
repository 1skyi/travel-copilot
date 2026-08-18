import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let ts;
try {
  ts = require("typescript");
} catch {
  ts = require("./typescript.js");
}

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.TC_REPO || path.resolve(here, "../..");

function loadTsModule(rel, requireMap = {}) {
  const abs = path.join(repoRoot, rel);
  const source = fs.readFileSync(abs, "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (id) => {
    if (requireMap[id]) return requireMap[id];
    throw new Error("unexpected require: " + id);
  };
  new Function("exports", "module", "require", "__filename", "__dirname", js)(
    module.exports,
    module,
    localRequire,
    abs,
    path.dirname(abs)
  );
  return module.exports;
}

const trip = loadTsModule("types/trip.ts");
const transportation = loadTsModule("types/transportation.ts");
const flightProvider = loadTsModule("lib/transportation/providers/FlightProvider.ts");
const railProvider = loadTsModule("lib/transportation/providers/RailProvider.ts");
const busProvider = loadTsModule("lib/transportation/providers/BusProvider.ts");
const selfDriveProvider = loadTsModule("lib/transportation/providers/SelfDriveProvider.ts");
const transportationService = loadTsModule("lib/transportation/TransportationService.ts", {
  "@/types/trip": trip,
  "./providers/FlightProvider": flightProvider,
  "./providers/RailProvider": railProvider,
  "./providers/BusProvider": busProvider,
  "./providers/SelfDriveProvider": selfDriveProvider,
});
const transportationAdapters = loadTsModule("lib/transportation/adapters.ts");
const budgetEngine = loadTsModule("agents/BudgetEngine.ts", {
  "@/types/trip": trip,
  "@/types/transportation": transportation,
  "@/lib/transportation/TransportationService": transportationService,
  "@/lib/transportation/adapters": transportationAdapters,
});

test("transportCost 去程机票 1860/人 × 2 人 = 3720", () => {
  const line = budgetEngine.transportCost(
    [
      {
        id: "outbound",
        label: "去程",
        origin: "深圳",
        destination: "新疆",
        type: "outbound",
        selectedOptionId: "flight",
        options: [
          {
            id: "flight",
            mode: "FLIGHT",
            provider: "飞机（AI 估算）",
            origin: "深圳",
            destination: "新疆",
            departure: "2026-09-10 08:00",
            arrival: "2026-09-10 11:00",
            duration: "约3小时",
            price: 1860,
            priceType: "ESTIMATE",
            source: "AI 估算",
            sourceType: "AI_ESTIMATE",
          },
        ],
      },
    ],
    2
  );
  assert.equal(line.amount, 3720);
  assert.equal(line.minAmount, Math.round(3720 * 0.85));
  assert.equal(line.maxAmount, Math.round(3720 * 1.2));
});

test("accommodationCost 480/晚 × 6 晚 × 1 间 = 2880", () => {
  const line = budgetEngine.accommodationCost(
    [
      {
        id: "stay-1",
        label: "第 1 段 · 乌鲁木齐",
        location: "乌鲁木齐",
        nights: 6,
        selectedOptionId: "comfort",
        options: [
          {
            id: "comfort",
            name: "舒适型酒店",
            location: "乌鲁木齐",
            rating: 4.5,
            pricePerNight: 480,
            roomType: "高级双床房",
            amenities: ["Wi-Fi"],
            source: "AI 估算",
            sourceType: "AI_ESTIMATE",
          },
        ],
      },
    ],
    1
  );
  assert.equal(line.amount, 2880);
});

test("foodCost 100/人/天 × 2 人 × 7 天 = 1400", () => {
  const line = budgetEngine.foodCost(
    {
      id: "flat",
      label: "固定餐标",
      minPerPersonPerDay: 100,
      maxPerPersonPerDay: 100,
      sourceType: "AI_ESTIMATE",
    },
    2,
    7
  );
  assert.equal(line.amount, 1400);
  assert.equal(line.minAmount, 1400);
  assert.equal(line.maxAmount, 1400);
});

test("summarize 超出预算检测", () => {
  const summary = budgetEngine.summarize(
    [
      {
        key: "transport",
        label: "长途交通",
        amount: 5000,
        minAmount: 5000,
        maxAmount: 6000,
        source: "AI 估算",
        sourceType: "AI_ESTIMATE",
      },
    ],
    4000
  );
  assert.equal(summary.isOverBudget, true);
  assert.ok(summary.remainingMin < 0);
  assert.deepEqual(summary.suggestions, ["降低住宿等级", "更换交通方式", "减少旅行天数"]);
});

test("未选择项无金额且来源为 UNKNOWN", () => {
  const line = budgetEngine.transportCost([], 2);
  assert.equal(line.amount, 0);
  assert.equal(line.minAmount, 0);
  assert.equal(line.maxAmount, 0);
  assert.equal(line.sourceType, "UNKNOWN");
});

test("calculate 正确处理总预算与每人预算", () => {
  const engine = new budgetEngine.BudgetEngine();
  const emptySelections = {
    planId: "photo",
    transportSelections: [],
    accommodationSelections: [],
    foodPreferenceId: null,
    foodOptions: [],
    activitySelections: { selectedOptionIds: [], options: [] },
    localTransportId: null,
    localTransportOptions: [],
  };

  const totalBrief = trip.draftToTripBrief({
    origin: "深圳",
    destination: "新疆",
    adults: 2,
    children: 0,
    startDate: "2026-09-10",
    endDate: "2026-09-16",
    budgetAmount: 8000,
    budgetScope: "TOTAL",
    travelerType: "couple",
    transportation: "ai",
    interests: ["photography"],
    avoid: ["crowded"],
    budgetIncludesTransport: true,
  });

  const perBrief = trip.draftToTripBrief({
    origin: "深圳",
    destination: "新疆",
    adults: 2,
    children: 0,
    startDate: "2026-09-10",
    endDate: "2026-09-16",
    budgetAmount: 4000,
    budgetScope: "PER_PERSON",
    travelerType: "couple",
    transportation: "ai",
    interests: ["photography"],
    avoid: ["crowded"],
    budgetIncludesTransport: true,
  });

  assert.equal(engine.calculate(totalBrief, emptySelections).totalBudget, 8000);
  assert.equal(engine.calculate(perBrief, emptySelections).totalBudget, 8000);
});
test("createDefaultSelectionsAsync 走交通数据层并补齐 AI 估算目录", async () => {
  const engine = new budgetEngine.BudgetEngine();
  const plan = {
    id: "plan-1",
    title: "测试方案",
    score: 90,
    budget: 8000,
    tags: [],
    suitableFor: "测试",
    desc: "测试",
    route: [
      { day: 1, location: "乌鲁木齐", activities: ["抵达"] },
      { day: 2, location: "乌鲁木齐", activities: ["游览"] },
    ],
  };
  const brief = trip.draftToTripBrief({
    origin: "深圳",
    destination: "新疆",
    adults: 2,
    children: 0,
    startDate: "2026-09-10",
    endDate: "2026-09-12",
    budgetAmount: 8000,
    budgetScope: "TOTAL",
    travelerType: "couple",
    transportation: "ai",
    interests: [],
    avoid: [],
    budgetIncludesTransport: true,
  });

  const selections = await engine.createDefaultSelectionsAsync(plan, brief, null);
  assert.equal(selections.transportSelections.length, 2, "应有去程与返程两段");
  const outbound = selections.transportSelections[0];
  assert.equal(outbound.origin, "深圳");
  assert.equal(outbound.destination, "新疆");
  assert.ok(outbound.options.length >= 4, "数据层无真实数据时应补齐 4 种交通方式目录");
  // 数据层当前无真实交通 API：所有选项必须标记 AI_ESTIMATE，不得冒充真实价格
  outbound.options.forEach((option) => {
    assert.equal(option.sourceType, "AI_ESTIMATE");
    assert.equal(option.priceType, "ESTIMATE");
  });
});

test("toBudgetLine 输出包含人数与交通类型", () => {
  const option = {
    id: "t1",
    type: "flight",
    provider: "flight",
    origin: "深圳",
    destination: "新疆",
    departureTime: "2026-09-10 08:00",
    arrivalTime: "2026-09-10 11:00",
    duration: "3小时",
    price: { unitPrice: 1200, totalPrice: 2400, currency: "CNY", isEstimated: false },
    passengerCount: 2,
    availability: "AVAILABLE",
    dataSource: "TEST_ONLY",
    updatedAt: "2026-09-10T00:00:00.000Z",
    isEstimated: false,
    status: "REAL",
  };
  const line = transportationAdapters.toBudgetLine(option);
  assert.equal(line.passengerCount, 2);
  assert.equal(line.detailType, "flight");
  assert.equal(line.amount, 2400);
});

test("createDefaultSelectionsWithTransportationAsync 使用用户选中的 TransportationOption", async () => {
  const engine = new budgetEngine.BudgetEngine();
  const plan = {
    id: "plan-1",
    title: "测试方案",
    score: 90,
    budget: 8000,
    tags: [],
    suitableFor: "测试",
    desc: "测试",
    route: [
      { day: 1, location: "乌鲁木齐", activities: ["抵达"] },
      { day: 2, location: "乌鲁木齐", activities: ["游览"] },
    ],
  };
  const brief = trip.draftToTripBrief({
    origin: "深圳",
    destination: "乌鲁木齐",
    adults: 2,
    children: 0,
    startDate: "2026-09-10",
    endDate: "2026-09-12",
    budgetAmount: 8000,
    budgetScope: "TOTAL",
    travelerType: "couple",
    transportation: "ai",
    interests: [],
    avoid: [],
    budgetIncludesTransport: true,
  });
  const selected = {
    id: "real-flight-1",
    type: "flight",
    provider: "flight",
    origin: "深圳",
    destination: "乌鲁木齐",
    departureTime: "2026-09-10 08:00",
    arrivalTime: "2026-09-10 11:00",
    duration: "3小时",
    price: { unitPrice: 1200, totalPrice: 2400, currency: "CNY", isEstimated: false },
    passengerCount: 2,
    availability: "AVAILABLE",
    dataSource: "REAL_PROVIDER",
    updatedAt: "2026-09-10T00:00:00.000Z",
    isEstimated: false,
    status: "REAL",
  };
  const selections = await engine.createDefaultSelectionsWithTransportationAsync(
    plan,
    brief,
    null,
    { outbound: selected, return: null }
  );

  const outbound = selections.transportSelections[0];
  assert.equal(outbound.selectedOptionId, selected.id);
  assert.equal(outbound.options.length, 1);
  assert.equal(outbound.options[0].sourceType, "EXTERNAL_DATA");
  assert.equal(outbound.options[0].priceType, "REAL");
});

function makeStatusLine(amount, sourceType) {
  return {
    key: "transport",
    label: "交通",
    amount,
    minAmount: amount,
    maxAmount: amount,
    source: "测试",
    sourceType,
    isEstimated: sourceType === "AI_ESTIMATE",
    dataStatus: sourceType === "UNKNOWN" ? "NO_DATA" : sourceType === "AI_ESTIMATE" ? "ESTIMATED" : "REAL",
  };
}

test("BudgetStatus 边界：5000/6000/6500 → UNDER/ON/OVER", () => {
  assert.equal(budgetEngine.summarize([makeStatusLine(5000, "AI_ESTIMATE")], 6000).budgetStatus, "UNDER_BUDGET");
  assert.equal(budgetEngine.summarize([makeStatusLine(6000, "AI_ESTIMATE")], 6000).budgetStatus, "ON_BUDGET");
  assert.equal(budgetEngine.summarize([makeStatusLine(6500, "AI_ESTIMATE")], 6000).budgetStatus, "OVER_BUDGET");
});

test("NO_DATA 不按 0 元计入 plannedAmount", () => {
  const summary = budgetEngine.summarize(
    [
      makeStatusLine(3000, "AI_ESTIMATE"),
      { ...makeStatusLine(0, "UNKNOWN"), key: "accommodation", label: "住宿" },
    ],
    6000
  );
  assert.equal(summary.plannedAmount, 3000);
  assert.equal(summary.hasIncompleteData, true);
  assert.equal(summary.isOverBudget, false, "缺数据不得误判为超预算");
});

test("人数参与计算：1/2/4 人交通总价不同", () => {
  const segment = {
    id: "outbound",
    label: "去程",
    origin: "a",
    destination: "b",
    type: "outbound",
    selectedOptionId: "flight",
    options: [
      {
        id: "flight", mode: "FLIGHT", provider: "x", origin: "a", destination: "b",
        departure: "", arrival: "", duration: "", price: 1200,
        priceType: "ESTIMATE", source: "AI 估算", sourceType: "AI_ESTIMATE",
      },
    ],
  };
  assert.equal(budgetEngine.transportCost([segment], 1).amount, 1200);
  assert.equal(budgetEngine.transportCost([segment], 2).amount, 2400);
  assert.equal(budgetEngine.transportCost([segment], 4).amount, 4800);
});
