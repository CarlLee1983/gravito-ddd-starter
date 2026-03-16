# 事件驅動系統（精簡版）

本文件概述 Gravito DDD 的事件驅動設計，用於跨模組協作與副作用處理。

---

## ✅ 核心概念

- **Domain Events**：由聚合根發佈，代表業務事實
- **Integration Events**：跨模組或外部整合的訊息

---

## ✅ 分發策略

- **Memory**：同步分發（開發/簡化場景）
- **Redis**：非同步隊列
- **RabbitMQ**：AMQP 佈署

---

## ✅ 可靠性

- 自動重試（指數退避）
- Dead Letter Queue (DLQ)

---

## ✅ 使用準則

- Domain 層只發佈事件，不直接呼叫外部系統
- Application / Infrastructure 處理事件副作用
- 跨模組協作優先採事件，而非直接調用

最後更新: 2026-03-16
