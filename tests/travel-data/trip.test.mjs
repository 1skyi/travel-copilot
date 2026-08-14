import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadTsModule(relativePath, deps = {}) {
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
  const localRequire = (id) => {
    if (id in deps) return deps[id];
    throw new Error("测试模块不应存在运行时依赖: " + id);
  };
  new Function("exports", "module", "require", "__filename", "__dirname", js)(
    module.exports,
    module,
    localRequire,
    absolutePath,
    require("node:path").dirname(absolutePath)
  );
  return module.exports;
}

const trip = loadTsModule("../../types/trip.ts");
// RequirementAgent imports "@/types/trip" — 用替换路径后重新加载注入：
const agentSrc = fs
  .readFileSync(fileURLToPath(new URL("../../agents/RequirementAgent.ts", import.meta.url)), "utf8")
  .replace('from "@/types/trip"', 'from "./trip_stub"')
  .replace('import type { TravelDNA } from "@/types/travel";', "");
const js = ts.transpileModule(agentSrc, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const agentModule = { exports: {} };
new Function("exports", "module", "require", js)(agentModule.exports, agentModule, (id) => {
  if (id === "./trip_stub") return trip;
  throw new Error("dep: " + id);
});
const { RequirementAgent } = agentModule.exports;
const agent = new RequirementAgent();

// ============================================================
// TripBrief 结构
// ============================================================

test("TripBudget 含硬约束 constraint=HARD", () => {
  const brief = trip.draftToTripBrief(
    { destination: "新疆", adults: 2, budgetAmount: 8000, budgetScope: "TOTAL" },
    null
  );
  assert.equal(brief.budget.constraint, "HARD");
});

test("每人预算 PER_PERSON × 人数 = 总预算", () => {
  const brief = trip.draftToTripBrief(
    { adults: 2, budgetAmount: 4000, budgetScope: "PER_PERSON" },
    null
  );
  assert.equal(trip.getTotalBudget(brief), 8000);
});

test("computeDuration 计算含首日天数", () => {
  assert.equal(trip.computeDuration("2026年9月10日", "2026年9月16日"), 7);
  assert.equal(trip.computeDuration("2026-09-10", "2026-09-10"), 1);
  assert.equal(trip.computeDuration("2026-09-16", "2026-09-10"), 0); // end < start
});

test("出发地缺失时被识别为缺失字段", () => {
  const draft = agent.parseNaturalLanguage("我要去新疆旅游。");
  const missing = agent.getMissingFields(draft);
  assert.ok(missing.includes("origin"), "origin 必须缺失");
  assert.equal(draft.origin, undefined, "不得自动填入默认出发地");
});

// ============================================================
// RequirementAgent 解析
// ============================================================

test("P2-1: 从深圳去新疆 → origin=深圳", () => {
  const draft = agent.parseNaturalLanguage("9月10日从深圳去新疆玩7天");
  assert.equal(draft.origin, "深圳");
});

test("P2-2: 每人预算4000 → PER_PERSON", () => {
  const draft = agent.parseNaturalLanguage("2人，新疆，每人预算4000");
  assert.equal(draft.budgetAmount, 4000);
  assert.equal(draft.budgetScope, "PER_PERSON");
});

test("P2-3a: 9月10日-9月16日 → startDate/endDate", () => {
  const draft = agent.parseNaturalLanguage("9月10日-9月16日，新疆");
  assert.ok(draft.startDate && draft.startDate.includes("9月10日"), "startDate 应含 9月10日，实际: " + draft.startDate);
  assert.ok(draft.endDate && draft.endDate.includes("9月16日"), "endDate 应含 9月16日，实际: " + draft.endDate);
});

test("P2-3b: 单日期 + 玩7天 → 自动推导 endDate", () => {
  const draft = agent.parseNaturalLanguage("9月10日从深圳去新疆玩7天");
  assert.ok(draft.startDate && draft.startDate.includes("9月10日"));
  assert.ok(draft.endDate, "应推导出 endDate");
  const duration = trip.computeDuration(draft.startDate, draft.endDate);
  assert.equal(duration, 7, "推导天数应为 7，实际: " + duration);
});

test("完整场景：情侣2人深圳出发新疆7天总预算8000", () => {
  const draft = agent.parseNaturalLanguage(
    "我和女朋友两个人，9月10日从深圳去新疆玩7天，总预算8000，我喜欢摄影，不喜欢赶路。"
  );
  assert.equal(draft.destination, "新疆");
  assert.equal(draft.adults, 2);
  assert.equal(draft.children, 0);
  assert.equal(draft.travelerType, "couple");
  assert.equal(draft.budgetAmount, 8000);
  assert.equal(draft.budgetScope, "TOTAL");
  assert.ok(draft.interests.includes("photography"));
  assert.ok(draft.avoid.includes("rush"));
  assert.equal(draft.origin, "深圳");
  assert.ok(draft.startDate);
  assert.ok(draft.endDate);
  assert.equal(trip.computeDuration(draft.startDate, draft.endDate), 7);
});
