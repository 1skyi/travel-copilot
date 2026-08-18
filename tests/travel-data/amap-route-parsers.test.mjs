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

const utils = loadTsModule("lib/travel-data/utils.ts");
const parsers = loadTsModule("lib/travel-data/providers/amapRouteParsers.ts", {
  "../utils": utils,
});
const service = loadTsModule("lib/travel-data/TravelDataService.ts");

test("parseAmapPathRoute parses DRIVING/WALKING path response", () => {
  const result = parsers.parseAmapPathRoute({
    route: {
      paths: [
        {
          distance: "552000",
          duration: "21600",
          steps: [{ polyline: "87.6,43.8;88.1,44.2" }],
        },
      ],
    },
  });
  assert.deepEqual(result, {
    distance: 552000,
    duration: 21600,
    polyline: [
      { longitude: 87.6, latitude: 43.8 },
      { longitude: 88.1, latitude: 44.2 },
    ],
  });
});

test("parseAmapPathRoute returns null for empty path", () => {
  assert.equal(parsers.parseAmapPathRoute({ route: { paths: [] } }), null);
});

test("parseAmapPathRoute returns null when polyline is missing", () => {
  const result = parsers.parseAmapPathRoute({
    route: { paths: [{ distance: "100", duration: "60", steps: [] }] },
  });
  assert.equal(result, null);
});

test("parseAmapTransitRoute parses TRANSIT segments", () => {
  const result = parsers.parseAmapTransitRoute({
    route: {
      transits: [
        {
          distance: "6800",
          duration: "2400",
          segments: [
            {
              walking: {
                steps: [{ polyline: "87.6,43.8;87.7,43.9" }],
              },
            },
            {
              bus: {
                buslines: [{ polyline: "87.7,43.9;87.8,44.0" }],
              },
            },
          ],
        },
      ],
    },
  });
  assert.deepEqual(result, {
    distance: 6800,
    duration: 2400,
    polyline: [
      { longitude: 87.6, latitude: 43.8 },
      { longitude: 87.7, latitude: 43.9 },
      { longitude: 87.7, latitude: 43.9 },
      { longitude: 87.8, latitude: 44.0 },
    ],
  });
});

test("parseAmapTransitRoute returns null when transit is empty", () => {
  assert.equal(parsers.parseAmapTransitRoute({ route: { transits: [] } }), null);
});

test("TravelDataService converts NO_DATA provider errors to null/empty", async () => {
  const noData = { status: 404, message: "not found", provider: "AMAP" };
  const provider = {
    async geocode() { throw noData; },
    async reverseGeocode() { throw noData; },
    async searchPOI() { throw noData; },
    async route() { throw noData; },
  };
  const s = new service.TravelDataService(provider);
  assert.equal(await s.geocode("不存在"), null);
  assert.deepEqual(await s.searchPOI("不存在"), []);
  assert.equal(await s.route({}, {}, "TRANSIT"), null);
});

test("TravelDataService rethrows non-NO_DATA provider errors", async () => {
  const provider = {
    async geocode() { throw { status: 502, message: "api down", provider: "AMAP" }; },
    async reverseGeocode() { throw new Error("x"); },
    async searchPOI() { return []; },
    async route() { return null; },
  };
  const s = new service.TravelDataService(provider);
  await assert.rejects(() => s.geocode("乌鲁木齐"), (err) => err && err.status === 502);
});
