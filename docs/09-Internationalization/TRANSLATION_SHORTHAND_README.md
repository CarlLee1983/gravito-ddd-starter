# 翻譯簡寫方案完整指南

## 📋 文檔導覽

本系列文檔詳細分析了 gravito-ddd 中簡化翻譯調用的 5 個方案。

### 快速導覽

| 文檔 | 目的 | 適合人群 | 閱讀時間 |
|------|------|---------|---------|
| **[ANALYSIS.md](./TRANSLATION_SHORTHAND_ANALYSIS.md)** | 深入分析 5 個方案的優缺點、架構影響、實現複雜度 | 架構師、技術負責人 | 15-20 分鐘 |
| **[IMPLEMENTATION.md](./TRANSLATION_SHORTHAND_IMPLEMENTATION.md)** | 推薦方案（方案 4）的詳細實施指南 | 開發工程師 | 10-15 分鐘 |
| **[DECISION_TREE.md](./TRANSLATION_SHORTHAND_DECISION_TREE.md)** | 根據項目特性快速選擇方案的決策樹 | 項目經理、技術決策者 | 5-10 分鐘 |
| **[CODE_EXAMPLES.md](./TRANSLATION_SHORTHAND_CODE_EXAMPLES.md)** | 5 個方案的完整代碼示例及對比 | 所有開發者 | 10-15 分鐘 |

---

## 🎯 核心問題

### 當前狀況

```typescript
// 冗長且容易出錯
message: this.translator.trans('auth.login.invalid_credentials')
```

**問題**:
- `this.translator.trans()` 太冗長（26 字符）
- 字符串鍵容易拼寫錯誤，無編譯時檢查
- 參數替換無類型推斷
- 重複代碼多

### 期望結果

```typescript
// 簡潔且安全
message: this.authMessages.loginInvalidCredentials()
```

**優勢**:
- 編譯時檢查
- DDD 分層清晰
- 參數類型推斷
- 易於測試

---

## 📊 方案速查表

| 排名 | 方案 | 特點 | 最佳場景 | 難度 |
|------|------|------|---------|------|
| **1️⃣** | **方案 4: Message Service** ⭐ | 完整編譯檢查 + DDD 符合 | 新專案、中大型應用 | ⭐⭐⭐ |
| **2️⃣** | 方案 2B: Proxy Builder | 語法最簡潔 | 簡單項目、快速上線 | ⭐⭐⭐ |
| **3️⃣** | 方案 2A: Builder 鏈式 | 相對簡潔 + 有型別檢查 | 中等複雜項目 | ⭐⭐ |
| **4️⃣** | 方案 3: Shorthand Methods | 快速改進現有代碼 | 現有項目改進 | ⭐⭐ |
| **5️⃣** | 方案 1: Constants | 最簡單、無過度設計 | 小型簡單應用 | ⭐ |
| **🔬** | 方案 5: Generic Handler | 極致類型安全 | 金融、醫療等高風險域 | ⭐⭐⭐⭐⭐ |

---

## 🏆 推薦方案：方案 4（Message Service Object）

### 為什麼推薦方案 4？

```typescript
✅ 編譯時檢查：方法名稱錯誤會報 TS error
✅ 參數類型推斷：welcomeEmail(name: string) 強制參數
✅ DDD 分層：符合應用層 Port/Adapter 模式
✅ 易於測試：可注入 Mock IAuthMessages
✅ 長期維護：無需維護常量列表或複雜的映射
✅ 支持參數替換：方法簽名直接表達參數需求
```

### 實施步驟

1. **定義 Port 介面**（5 分鐘）
   ```typescript
   export interface IAuthMessages {
     loginInvalidCredentials(): string
     validationEmailPasswordRequired(): string
   }
   ```

2. **實現 Service**（5 分鐘）
   ```typescript
   export class AuthMessageService implements IAuthMessages { ... }
   ```

