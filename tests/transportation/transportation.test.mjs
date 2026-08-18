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
const trans = loadTsModule("types/transportation.ts");
const budget = loadTsModule("types/budget.ts");
const flight = loadTsModule("lib/transportation/providers/FlightProvider.ts");
const rail = loadTsModule("lib/transportation/providers/RailProvider.ts");
const bus = loadTsModule("lib/transportation/providers/BusProvider.ts");
const selfDrive = loadTsModule("lib/transportation/providers/SelfDriveProvider.ts");
const service = loadTsModule("lib/transportation/TransportationService.ts", {
  "@/types/trip": trip,
  "./providers/FlightProvider": flight,
  "./providers/RailProvider": rail,
  "./providers/BusProvider": bus,
  "./providers/SelfDriveProvider": selfDrive,
});
const adapters = loadTsModule("lib/transportation/adapters.ts");

function makeBrief(overrides = {}) {
  return trip.draftToTripBrief({
    origin: "深圳",
    destination: "乌鲁木齐",
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
    ...overrides,
  });
}

function makeOption(overrides = {}) {
  return {
    id: "bus-1",
    type: "bus",
    provider: "bus",
    origin: "深圳",
    destination: "乌鲁木齐",
    departureTime: "2026-09-10 08:00",
    arrivalTime: "2026-09-10 18:00",
    duration: "10小时",
    price: { unitPrice: 320, totalPrice: 640, currency: "CNY", isEstimated: false },
    passengerCount: 2,
    availability: "AVAILABLE",
    dataSource: "TEST_ONLY",
    updatedAt: "2026-09-10T00:00:00.000Z",
    isEstimated: false,
    status: "REAL",
    ...overrides,
  };
}

test("Case 1: SearchRequest 来自 TripBrief", () => {
  const request = service.buildSearchRequestFromTripBrief(makeBrief());
  assert.equal(request.origin, "深圳");
  assert.equal(request.destination, "乌鲁木齐");
  assert.equal(request.passengerCount, 2);
  assert.equal(request.departureDate, "2026-09-10");
  assert.equal(request.returnDate, "2026-09-16");
  assert.equal(request.durationDays, 7);
});

test("Case 2: origin 缺失时拒绝搜索", () => {
  assert.throws(
    () => service.buildSearchRequestFromTripBrief(makeBrief({ origin: "" })),
    /缺少必要旅行信息/
  );
});

test("Case 3: destination 缺失时拒绝搜索", () => {
  assert.throws(
    () => service.buildSearchRequestFromTripBrief(makeBrief({ destination: "" })),
    /缺少必要旅行信息/
  );
});

test("Case 4/5: 单人价与总价随人数正确计算", () => {
  assert.equal(trans.calculateTransportationTotalPrice(500, 1), 500);
  assert.equal(trans.calculateTransportationTotalPrice(500, 4), 2000);
});

test("Case 6: 无真实数据返回空结果而非假价格", async () => {
  const request = service.buildSearchRequestFromTripBrief(makeBrief());
  const result = await new service.TransportationService().search(request);
  assert.equal(result.options.length, 0);
  assert.ok(result.providerStatus.length > 0);
  assert.ok(result.providerStatus.every((status) => status.status === "NO_DATA"));
});

test("Case 7: 单个 Provider 失败不影响其他 Provider", async () => {
  const request = service.buildSearchRequestFromTripBrief(makeBrief());
  const okProvider = {
    providerName: "bus",
    types: ["bus"],
    async search() {
      return [makeOption()];
    },
  };
  const failProvider = {
    providerName: "flight",
    types: ["flight"],
    async search() {
      throw new Error("flight provider down");
    },
  };

  const result = await new service.TransportationService([okProvider, failProvider]).search(
    request
  );
  assert.equal(result.options.length, 1);
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].provider, "flight");
});

test("SelfDrive: 自驾成本显式标记为估算", async () => {
  const provider = new selfDrive.SelfDriveProvider({
    fuelPerKm: 1,
    tollPerKm: 0.5,
    parkingPerDay: 50,
    rentalPerDay: 200,
  });
  const options = await provider.search({
    origin: "深圳",
    destination: "乌鲁木齐",
    departureDate: "2026-09-10",
    returnDate: "2026-09-16",
    passengerCount: 2,
    distanceKm: 1000,
    routeDurationSeconds: 36000,
    durationDays: 7,
  });

  assert.equal(options.length, 1);
  const option = options[0];
  assert.equal(option.status, "ESTIMATED");
  assert.equal(option.isEstimated, true);
  assert.equal(option.price.totalPrice, 3250);
  assert.match(option.duration, /高德预计/);
  assert.equal(option.durationMinutes, 600);
  assert.equal(option.selfDriveCost.estimatedFuelCost, 1000);
  assert.equal(option.selfDriveCost.estimatedTollCost, 500);
  assert.equal(option.selfDriveCost.estimatedParkingCost, 350);
  assert.equal(option.selfDriveCost.estimatedRentalCost, 1400);
});

test("Adapter: 交通方案可转换为 Budget 行", () => {
  const real = adapters.toBudgetLine(makeOption());
  assert.equal(real.amount, 640);
  assert.equal(real.sourceType, "EXTERNAL_DATA");
  assert.equal(real.minAmount, 640);
  assert.equal(real.maxAmount, 640);

  const estimated = adapters.toBudgetLine(
    makeOption({
      id: "bus-2",
      isEstimated: true,
      status: "ESTIMATED",
      dataSource: "SELF_DRIVE_ESTIMATE",
      price: { unitPrice: null, totalPrice: 1000, currency: "CNY", isEstimated: true },
    })
  );
  assert.equal(estimated.sourceType, "AI_ESTIMATE");
  assert.ok(estimated.minAmount < estimated.maxAmount);
});