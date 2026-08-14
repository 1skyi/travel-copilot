import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadTsModule(relativePath) {
  const absolutePath = fileURLToPath(new URL(relativePath, import.meta.url));
  const source = fs.readFileSync(absolutePath, "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  new Function("exports", "module", "require", "__filename", "__dirname", js)(
    module.exports,
    module,
    () => { throw new Error("no runtime deps"); },
    absolutePath,
    path.dirname(absolutePath)
  );
  return module.exports;
}

const trip = loadTsModule("../../types/trip.ts");

test("getTravelerCount 成人 + 儿童", () => {
  assert.equal(trip.getTravelerCount({ adults: 2, children: 1 }), 3);
  assert.equal(trip.getTravelerCount({ adults: 1, children: 0 }), 1);
});

test("getTotalBudget 总预算与每人预算", () => {
  assert.equal(trip.getTotalBudget({ budget: { amount: 8000, scope: "TOTAL" }, travelers: { adults: 2, children: 0 } }), 8000);
  assert.equal(trip.getTotalBudget({ budget: { amount: 4000, scope: "PER_PERSON" }, travelers: { adults: 2, children: 0 } }), 8000);
});

test("computeDuration 自动计算天数", () => {
  assert.equal(trip.computeDuration("2026-09-10", "2026-09-16"), 7);
  assert.equal(trip.computeDuration("2026-09-10", "2026-09-10"), 1);
  assert.equal(trip.computeDuration("2026-09-16", "2026-09-10"), 0);
});

test("draftToTripBrief 装配必填字段", () => {
  const brief = trip.draftToTripBrief({
    origin: "深圳",
    destination: "新疆",
    adults: 2,
    children: 0,
    startDate: "2026-09-10",
    endDate: "2026-09-16",
    budgetAmount: 4000,
    budgetScope: "PER_PERSON",
    travelerType: "couple",
    transportation: "self_drive",
    interests: ["photography"],
    avoid: ["crowded"],
    budgetIncludesTransport: true,
  });
  assert.equal(brief.duration, 7);
  assert.equal(brief.travelers.adults, 2);
  assert.equal(trip.getTotalBudget(brief), 8000);
  assert.equal(trip.isTripBriefComplete(brief), true);
});

test("isTripBriefComplete 阻止缺少 origin/budget 的 Brief", () => {
  const base = trip.draftToTripBrief({
    destination: "新疆",
    adults: 1,
    children: 0,
    startDate: "2026-09-10",
    endDate: "2026-09-12",
    budgetAmount: 1000,
    budgetScope: "TOTAL",
    travelerType: "solo",
    transportation: "ai",
    interests: [],
    avoid: [],
    budgetIncludesTransport: true,
  });
  assert.equal(trip.isTripBriefComplete(base), false);
});