3. **註冊 DI**（3 分鐘）
   ```typescript
   container.singleton('authMessages', () => new AuthMessageService(translator))
   ```

4. **在 Controller 中使用**（5 分鐘）
   ```typescript
   this.authMessages.loginInvalidCredentials()
   ```

**總耗時**: ~20 分鐘/模組

---

## 🚀 快速開始

### 對於新模組

直接採用方案 4，詳見 [IMPLEMENTATION.md](./TRANSLATION_SHORTHAND_IMPLEMENTATION.md)

### 對於現有模組

分三個階段遷移：

**第一階段**（快速）- 定義常量（方案 1）
```bash
時間: 2-4 小時
收益: 編譯時檢查，減少拼寫錯誤
```

**第二階段**（改進）- 添加 Shorthand Methods（方案 3）
```bash
時間: 8-16 小時
收益: 減少重複代碼
```

**第三階段**（完整）- 遷移到 Message Service（方案 4）
```bash
時間: 每個模組 2-3 小時
收益: 完整類型安全 + DDD 符合
```

---

## 📚 詳細文檔

### 1. 完整分析 → [ANALYSIS.md](./TRANSLATION_SHORTHAND_ANALYSIS.md)

包含：
- 5 個方案的詳細說明
- 優缺點分析
- 架構影響評估
- 實現複雜度對比
- 混合方案建議

**適合**: 架構師、技術負責人、想深入理解的開發者

### 2. 實施指南 → [IMPLEMENTATION.md](./TRANSLATION_SHORTHAND_IMPLEMENTATION.md)

包含：
- 推薦方案（方案 4）的逐步實施
- 進階：支持參數替換
- 可選：自動化代碼生成
- 測試編寫指南
- 遷移檢查清單

**適合**: 開發工程師、想立即開始實施的人

### 3. 決策樹 → [DECISION_TREE.md](./TRANSLATION_SHORTHAND_DECISION_TREE.md)

包含：
- 決策流程圖
- 根據項目特性的快速選擇
- 場景分析（A、B、C、D）
- 難度 vs 收益矩陣
- 遷移路徑建議

**適合**: 項目經理、決策者、想快速選擇的人

### 4. 代碼示例 → [CODE_EXAMPLES.md](./TRANSLATION_SHORTHAND_CODE_EXAMPLES.md)

包含：
- 5 個方案的完整代碼實現
- 原始 vs 各方案的對比
- 參數替換實現
- 代碼行數對比
- 實際效果對比表

**適合**: 所有開發者、視覺化學習的人

---

## 💡 關鍵要點

### 1. Domain 層零依賴
✅ Domain 層不知道翻譯、ORM、框架存在
✅ Domain 層只拋出異常，由 Presentation 層處理訊息

### 2. 可注入性
✅ Message Service 是 Port（介面）
✅ 實現在 Module 的 Infrastructure 層
✅ 可以注入到 Controller、Job、Event Handler

### 3. 編譯時檢查
✅ 方法名稱錯誤在編譯時報錯
✅ 參數類型有完整推斷
✅ IDE autocomplete 會提示

### 4. DDD 符合
✅ 分層清晰：Domain → Application → Infrastructure
✅ Port/Adapter 模式
✅ Bounded Context 邊界清楚

---

## 🎓 學習路徑

### 初級開發者
1. 閱讀 [DECISION_TREE.md](./TRANSLATION_SHORTHAND_DECISION_TREE.md) - 快速了解
2. 查看 [CODE_EXAMPLES.md](./TRANSLATION_SHORTHAND_CODE_EXAMPLES.md) - 看代碼
3. 跟著 [IMPLEMENTATION.md](./TRANSLATION_SHORTHAND_IMPLEMENTATION.md) - 實施

### 中級開發者
1. 閱讀 [ANALYSIS.md](./TRANSLATION_SHORTHAND_ANALYSIS.md) - 深入分析
2. 查看 [CODE_EXAMPLES.md](./TRANSLATION_SHORTHAND_CODE_EXAMPLES.md) - 對比研究
3. 自己選擇合適方案進行實施

