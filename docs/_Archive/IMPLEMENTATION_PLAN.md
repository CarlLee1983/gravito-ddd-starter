# 依賴抽換架構實施計畫

**目標**：使 Gravito DDD Starter 成為「可隨時抽換依賴的應用」範本

**願景**：ORM 從 Atlas → Drizzle/Prisma/TypeORM 時，僅需改動 `adapters/` 層，不影響業務層

---

## 📊 整體任務清單

### Phase 1: 規則定義 & 邊界保護（1-2 週）

| # | 任務 | 依賴 | 估時 | 優先度 |
|---|------|------|------|--------|
| 1.1 | 建立 ABSTRACTION_RULES.md | - | 4h | 🔴 Critical |
| 1.2 | 標記 IDatabaseAccess 為 @public | 1.1 | 2h | 🔴 Critical |
| 1.3 | 檢查現有代碼是否違反規則 | 1.1 | 4h | 🟠 High |
| 1.4 | 在 CLAUDE.md 中新增「依賴抽象」章節 | 1.1 | 2h | 🟠 High |
| 1.5 | 建立 linter/TypeScript 檢查（禁止 import @gravito）| 1.1 | 6h | 🟡 Medium |

**Phase 1 總耗時**：18h ≈ **2-3 天**

---

### Phase 2: API 標記 & 文檔化（1-2 週）

| # | 任務 | 依賴 | 估時 | 優先度 |
|---|------|------|------|--------|
| 2.1 | 標記 IDatabaseAccess 介面 (@public) | 1.2 | 2h | 🔴 Critical |
| 2.2 | 標記 IQueryBuilder 介面 (@public) | 1.2 | 2h | 🔴 Critical |
| 2.3 | 標記 IRepository 介面 (@public) | 1.2 | 2h | 🔴 Critical |
| 2.4 | 標記 ORM 適配器 (@internal) | 1.2 | 3h | 🟠 High |
| 2.5 | 為公開 API 生成文檔 | 2.1-2.4 | 4h | 🟠 High |
| 2.6 | 更新 TypeScript JSDoc 註解 | 2.1-2.4 | 6h | 🟡 Medium |

**Phase 2 總耗時**：19h ≈ **2-3 天**

---

### Phase 3: Repository 抽象範本（2-3 週）

| # | 任務 | 依賴 | 估時 | 優先度 |
|---|------|------|------|--------|
| 3.1 | 建立 REPOSITORY_ABSTRACTION_TEMPLATE.md | 1.1, 2.1 | 4h | 🔴 Critical |
| 3.2 | 為現有 User Module 重構 Repository | 3.1 | 6h | 🟠 High |
| 3.3 | 為 Post Module (已生成) 重構 Repository | 3.1 | 6h | 🟠 High |
| 3.4 | 為 Health Module 檢查/調整 Repository | 3.1 | 4h | 🟠 High |
| 3.5 | 驗證所有 Repository 不依賴具體 ORM | 3.2-3.4 | 4h | 🟡 Medium |
| 3.6 | 更新 QUICK_REFERENCE.md 中的 Repository 範例 | 3.2-3.4 | 2h | 🟡 Medium |

**Phase 3 總耗時**：26h ≈ **3-4 天**

---

### Phase 4: 適配器層重構（2-3 週）

| # | 任務 | 依賴 | 估時 | 優先度 |
|---|------|------|------|--------|
| 4.1 | 組織 `src/adapters/` 結構（ORM 按資料夾分） | 1.1 | 4h | 🔴 Critical |
| 4.2 | 建立 Atlas adapter README（如何實現新 ORM） | 4.1 | 4h | 🟠 High |
| 4.3 | 移動現有 Atlas 相關代碼到 adapters/Atlas/ | 4.1 | 8h | 🟠 High |
| 4.4 | 建立 `adapters/Drizzle/` 骨架（參考實現） | 4.1 | 12h | 🟡 Medium |
| 4.5 | 建立 Adapter Factory 模式 | 4.1 | 6h | 🟡 Medium |
| 4.6 | 驗證 Atlas adapter 仍正常工作 | 4.3 | 4h | 🔴 Critical |

**Phase 4 總耗時**：38h ≈ **5-6 天**

---

### Phase 5: 測試 & 驗收（2 週）

| # | 任務 | 依賴 | 估時 | 優先度 |
|---|------|------|------|--------|
| 5.1 | 建立「可替換性測試」案例 | 3.5, 4.6 | 6h | 🔴 Critical |
| 5.2 | 編寫 Drizzle adapter 實現（實驗） | 4.4 | 16h | 🟡 Medium |
| 5.3 | 測試 Drizzle adapter 實現 | 5.2 | 8h | 🟡 Medium |
| 5.4 | 文檔化「ORM 遷移指南」 | 5.2-5.3 | 6h | 🟡 Medium |
| 5.5 | 代碼審查 & 最終驗收 | 5.1-5.4 | 4h | 🟠 High |

