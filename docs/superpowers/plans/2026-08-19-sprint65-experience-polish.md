# Sprint 6.5 产品体验收口 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把现有功能整理成首次用户不看说明即可走完的面试 Demo：输入需求 → 确认 → 开始规划 → 查看方案 → 查看预算 → 超预算优化。

**Architecture:** 复用现有页面与 Agent，只做体验收口：首页自然语言直达 `/planning?query=`；规划状态扩展为 7 步（理解需求/获取数据/分析交通/规划路线/计算预算/检查预算/重新规划[条件显示]）；`/trip` 改为 地图/Timeline/Budget 三栏；超预算入口增加“重新优化预算”深链；关键推荐补充“为什么”解释；全程数据仍来自 sessionStorage，无新 API/Agent。

**Tech Stack:** Next.js 14 App Router / TypeScript / Tailwind / 现有 agents、BudgetEngine、Replanner。

## Global Constraints
- 不新增大型功能：不接新 API、不新增 Agent、无社交/登录/社区/会员。
- 所有 UI 文案简体中文；数据来源与版本保持一致（Map/Timeline/Budget/Replanner 对应当前 Trip 版本）。
- 解释必须基于已有数据（DNA/TripBrief/调整记录），禁止编造。
- 保持 Travel DNA、TripBrief、Transportation、Amap、Planning Orchestrator、Budget Engine、Replanner、Version 现有能力。
- 不运行测试（用户指定由 CC 验收）；静态复核仅做一致性检查。

---

### Task 1: 规划状态扩展（类型 + 编排器 + 状态组件）
- Modify `types/planning.ts`：`PlanningPhase` 增加 `"UNDERSTANDING" | "TRANSPORT" | "REPLANNING"`。
- Modify `agents/PlanningOrchestrator.ts`：
  - `run()` 开始 emit `UNDERSTANDING`（“正在理解你的旅行需求…”）。
  - 拆分 `collectData` 为 `collectGeoPoi`（COLLECTING_DATA：地理编码+POI）与 `collectTransport`（TRANSPORT：交通候选），两阶段间各 emit 对应 phase。
- Modify `components/PlanningStatus.tsx`：PHASES 顺序 = UNDERSTANDING(理解需求)/COLLECTING_DATA(获取数据)/TRANSPORT(分析交通)/PLANNING(规划路线)/CALCULATING_BUDGET(计算预算)/CHECKING(检查预算)/COMPLETED(完成)；`REPLANNING`(重新优化预算) 仅当 activePhase === "REPLANNING" 时渲染（“如果触发”）。

### Task 2: 首页直达规划
- Modify `app/page.tsx`：
  - 标题区新增 “你的 AI 旅行决策助手” + 副标题。
  - 输入框 placeholder 改为示例句；下方加示例 chip（点击填充）。
  - `handleStart` / 热门目的地改为 `router.push("/planning?query=" + encodeURIComponent(text))`。
  - Demo 模板保持不变（继续 `/planning?destination=&days=`）。

### Task 3: planning 页支持 query 预填
- Modify `app/planning/page.tsx`：
  - 读取 `searchParams.get("query")`；抽 `submitNl(text)`（原 handleNlSubmit 逻辑），`useRef` 防重入，首次挂载时 `setNlInput(text)` + `submitNl(text)`，自动进入收集/确认流程。

### Task 4: /trip 三栏 + 预算摘要 + 为什么
- Modify `app/trip/page.tsx`：
  - 布局改为 `lg:grid-cols-[1fr_1fr_340px]`：地图 / Timeline / Budget 三栏（保留边框区分）。
  - 新增只读 Budget 栏：用户预算（硬约束）+ 状态徽章（UNDER/ON/OVER_BUDGET）、已规划/剩余、分项 lines（金额 + 来源徽章 REAL/ESTIMATED/NO_DATA）、`hasIncompleteData` 提示、超预算红色横幅 + “重新优化预算”→ `/plans?plan=idx` + “调整预算”→ `/budget?plan=idx`。
  - Timeline 栏顶部加 “为什么这样安排路线？” 可折叠解释（基于 DNA：风格/节奏/避雷 + plan.desc + 已接受 V2 说明）。

### Task 5: plans 页 query 预选方案
- Modify `app/plans/page.tsx`：包 `Suspense` + `useSearchParams`，`?plan=` 存在时预选对应方案（供“重新优化预算”深链定位超预算方案）。

### Task 6: ReplannerPanel 运行态提示
- Modify `components/ReplannerPanel.tsx`：新增可选 `running` prop，运行中显示 “正在重新优化预算…” 步骤提示（满足“重新规划（如果触发）”状态可见）。

### Task 7: 静态复核 + 文档
- `git diff --check`、扫描 `\r\n` 损坏/console.log、行尾统一 LF、类型引用一致性。
- 不运行测试/构建（CC 验收）。

---

## Status

- 2026-08-19：Sprint 6.5 已实现（静态复核通过，未运行测试/构建，由 CC 验收）。
