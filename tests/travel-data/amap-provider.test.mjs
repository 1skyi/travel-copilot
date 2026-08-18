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

// 这是 AMapProvider 的回归覆盖；通过注入 fetch 验证 WALKING/TRANSIT 会调用对应端点并返回真实字段。
const location = loadTsModule("types/location.ts");
const errors = loadTsModule("lib/travel-data/errors.ts");
const cache = loadTsModule("lib/travel-data/cache.ts");
const utils = loadTsModule("lib/travel-data/utils.ts");
const parsers = loadTsModule("lib/travel-data/providers/amapRouteParsers.ts", {
  "../utils": utils,
});
const providerModule = loadTsModule("lib/travel-data/providers/AmapProvider.ts", {
  "@/types/location": location,
  "../interfaces/MapProvider": {},
  "../errors": errors,
  "../cache": cache,
  "../utils": utils,
  "./amapRouteParsers": parsers,
});

test("AmapProvider route supports WALKING endpoint", async () => {
  const calls = [];
  const provider = new providerModule.AmapProvider("test-key", {
    fetchFn: async (url) => {
      calls.push(url);
      return {
        ok: true,
        json: async () => ({
          status: "1",
          route: {
            paths: [
              {
                distance: "2500",
                duration: "1800",
                steps: [{ polyline: "87.6,43.8;87.61,43.81" }],
              },
            ],
          },
        }),
      };
    },
  });
  const result = await provider.route(
    { id: "a", name: "A", address: "A", latitude: 43.8, longitude: 87.6, source: "AMAP", sourceType: "EXTERNAL_DATA", fetchedAt: "" },
    { id: "b", name: "B", address: "B", latitude: 43.9, longitude: 87.7, source: "AMAP", sourceType: "EXTERNAL_DATA", fetchedAt: "" },
    "WALKING"
  );
  assert.equal(calls[0].includes("/v3/direction/walking?"), true);
  assert.equal(result.mode, "WALKING");
  assert.equal(result.distance.value, 2500);
  assert.equal(result.duration.value, 1800);
  assert.equal(result.polyline.length, 2);
});

test("AmapProvider route supports TRANSIT endpoint", async () => {
  const calls = [];
  const provider = new providerModule.AmapProvider("test-key", {
    fetchFn: async (url) => {
      calls.push(url);
      return {
        ok: true,
        json: async () => ({
          status: "1",
          route: {
            transits: [
              {
                distance: "4200",
                duration: "1500",
                segments: [
                  {
                    walking: {
                      steps: [{ polyline: "87.6,43.8;87.61,43.81" }],
                    },
                  },
                  {
                    bus: {
                      buslines: [{ polyline: "87.61,43.81;87.62,43.82" }],
                    },
                  },
                ],
              },
            ],
          },
        }),
      };
    },
  });
  const result = await provider.route(
    { id: "a", name: "A", address: "A", latitude: 43.8, longitude: 87.6, source: "AMAP", sourceType: "EXTERNAL_DATA", fetchedAt: "" },
    { id: "b", name: "B", address: "B", latitude: 43.9, longitude: 87.7, source: "AMAP", sourceType: "EXTERNAL_DATA", fetchedAt: "" },
    "TRANSIT"
  );
  assert.equal(calls[0].includes("/v3/direction/transit/integrated?"), true);
  assert.equal(result.mode, "TRANSIT");
  assert.equal(result.distance.value, 4200);
  assert.equal(result.duration.value, 1500);
  assert.equal(result.polyline.length, 4);
});

test("OVER_DIRECTION_RANGE 映射为 404 NO_DATA 而非 502", async () => {
  const provider = new providerModule.AmapProvider("test-key", {
    fetchFn: async () => ({
      ok: true,
      json: async () => ({ status: "0", info: "OVER_DIRECTION_RANGE" }),
    }),
  });
  try {
    await provider.route(
      { id: "a", name: "A", address: "A", latitude: 43.8, longitude: 87.6, source: "AMAP", sourceType: "EXTERNAL_DATA", fetchedAt: "" },
      { id: "b", name: "B", address: "B", latitude: 44.6, longitude: 81.2, source: "AMAP", sourceType: "EXTERNAL_DATA", fetchedAt: "" },
      "WALKING"
    );
    assert.fail("应当抛出 TravelDataError");
  } catch (error) {
    assert.equal(error.status, 404);
    assert.equal(error.provider, "AMAP");
    assert.ok(String(error.message).includes("超出规划范围"));
  }
});

test("非超范围的高德错误仍为 502", async () => {
  const provider = new providerModule.AmapProvider("test-key", {
    fetchFn: async () => ({
      ok: true,
      json: async () => ({ status: "0", info: "INVALID_USER_KEY" }),
    }),
  });
  try {
    await provider.geocode("乌鲁木齐");
    assert.fail("应当抛出 TravelDataError");
  } catch (error) {
    assert.equal(error.status, 502);
  }
});

test("geocode 引擎错误时降级到 POI 取真实坐标", async () => {
  const provider = new providerModule.AmapProvider("test-key", {
    fetchFn: async (url) => {
      if (url.includes("/v3/geocode/geo")) {
        return {
          ok: true,
          json: async () => ({ status: "0", info: "ENGINE_RESPONSE_DATA_ERROR" }),
        };
      }
      if (url.includes("/v3/place/text")) {
        return {
          ok: true,
          json: async () => ({
            status: "1",
            pois: [
              {
                id: "POI1",
                name: "天山天池风景区",
                type: "风景名胜",
                address: "天山天池风景区(西北角)",
                location: "88.13,43.90",
              },
            ],
          }),
        };
      }
      throw new Error("unexpected url: " + url);
    },
  });

  const result = await provider.geocode("天山天池");
  assert.equal(result.name, "天山天池");
  assert.equal(result.latitude, 43.9);
  assert.equal(result.longitude, 88.13);
  assert.equal(result.source, "AMAP");
  assert.equal(result.sourceType, "EXTERNAL_DATA");
});

test("geocode 引擎错误且 POI 也失败时上抛原错误", async () => {
  const provider = new providerModule.AmapProvider("test-key", {
    fetchFn: async (url) => {
      if (url.includes("/v3/geocode/geo")) {
        return {
          ok: true,
          json: async () => ({ status: "0", info: "ENGINE_RESPONSE_DATA_ERROR" }),
        };
      }
      // POI 同样引擎错误
      return {
        ok: true,
        json: async () => ({ status: "0", info: "ENGINE_RESPONSE_DATA_ERROR" }),
      };
    },
  });

  try {
    await provider.geocode("天山天池");
    assert.fail("应当抛出错误");
  } catch (error) {
    assert.equal(error.status, 502);
    assert.ok(String(error.message).includes("ENGINE_RESPONSE_DATA_ERROR"));
  }
});
