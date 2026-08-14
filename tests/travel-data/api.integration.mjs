import test from "node:test";
import assert from "node:assert/strict";

// 使用前先启动开发服务器并配置 .env.local:
//   AMAP_API_KEY=真实高德Web服务Key
//   npm run dev
// 然后运行:
//   node tests/travel-data/api.integration.mjs
const BASE_URL =
  process.env.TRAVEL_COPILOT_BASE_URL ||
  "http://localhost:" + (process.env.PORT || "3000");

async function apiGet(path) {
  const res = await fetch(BASE_URL + path, { cache: "no-store" });
  const body = await res.json();
  return { status: res.status, body };
}

test("1. 正常地点：乌鲁木齐 geocode", async () => {
  const { status, body } = await apiGet("/api/travel/map/geocode?address=" + encodeURIComponent("乌鲁木齐"));
  assert.equal(status, 200);
  assert.equal(body.source, "AMAP");
  assert.equal(body.sourceType, "EXTERNAL_DATA");
  assert.ok(Number.isFinite(body.latitude));
  assert.ok(Number.isFinite(body.longitude));
  assert.ok(body.fetchedAt);
});

test("2. 正常路线：乌鲁木齐 → 赛里木湖", async () => {
  const path = "/api/travel/map/route?origin=" + encodeURIComponent("乌鲁木齐") +
    "&destination=" + encodeURIComponent("赛里木湖") + "&mode=DRIVING";
  const { status, body } = await apiGet(path);
  assert.equal(status, 200);
  assert.equal(body.source, "AMAP");
  assert.ok(body.distance.value > 0);
  assert.ok(body.duration.value > 0);
  assert.ok(Array.isArray(body.polyline) && body.polyline.length > 0);
});

test("3. 正常POI：赛里木湖", async () => {
  const { status, body } = await apiGet("/api/travel/map/poi?keyword=" + encodeURIComponent("赛里木湖"));
  assert.equal(status, 200);
  assert.ok(Array.isArray(body));
  if (body.length > 0) {
    assert.equal(body[0].source, "AMAP");
    assert.equal(body[0].sourceType, "EXTERNAL_DATA");
  }
});

test("4. 错误地点", async () => {
  const { status, body } = await apiGet("/api/travel/map/geocode?address=" + encodeURIComponent("这个地方肯定不存在xyzzy"));
  assert.ok(status >= 400, "expected error status, got " + status);
  assert.ok(body.error && body.error.provider === "AMAP");
});

test("5. 空参数", async () => {
  assert.equal((await apiGet("/api/travel/map/geocode?address=")).status, 400);
  assert.equal((await apiGet("/api/travel/map/poi?keyword=")).status, 400);
  assert.equal((await apiGet("/api/travel/map/route?origin=&destination=")).status, 400);
});

test("8. 路线查询失败：无效 mode", async () => {
  const path = "/api/travel/map/route?origin=" + encodeURIComponent("乌鲁木齐") +
    "&destination=" + encodeURIComponent("赛里木湖") + "&mode=FLYING";
  const { status, body } = await apiGet(path);
  assert.ok(status >= 400);
  assert.ok(body.error && body.error.provider === "AMAP");
});

test("9. 重复查询：缓存命中", async () => {
  const path = "/api/travel/map/geocode?address=" + encodeURIComponent("乌鲁木齐");
  const first = await apiGet(path);
  const second = await apiGet(path);
  assert.equal(first.status, 200);
  assert.deepEqual(second.body, first.body);
});

test.skip("6. API Key错误：需要以无效 AMAP_API_KEY 单独启动服务", () => {});
test.skip("7. API超时：需要网络故障注入", () => {});
test.skip("10. 页面刷新：需要浏览器自动化验证", () => {});