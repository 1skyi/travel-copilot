# Budget-aware Replanner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 当旅行方案超预算时，Replanner 基于当前方案做局部调整、重新调用 BudgetEngine 计算，生成不覆盖历史的 V2 新方案；仍超预算时如实告知并保留原方案。

**Architecture:** 新增 `ReplannerAgent`（纯客户端，无新 API）：输入 TripPlan + TripBrief + TravelDNA + 用户已选/默认 selections，在 `BudgetSummary.isOverBudget` 时按优先级（住宿降级 → 交通降档 → 餐饮降档 → 勾选活动削减 → 当地交通降档）逐步调整 selections，每步用 `BudgetEngine.calculate` 重算；成功后把 V2 plan（route 不变，title/desc/tags 标记“省钱版”）与调整明细写入 sessionStorage，`/trip` 在已接受时展示 V2。

**Tech Stack:** Next.js 14 App Router / TypeScript strict / 现有 BudgetEngine / sessionStorage。

## Global Constraints
- 用户预算来自 `TripBrief.budget`，AI 不得修改 `plan.budget`。
- 只有 `BudgetSummary.isOverBudget === true` 才触发 Replanner。
- 每步调整后必须调用现有 `BudgetEngine.calculate(brief, selections)` 重算。
- `success = !newBudget.isOverBudget`（estimatedMin <= totalBudget）。
- 仍超预算：不伪造结果，保留当前方案，message 明确告知。
- 保留 V1（`s3-plans` 不动），V2 存 `s3-replan-results` / `s3-active-replan`。
- 本 Sprint 不新增依赖、不接酒店/航班/火车 API、不做多 Agent。
- 不运行测试（用户指定由 CC 验收测试）；静态复核仅做一致性检查。

---

### Task 1: 类型定义 `types/replanner.ts`

**Files:**
- Create: `types/replanner.ts`

**Interfaces:**
- Produces: `ReplanCategory`、`ReplanAdjustment`、`ReplanInput`、`ReplanResult`（供 Task 2/3/4 使用）。

```ts
export type ReplanCategory = "transport" | "accommodation" | "food" | "tickets" | "localTransport" | "other";

export interface ReplanAdjustment {
  id: string;
  category: ReplanCategory;
  label: string;          // 修改了什么，例如 "住宿降级"
  detail: string;         // 明细，例如 "舒适型酒店 → 经济型酒店（3 晚）"
  originalAmount: number; // 该分类调整前金额
  newAmount: number;      // 该分类调整后金额
  savedAmount: number;    // originalAmount - newAmount
  reason: string;         // 为什么这样调整
}

export interface ReplanInput {
  plan: TripPlan;
  brief: TripBrief;
  dna: TravelDNA | null;
  selections?: UserSelections | null;
  transportation?: TransportationSelection | null;
}

export interface ReplanResult {
  planId: string;
  baseVersion: number;
  newVersion: number;
  success: boolean;
  stillOverBudget: boolean;
  originalBudget: BudgetSummary;
  newBudget: BudgetSummary;
  plan: TripPlan;
  adjustments: ReplanAdjustment[];
  mainOverBudgetSource: { key: ReplanCategory; label: string; amount: number } | null;
  message: string;
  createdAt: string;
}
```

### Task 2: `agents/ReplannerAgent.ts`

**Files:**
- Create: `agents/ReplannerAgent.ts`

**Interfaces:**
- Consumes: `types/replanner.ts`、`BudgetEngine`、`getTotalBudget/getTravelerCount`、`UserSelections`、`TransportMode`。
- Produces: `class ReplannerAgent { replan(input: ReplanInput): Promise<ReplanResult> }`。