**Phase 5 總耗時**：40h ≈ **5-6 天**

---

## 🎯 各 Phase 依賴關係圖

```
Phase 1 (規則定義)
    ↓
    ├→ Phase 2 (API 標記)
    │   ├→ Phase 3 (Repository 範本)
    │   │   ├→ Phase 4 (Adapter 重構)
    │   │   │   └→ Phase 5 (測試 & Drizzle 實驗)
    │   │   │
    │   │   └→ (並行) Phase 4
    │
    └→ Phase 4 (Adapter 重構)
        └→ Phase 5
```

---

## 📈 工作量估算

| Phase | 耗時 | 天數 | 團隊規模 |
|-------|------|------|---------|
| Phase 1 | 18h | 2-3 | 1 人 |
| Phase 2 | 19h | 2-3 | 1-2 人 |
| Phase 3 | 26h | 3-4 | 1-2 人 |
| Phase 4 | 38h | 5-6 | 2-3 人 |
| Phase 5 | 40h | 5-6 | 2 人 |
| **合計** | **141h** | **17-22 天** | 1-3 人 |

**快速路徑**（僅完成 Phase 1-3）：**7-10 天**，確保基本抽象化

---

## 🚨 風險評估

### 高風險 (Red 🔴)

| 風險 | 影響 | 對策 |
|------|------|------|
| 現有代碼已深度耦合 @gravito/atlas | 無法進行抽象化 | Phase 1.3 先檢查，決定重構範圍 |
| Drizzle adapter 實現失敗 | 無法驗證「可替換性」 | 提前在 Phase 4 建立測試環境 |
| TypeScript 檢查規則過嚴 | 開發速度下降 | 提供逃生口（特定目錄除外） |

### 中風險 (Yellow 🟡)

| 風險 | 影響 | 對策 |
|------|------|------|
| 團隊對抽象化理解不一致 | 代碼審查衝突多 | 完成 Phase 1.4 後進行團隊講座 |
| 遺漏某些 ORM 相依代碼 | 邊界仍有洩漏 | Phase 1.5 的 linter 檢查 |

### 低風險 (Green 🟢)

| 風險 | 影響 | 對策 |
|------|------|------|
| 文檔編寫較耗時 | 學習曲線長 | 優先完成 Phase 1，後續文檔並行 |

---

## 🎬 立即行動項

### 第一週（Phase 1 + Phase 2 開始）

```bash
# Day 1
# 1. 建立 ABSTRACTION_RULES.md
# 2. 更新 CLAUDE.md

# Day 2
# 3. 標記公開 API (@public/@internal)
# 4. 檢查現有違反規則的代碼

# Day 3
# 5. 設置 linter 檢查（可選）
# 6. Phase 2 開始：API 文檔化
```

### 檢查清單 ✅

- [ ] 確認團隊成員理解「可替換依賴」的願景
- [ ] 分配 Phase 1.1-1.4 的負責人
- [ ] 建立 PR 模板，強制檢查「是否依賴具體 ORM」
- [ ] 決定是否執行 Phase 5（Drizzle 實驗）

---

## 📝 決策點

| 決策 | 選項 A | 選項 B | 建議 |
|------|--------|--------|------|
| 完整度 | 完成全 5 Phase（22 天） | 僅 Phase 1-3（10 天） | 先做 1-3，視需求加 4-5 |
| Drizzle 實驗 | 立即進行（Phase 5） | 未來實施 | 建議 Phase 5 預留資源 |
| Linter 檢查 | 強制實施 | 文檔提醒 | 強制實施更安全 |
| 遷移舊代碼 | 一次性重構 | 漸進式遷移 | 視現有代碼量決定 |

---

## 🏁 成功標準

- [ ] 所有公開 API 有 `@public` 標記
- [ ] IDatabaseAccess 無須修改，即可替換 Atlas → 其他 ORM
- [ ] 所有 Domain/Application 層代碼不 import `@gravito/*`
- [ ] 至少 3 個 Module 完全按範本實現 Repository
- [ ] 成功實現 Drizzle adapter（即使僅部分）

---

## 📅 建議排期

| 週次 | Phase | 目標 | 狀態 |
|------|-------|------|------|
| Week 1 | Phase 1 + 2 start | 定義規則、標記 API | 🎬 立即開始 |
| Week 2 | Phase 2 end + 3 | Repository 範本 | 待 Week 1 完成 |
| Week 3 | Phase 3 + 4 start | 適配器重構 | 待 Week 2 完成 |
| Week 4 | Phase 4 end + 5 start | Drizzle 實驗 | 待 Week 3 完成 |

**預期完成時間**: 3-4 週（依團隊規模和代碼量調整）
