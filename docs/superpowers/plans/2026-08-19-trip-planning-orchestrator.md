# Trip Planning Orchestrator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 TripBrief → 数据采集 → 交通 → POI/路线 → Budget → Planner → Timeline → Map 串成带阶段状态的完整规划闭环。

**Architecture:** 新增客户端 `PlanningOrchestrator`，协调现有 Amap 数据层、TransportationService、PlannerAgent、BudgetEngine、ReviewAgent、ItineraryAgent，并通过 `PlanningProgress` 推送阶段状态。UI 使用新 `PlanningStatus` 组件展示进度，结果写入 sessionStorage 供 `/trip` 页复用。

**Tech Stack:** Next.js 14 App Router / TypeScript / Tailwind / 现有 agents 与 lib/travel-data。

## Global Constraints
- 用户预算是硬约束：`TripBrief.budget` 是唯一上限，AI 不得覆盖。
- NO_DATA 不等于 0 元：缺失数据必须标记，不得伪装真实价格。
- Planner 不得自行猜测地点/距离/路线/价格；真实数据优先，缺失时保持估算标记。
- 本 Sprint 不接酒店/航班/火车 API，不做 Replanner Agent。
- 本 Sprint 不运行本地测试（用户指定由 CC 测试）。

---