逻辑要点（见代码注释）：
- selections 缺失或 planId 不匹配时用 `createDefaultSelectionsWithTransportationAsync` 生成默认。
- `originalBudget = engine.calculate(brief, selections)`；非超预算直接返回 no-op 成功结果。
- 循环（最多 12 次）选择最大节省的局部调整：
  1. 住宿：每个 stay 选更低价 option（价格升序取最低），节省 = (旧-新)×nights×rooms。
  2. 交通：每个 segment 选更低价 option；DNA 避雷长驾驶时跳过 DRIVE；用户已选 REAL/USER_INPUT 交通不自动降档。
  3. 餐饮：选更低价 food preference，节省 = (中点差)×people×days。
  4. 门票：取消最高价 optional 活动，节省 = cost×people。
  5. 当地交通：选更低价 option，节省 = (差)×people×days。
- 每步 apply 后 `engine.calculate` 重算，记录该分类行金额差作为 adjustment。
- `buildVersion2`：`id = plan.id + "-v2"`、`title = "省钱版 · " + plan.title`、desc 前缀成功/失败文案、tags 追加 "省钱优化"；route/budget 不变。
- `mainOverBudgetSource` = originalBudget.lines 中非 other、金额最大的行。

### Task 3: `components/ReplannerPanel.tsx`

**Files:**
- Create: `components/ReplannerPanel.tsx`

**Interfaces:**
- Consumes: `ReplanResult`。
- Produces: `function ReplanPanel({ result, onAccept, onDiscard, accepting }: {...})`。

内容：
- 版本徽章 `V1 → V2` + 成功/仍超预算状态横幅。
- 新预算摘要：预计 `estimatedMin ~ estimatedMax`、剩余 `remainingMax`、预算总额。
- 调整明细列表（每行：label/detail、原金额 → 新金额、节省 ¥、reason“为什么这样调整”）。
- 成功时：[接受新方案并查看行程]（onAccept）与 [放弃，保留原方案]（onDiscard）。
- 失败时：不显示接受按钮，提示“仍超预算，已保留当前方案”，附 [去预算页调整] 链接 `/budget?plan=`。

### Task 4: `app/plans/page.tsx` 集成

**Files:**
- Modify: `app/plans/page.tsx`

**Interfaces:**
- Consumes: `ReplannerAgent`、`ReplanPanel`、`ReplanResult`。
- Produces: 触发/接受流程。

- 新增 state：`brief`、`selections`、`transportSelection`、`replanResults: Record<string, ReplanResult>`、`replanning`、`accepting`、`replanError`。
- 加载：`s3-brief`、`s3-user-selections`、`s3-transportation-selection`、`s3-replan-results`。
- 选中方案且 `selectedBudget.overBudget` 时显示按钮 `✨ 生成符合预算的新方案（V1 → V2）`。
- `runReplan`：`new ReplannerAgent().replan({plan, brief, dna, selections, transportation})` → 合并写 `s3-replan-results`。
- 接受：写 `s3-user-selections`（result 对应调整后 selections 需由 Replanner 一并返回）→ 见下方说明；写 `s3-budget-summary`（result.newBudget）；写 `s3-active-replan = { planId, result }`；跳 `/trip?plan=`。
- 放弃：仅清除 `s3-active-replan`。

> 说明：为使 plans 页接受后能持久化调整后的 selections，`ReplanResult` 增加 `selections: UserSelections` 字段（Task 1/2 同步补充）。

### Task 5: `app/trip/page.tsx` V2 展示

**Files:**
- Modify: `app/trip/page.tsx`

- 读取 `s3-active-replan`；若 `planId === plans[idx].id`，用 `result.plan` 作为展示 plan（title 已是“省钱版”），顶栏加 `<Badge>V2 省钱版</Badge>`。
- route 与 V1 一致，地图/时间线 seed 不受影响。

### Task 6: 编排器清理 + 文档 + 静态复核

**Files:**
- Modify: `agents/PlanningOrchestrator.ts`（run 开始时清除 `s3-replan-results`、`s3-active-replan`）
- Create: `docs/superpowers/plans/2026-08-19-budget-aware-replanner.md`（本文档）

- `git diff --check`、扫描 `\r\n` 损坏/console.log、类型引用一致性检查。
- 不运行测试/构建（用户指定 CC 验收）。