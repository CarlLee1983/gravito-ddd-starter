# 🗄️ 數據庫 & ORM 完整指南

靈活切換 ORM，無代碼改動。從 Memory 到 Drizzle 到 Atlas。

---

## 📋 本分類包含

| 文檔 | 重點 |
|------|------|
| **[DATABASE.md](./DATABASE.md)** | ⭐ 遷移、播種、查詢的完整指南 |
| **[ORM_TRANSPARENT_DESIGN.md](./ORM_TRANSPARENT_DESIGN.md)** | 為什麼能無感知切換 ORM |
| **[ORM_MIGRATION_GUIDE.md](./ORM_MIGRATION_GUIDE.md)** | 從 Memory → Drizzle → Atlas 的遷移 |
| **[ATLAS_ADAPTER_GUIDE.md](./ATLAS_ADAPTER_GUIDE.md)** | Atlas ORM 完整實施指南 |
| **[DRIZZLE_ADAPTER_ROADMAP.md](./DRIZZLE_ADAPTER_ROADMAP.md)** | Drizzle ORM 實施指南 |
| **[ORM_SWAPPING_EXAMPLES.md](./ORM_SWAPPING_EXAMPLES.md)** | 實際案例：ORM 切換 |
| **[UNIFIED_ORM_SWAPPING.md](./UNIFIED_ORM_SWAPPING.md)** | 統一的 ORM 切換機制 |

---

## 🎯 快速導航

### "我想用 Memory ORM 開發"
→ 完成！默認就是 Memory
→ [DATABASE.md](./DATABASE.md) 查詢指令

### "我想切換到 Drizzle（SQLite）"
→ [ORM_MIGRATION_GUIDE.md](./ORM_MIGRATION_GUIDE.md)
```bash
ORM=drizzle bun run start
```

### "我想用 Atlas（完整版）"
→ [ATLAS_ADAPTER_GUIDE.md](./ATLAS_ADAPTER_GUIDE.md)
```bash
ORM=atlas bun run start
```

### "我想理解為什麼能無感知切換 ORM"
→ [ORM_TRANSPARENT_DESIGN.md](./ORM_TRANSPARENT_DESIGN.md)

### "我有具體的遷移問題"
→ [ORM_SWAPPING_EXAMPLES.md](./ORM_SWAPPING_EXAMPLES.md)

---

## 📊 ORM 對比

| 特性 | Memory | Drizzle | Atlas |
|------|--------|---------|-------|
| **適用場景** | 開發/測試 | 生產（SQLite） | 生產（完整） |
| **設置難度** | 零配置 | 低 | 中 |
| **性能** | - | 高 | 非常高 |
| **遷移支援** | ✅ | ✅ | ✅ |
| **價格** | 免費 | 免費 | 免費 |
| **推薦度** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

---

## 🚀 典型流程

### 開發階段
```bash
# 使用 Memory ORM（無配置）
ORM=memory bun run dev

# 建立模組、寫代碼、測試
bun run make:module Product
bun test
```

### 驗證階段
```bash
# 切換到 Drizzle 驗證
ORM=drizzle bun run migrate
ORM=drizzle bun test

# 代碼無需改動！
```

### 上線階段
```bash
# 選擇 Atlas 或 Drizzle
ORM=atlas bun run migrate
ORM=atlas bun run start
```

---

## 🔑 核心概念

### IDatabaseAccess 介面
所有 Repository 依賴的抽象層：

```typescript
interface IQueryBuilder {
  where(field, operator, value): IQueryBuilder
  limit(n): IQueryBuilder
  select(): Promise<any[]>
  insert(data): Promise<void>
  // ... 更多方法
}

interface IDatabaseAccess {
  table(name: string): IQueryBuilder
  // ...
}
```

### ORM 實現
- **MemoryDatabaseAccess** - 使用 Map 儲存
- **DrizzleQueryBuilder** - 轉換為 Drizzle API
- **AtlasQueryBuilder** - 轉換為 Atlas API

---

## 📚 常見 Migration 指令

```bash
# 執行遷移
bun run migrate

# 查看遷移狀態
bun run migrate:status

# 回滾
bun run migrate:rollback

# 清空重新遷移
bun run migrate:fresh

# 播種（插入初始數據）
bun run seed

# 完整重置（遷移 + 播種）
bun run db:fresh
```

詳見 [DATABASE.md](./DATABASE.md)

---

## 💡 為什麼能無感知切換？

1. **單一入口點**
   - `DatabaseAccessBuilder` 根據 `env.ORM` 決定實現

2. **統一介面**
   - Repository 只依賴 `IDatabaseAccess`
   - 不知道底層是 Memory、Drizzle 還是 Atlas

3. **工廠模式**
   - 每個 ORM 實現相同的 `IQueryBuilder` 介面
   - 只是 SQL 生成方式不同

---

## 🔗 相關資源

**DDD 相關**:
- [Repository 抽象](../03-DDD-Design/REPOSITORY_ABSTRACTION_TEMPLATE.md)
- [DDD 檢查清單](../03-DDD-Design/DDD_IMPLEMENTATION_CHECKLIST.md)

**模組開發**:
- [模組開發指南](../04-Module-Development/MODULE_GUIDE.md)
- [模組生成](../04-Module-Development/MODULE_GENERATION.md)

**架構**:
- [ORM 透明設計](./ORM_TRANSPARENT_DESIGN.md)
- [可擴展架構](../02-Architecture/SCALABLE_ORM_ARCHITECTURE.md)

---

**快速導航**:
← [模組開發](../04-Module-Development/)
→ [適配器&接線](../06-Adapters-Wiring/)

最後更新: 2026-03-11
