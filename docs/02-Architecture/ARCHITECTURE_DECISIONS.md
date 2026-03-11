# 架構決策日誌

## ADR-001：使用 Laravel 風格 Schema Builder（2026-03-10）

### 決策

在 Gravito/Atlas migration 系統之上抽象一層 SchemaBuilder，提供 Laravel 風格的流暢 API。

### 背景

- Gravito/Atlas 提供原生 SQL migration 支持
- 原始 SQL 重複性高，新成員需要寫 SQL
- 希望提供更友善的開發體驗

### 選項評估

| 選項 | 優點 | 缺點 |
|------|------|------|
| Laravel 風格 SchemaBuilder | 開發體驗好、框架無關 | 維護成本、功能受限 |
| 原生 SQL | 無維護負擔、完全依賴官方 | 重複性高、陡峭學習曲線 |
| 混合方案 | 兼顧兩者 | 需要有紀律地使用 |

### 決策

採用 **混合方案**：
- 常見操作用 SchemaBuilder（id、string、timestamps 等）
- 複雜操作用 `rawSQL()` escape hatch

### 實現

- `database/SchemaBuilder.ts` - 核心 schema builder（295 行）
- `database/MigrationHelper.ts` - 便利函數（71 行）
- 自動生成 migration 使用 SchemaBuilder

### 風險及對策

| 風險 | 對策 |
|------|------|
| Atlas 升級導致不兼容 | 定期檢查 Atlas 更新日誌 |
| SchemaBuilder 功能不足 | 使用 `rawSQL()` 或擴展 SchemaBuilder |
| 新成員困惑 | 在 README 和文檔中清楚說明 |
| 維護成本累積 | 監測 rawSQL 使用頻率（目標 <10%） |

### 監測指標

- **rawSQL 使用頻率**: 目標 <10%（說明 SchemaBuilder 功能足夠）
- **migration 平均行數**: 目標 <20 行（便於審查）
- **新成員反饋**: 定期收集開發體驗反饋

### 回滾條件

如果以下任一條件成立，考慮回滾到純 SQL：

1. rawSQL 使用頻率持續 >30%（超過 3 個月）
2. SchemaBuilder 維護成本 >10 人/月
3. Atlas 官方推出更好的 schema builder 替代方案
4. 新成員反饋一致性為負面（新建模組效率降低）

### 決策者

- 架構師：Carl
- 審核日期：2026-03-10
- 下次評估：2026-09-10（6 個月後）
