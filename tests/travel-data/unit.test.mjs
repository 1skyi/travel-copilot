import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
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
  const localRequire = (id) => {
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

const utils = loadTsModule("../../lib/travel-data/utils.ts");
const { MemoryCache } = loadTsModule("../../lib/travel-data/cache.ts");

test("parseLngLat 解析高德 lng,lat", () => {
  assert.deepEqual(utils.parseLngLat("87.6,43.8"), {
    longitude: 87.6,
    latitude: 43.8,
  });
  assert.equal(utils.parseLngLat(""), null);
  assert.equal(utils.parseLngLat("87.6"), null);
  assert.equal(utils.parseLngLat("a,b"), null);
});

test("decodeAmapPolyline 过滤无效坐标段", () => {
  assert.deepEqual(utils.decodeAmapPolyline("87.6,43.8;88.1,44.2"), [
    { longitude: 87.6, latitude: 43.8 },
    { longitude: 88.1, latitude: 44.2 },
  ]);
  assert.deepEqual(utils.decodeAmapPolyline("87.6,43.8;bad;88.1,44.2"), [
    { longitude: 87.6, latitude: 43.8 },
    { longitude: 88.1, latitude: 44.2 },
  ]);
  assert.deepEqual(utils.decodeAmapPolyline(""), []);
});

test("sanitizeLocationName 清洗路线地点名", () => {
  assert.equal(utils.sanitizeLocationName("伊宁 → 那拉提"), "那拉提");
  assert.equal(utils.sanitizeLocationName("乌市"), "乌鲁木齐");
  assert.equal(utils.sanitizeLocationName("乌鲁木齐"), "乌鲁木齐");
});

test("formatDistance 距离格式化", () => {
  assert.equal(utils.formatDistance(552000), "552 km");
  assert.equal(utils.formatDistance(10500), "10.5 km");
  assert.equal(utils.formatDistance(900), "900 m");
  assert.equal(utils.formatDistance(-1), "—");
});

test("formatDuration 驾驶时长格式化", () => {
  assert.equal(utils.formatDuration(5400), "1 小时 30 分钟");
  assert.equal(utils.formatDuration(3600), "1 小时");
  assert.equal(utils.formatDuration(60), "1 分钟");
  assert.equal(utils.formatDuration(-1), "—");
});

test("MemoryCache 命中、过期与清理", () => {
  const cache = new MemoryCache();
  assert.equal(cache.get("key"), null);

  cache.set("key", { ok: true }, 50);
  assert.deepEqual(cache.get("key"), { ok: true });
  assert.deepEqual(cache.get("key"), { ok: true });

  cache.clear();
  assert.equal(cache.get("key"), null);
});
test("sanitizeLocationName 青海湖歧义地名消歧", () => {
  assert.equal(utils.sanitizeLocationName("青海湖"), "共和县青海湖");
  assert.equal(utils.sanitizeLocationName("共和县青海湖"), "共和县青海湖");
  assert.equal(utils.sanitizeLocationName("伊宁 → 那拉提"), "那拉提");
});
