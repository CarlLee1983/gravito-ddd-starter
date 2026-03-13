# 🗄️ 數據庫 & ORM 完整指南

靈活切換 ORM，無代碼改動。從 Memory 到 Drizzle 到 Atlas。

---

## 📋 本分類包含

| 文檔 | 重點 |
|------|------|
| **[ORM_GUIDE.md](./ORM_GUIDE.md)** | ⭐ **核心指南**：資料庫遷移、播種與常用查詢指令 |
| **[ORM_TRANSPARENT_DESIGN.md](./ORM_TRANSPARENT_DESIGN.md)** | 核心原理：為什麼能實現無感知 ORM 切換 |
| **[ORM_SWAPPING_EXAMPLES.md](./ORM_SWAPPING_EXAMPLES.md)** | 實戰案例：切換過程中的常見問題與解決方案 |

---

## 🎯 快速導航

### "我想用 Memory ORM 開發"
→ 完成！系統預設在未指定 ORM 時使用 Memory。
→ 參考 [ORM_GUIDE.md](./ORM_GUIDE.md) 的開發流程。

### "我想切換到 Drizzle (SQLite/LibSQL)"
→ 在 `.env` 設定 `ORM=drizzle`。
→ 參考 [ORM_GUIDE.md](./ORM_GUIDE.md) 執行 `migrate` 指令。

### "我想使用 Atlas (PostgreSQL/MySQL)"
→ 在 `.env` 設定 `ORM=atlas` 並配置 `DB_CONNECTION`。
→ 參考 [ORM_GUIDE.md](./ORM_GUIDE.md) 的資料庫配置章節。

---

## 📊 ORM 對比

| 特性 | Memory | Drizzle | Atlas |
|------|--------|---------|-------|
| **適用場景** | 單元測試 / 快速開發 | 生產環境 (小型/SQLite) | 生產環境 (中大型/SQL) |
| **配置難度** | 零配置 | 極低 | 低 (需設定 DB 連接) |
| **性能** | 極高 (RAM) | 高 | 極高 |
| **持久化** | ❌ 否 | ✅ 是 | ✅ 是 |
| **功能完整性** | 基本 CRUD | 完整 SQL | 完整 SQL + 動態模型 |

---

## 🚀 典型開發生命週期

1. **開發階段**：使用 `ORM=memory` 專注於業務邏輯編寫。
2. **測試階段**：使用 `ORM=memory` 運行快速單元測試。
3. **整合階段**：切換至 `ORM=drizzle` 驗證 SQL Schema 與遷移邏輯。
4. **生產階段**：根據需求選擇 `ORM=atlas` (PostgreSQL) 或 `ORM=drizzle` (SQLite)。

---

## 🔑 核心抽象介面 (Port)

系統定義了 `IDatabaseAccess` 介面，所有 Repository 僅依賴此介面，不直接依賴 ORM：

```typescript
// app/Shared/Infrastructure/Ports/Database/IDatabaseAccess.ts
export interface IQueryBuilder {
  where(column: string, operator: string, value: unknown): IQueryBuilder
  first(): Promise<Record<string, unknown> | null>
  select(): Promise<Record<string, unknown>[]>
  insert(data: Record<string, unknown>): Promise<void>
  // ...
}
```

---

## 📚 常用指令

```bash
# 執行資料庫遷移
bun run migrate

# 執行資料種子 (Seeder)
bun run seed

# 重置資料庫 (Fresh Migrate + Seed)
bun run db:fresh

# 檢查資料庫狀態
bun orbit doctor
```

---

## 🔗 相關資源

**DDD 實踐**:
- [領域層 Repository 介面定義](../02-Architecture/CORE_DESIGN.md)
- [Repository 基類實作](../02-Architecture/EVENT_SYSTEM.md)

**架構接線**:
- [資料庫訪問建構器 (DatabaseAccessBuilder)](../06-Adapters-Wiring/WIRING_SYSTEM.md)

---

**快速導航**:
← [模組開發](../04-Module-Development/)
→ [架構設計](../02-Architecture/)

最後更新: 2026-03-13
