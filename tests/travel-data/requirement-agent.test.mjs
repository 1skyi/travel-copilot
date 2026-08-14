import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const dir = path.dirname(fileURLToPath(import.meta.url));

function loadModule(fileName, requireMap = {}) {
  const absolutePath = path.join(dir, fileName);
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
    if (requireMap[id]) return requireMap[id];
    throw new Error("unexpected require: " + id);
  };
  new Function("exports", "module", "require", "__filename", "__dirname", js)(
    module.exports,
    module,
    localRequire,
    absolutePath,
    dir
  );
  return module.exports;
}

const trip = loadModule("../../types/trip.ts");
const RequirementAgent = loadModule("../../agents/RequirementAgent.ts", {
  "@/types/trip": trip,
}).RequirementAgent;

test("RequirementAgent 解析 origin/每人预算/摄影/情侣", () => {
  const agent = new RequirementAgent();
  const draft = agent.parseNaturalLanguage("我从深圳出发，国庆我和女朋友去新疆玩7天，每人4000，想摄影");
  assert.equal(draft.origin, "深圳");
  assert.equal(draft.destination, "新疆");
  assert.equal(draft.adults, 2);
  assert.equal(draft.budgetAmount, 4000);
  assert.equal(draft.budgetScope, "PER_PERSON");
  assert.deepEqual(draft.interests, ["photography"]);
  assert.equal(draft.travelerType, "couple");
});

test("RequirementAgent 只给金额时不猜预算口径", () => {
  const agent = new RequirementAgent();
  const draft = agent.parseNaturalLanguage("我要去新疆，预算8000");
  assert.equal(draft.destination, "新疆");
  assert.equal(draft.budgetAmount, 8000);
  assert.equal(draft.budgetScope, undefined);
  assert.equal(agent.isFieldMissing(draft, "budgetScope"), true);
});