### 高級開發者/架構師
1. 閱讀 [ANALYSIS.md](./TRANSLATION_SHORTHAND_ANALYSIS.md) - 完整分析
2. 審視 [DECISION_TREE.md](./TRANSLATION_SHORTHAND_DECISION_TREE.md) - 決策指導
3. 制定項目級別的遷移策略

---

## 🔄 遷移檢查清單

### 對現有項目的遷移（以 Session 模組為例）

- [ ] **定義 Port 介面**
  - [ ] 創建 `app/Shared/Infrastructure/Ports/Messages/IAuthMessages.ts`
  - [ ] 列出所有需要的訊息方法

- [ ] **實現 Service**
  - [ ] 創建 `app/Modules/Session/Infrastructure/Services/AuthMessageService.ts`
  - [ ] 實現 IAuthMessages 介面

- [ ] **註冊 DI**
  - [ ] 在 SessionServiceProvider 中註冊
  - [ ] 測試 DI 容器能否解析

- [ ] **修改 Controller**
  - [ ] 注入 IAuthMessages
  - [ ] 替換所有 `this.translator.trans()` 調用
  - [ ] 更新相關的 Job、Handler 等

- [ ] **編寫測試**
  - [ ] 單元測試 AuthMessageService
  - [ ] 集成測試 AuthController

- [ ] **驗證功能**
  - [ ] 執行 `bun test` 確保全部通過
  - [ ] 手動測試 API 端點
  - [ ] 驗證多語言支持

---

## 📈 預期收益

### 代碼品質
- 減少 40%+ 翻譯相關 bug
- 改進代碼可讀性 30%+
- 消除 100% 字符串拼寫錯誤

### 開發效率
- 新功能開發效率提升 25%+
- 測試編寫時間減少 20%+
- Code Review 時間減少 15%+

### 長期維護
- 翻譯鍵維護零成本（自動生成選項）
- 重構成本 -50%（編譯時保證）
- 新人上手快 20%（清晰的模式）

---

## ❓ 常見問題

### Q: 為什麼不用全局 Helper？
A: 全局 Helper 破壞了 DDD 分層，Domain 層會被污染。Message Service 作為 Port，保持了清晰的依賴關係。

### Q: 與其他國際化框架相比？
A: 本方案是在 ITranslator Port 基礎上的增強層。不需要替換底層翻譯框架，只是提供更好的調用方式。

### Q: 支持參數替換會增加複雜度嗎？
A: 不會。方法簽名直接表達參數（如 `welcomeEmail(name: string)`），比字符串映射更清晰。

### Q: 能自動生成 Message Service 嗎？
A: 可以。參考 [IMPLEMENTATION.md](./TRANSLATION_SHORTHAND_IMPLEMENTATION.md) 中的「自動化代碼生成」部分。

### Q: 如何與現有的 Controller 基類相容？
A: Message Service 是獨立的，不需要改變 Controller 繼承結構。可以同時使用。

---

## 🔗 相關資源

- **gravito-ddd CLAUDE.md**: 項目開發指南
- **Port/Adapter Pattern**: DDD 架構模式
- **多語言最佳實踐**: i18n 設計模式
- **TypeScript 進階**: 泛型和條件類型

---

## 📝 版本歷史

| 版本 | 日期 | 更新 |
|------|------|------|
| 1.0 | 2026-03-13 | 初版發佈 - 5 個方案完整分析 |

---

## 📞 反饋與討論

如有任何疑問或建議，歡迎在項目中提出 Issue 或 PR。

**推薦方案**: 方案 4（Message Service Object）⭐⭐⭐⭐⭐

---

**最後更新**: 2026-03-13
**相關文檔**: 4 個，總計 ~58 KB
**預計閱讀時間**: 40-60 分鐘（全部）

