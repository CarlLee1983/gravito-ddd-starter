# 09 - 國際化與訊息管理 (i18n)

完整的多語系國際化系統，包含 i18n 基礎、訊息簡寫優化、Email 訊息設計。

---

## 📚 文檔導航

### 基礎使用

| 文檔 | 描述 | 閱讀時間 | 對象 |
|------|------|---------|------|
| **[I18N_GUIDE.md](./I18N_GUIDE.md)** | i18n 系統完整指南 | 15 min | 所有開發者 |
| **[I18N_EXAMPLE.md](./I18N_EXAMPLE.md)** | 實踐範例與最佳實踐 | 20 min | 新手開發者 |

### 訊息簡寫優化（推薦）

| 文檔 | 描述 | 對象 |
|------|------|------|
| **[TRANSLATION_SHORTHAND_README.md](./TRANSLATION_SHORTHAND_README.md)** | 快速開始 | ⭐ 必讀 |
| **[TRANSLATION_SHORTHAND_IMPLEMENTATION.md](./TRANSLATION_SHORTHAND_IMPLEMENTATION.md)** | 實施步驟 | 開發者 |
| **[TRANSLATION_OPUS_SOLUTION.md](./TRANSLATION_OPUS_SOLUTION.md)** | 架構分析與決策 | 架構師 |
| **[TRANSLATION_SHORTHAND_BEFORE_AFTER.md](./TRANSLATION_SHORTHAND_BEFORE_AFTER.md)** | 改善對比 | 評估者 |
| **[TRANSLATION_SHORTHAND_CODE_EXAMPLES.md](./TRANSLATION_SHORTHAND_CODE_EXAMPLES.md)** | 代碼示例 | 開發者 |
| **[TRANSLATION_SHORTHAND_ANALYSIS.md](./TRANSLATION_SHORTHAND_ANALYSIS.md)** | 6 方案完整評估 | 架構師 |
| **[TRANSLATION_SHORTHAND_DECISION_TREE.md](./TRANSLATION_SHORTHAND_DECISION_TREE.md)** | 決策樹 | 決策者 |

### Email 訊息設計

| 文檔 | 描述 | 對象 |
|------|------|------|
| **[EMAIL_MESSAGE_DESIGN_INDEX.md](./EMAIL_MESSAGE_DESIGN_INDEX.md)** | 快速導航 | ⭐ 開始讀這個 |
| **[DESIGN_EMAIL_MESSAGE_STRATEGY.md](./DESIGN_EMAIL_MESSAGE_STRATEGY.md)** | 完整策略分析 | 架構師 |
| **[EMAIL_MESSAGE_IMPLEMENTATION_GUIDE.md](./EMAIL_MESSAGE_IMPLEMENTATION_GUIDE.md)** | 實施指南 | 開發者 |
| **[EMAIL_MESSAGE_COMPARISON_MATRIX.md](./EMAIL_MESSAGE_COMPARISON_MATRIX.md)** | 方案對比 | 決策者 |

---

## 🎯 快速開始

### 5 分鐘快速瞭解

1. **i18n 基礎** → 讀 [I18N_GUIDE.md](./I18N_GUIDE.md) 前 30 行
2. **訊息簡寫** → 讀 [TRANSLATION_SHORTHAND_README.md](./TRANSLATION_SHORTHAND_README.md)
3. **Email 訊息** → 讀 [EMAIL_MESSAGE_DESIGN_INDEX.md](./EMAIL_MESSAGE_DESIGN_INDEX.md)

### 30 分鐘深入理解

1. **i18n 完整指南** → [I18N_GUIDE.md](./I18N_GUIDE.md) (15 min)
2. **訊息簡寫實施** → [TRANSLATION_SHORTHAND_IMPLEMENTATION.md](./TRANSLATION_SHORTHAND_IMPLEMENTATION.md) (15 min)

### 開發新功能

1. 查看是否有現成的 Message Service
2. 如果沒有，參考 [TRANSLATION_SHORTHAND_IMPLEMENTATION.md](./TRANSLATION_SHORTHAND_IMPLEMENTATION.md) Step-by-Step 實施
3. Email 訊息參考 [EMAIL_MESSAGE_IMPLEMENTATION_GUIDE.md](./EMAIL_MESSAGE_IMPLEMENTATION_GUIDE.md)

---

## 🏆 推薦方案

### API 回應訊息（Controller）

**使用: Message Service Object (方案 4)**

```typescript
// ✅ 簡潔 + 編譯檢查
message: this.authMessages.loginInvalidCredentials()
```

↔️ 不用

```typescript
// ❌ 冗長 + 無編譯檢查
message: this.translator.trans('auth.login.invalid_credentials')
```

📖 詳見: [TRANSLATION_SHORTHAND_IMPLEMENTATION.md](./TRANSLATION_SHORTHAND_IMPLEMENTATION.md)

### Email 訊息

**短期（現在）**: 直接使用 ITranslator
```typescript
const title = this.translator.trans('email.welcome.title')
```

**長期（複雜時）**: 創建 Email Message Service
```typescript
const title = this.emailMessages.title()
```

📖 詳見: [EMAIL_MESSAGE_IMPLEMENTATION_GUIDE.md](./EMAIL_MESSAGE_IMPLEMENTATION_GUIDE.md)

---

## 📊 核心要點

### i18n Port & Adapter

```
Domain 層 → 無 i18n（零依賴）✅
Application 層 → 無 ITranslator（只用 Port）✅
Presentation 層 → 使用 IAuthMessages Port ✅
Infrastructure 層 → AuthMessageService 實現 ✅
```

### 翻譯檔案結構

```
locales/
├── en/
│   ├── auth.json          # API 訊息
│   ├── email.json         # Email 訊息
│   └── common.json        # 通用訊息
└── zh-TW/
    ├── auth.json
    ├── email.json
    └── common.json
```

### 訊息 Service 命名規則

```typescript
// API 回應訊息
IAuthMessages / AuthMessageService
IUserMessages / UserMessageService

// Email 訊息（長期使用）
IWelcomeEmailMessages / WelcomeEmailMessageService
IPasswordResetEmailMessages / PasswordResetEmailMessageService

// 內部訊息（複雜邏輯時）
IValidationMessages / ValidationMessageService
```

---

## 🔗 跨章節連結

- **DDD 設計** → [03-DDD-Design](../03-DDD-Design/)
- **Port/Adapter** → [06-Adapters-Wiring](../06-Adapters-Wiring/)
- **模組開發** → [04-Module-Development](../04-Module-Development/)

---

## 📈 實施進度

- [x] i18n 基礎系統（ITranslator Port + 翻譯檔案加載）
- [x] Session Module - AuthMessageService（方案 4 實施）
- [x] 訊息簡寫優化方案分析（6 方案 + Opus 評估）
- [x] Email 訊息策略設計（5 方案 + 推薦）
- [ ] 其他 Module 推廣（User, Post, Product 等）
- [ ] Email Message Service 實施（當需要時）
- [ ] 團隊訓練與文檔更新

---

## 🎓 學習路徑

### 初級開發者
1. [I18N_GUIDE.md](./I18N_GUIDE.md) - 學習基礎
2. [I18N_EXAMPLE.md](./I18N_EXAMPLE.md) - 查看範例
3. 開發新的訊息翻譯

### 中級開發者
1. [TRANSLATION_SHORTHAND_IMPLEMENTATION.md](./TRANSLATION_SHORTHAND_IMPLEMENTATION.md) - 實施 Message Service
2. [TRANSLATION_SHORTHAND_BEFORE_AFTER.md](./TRANSLATION_SHORTHAND_BEFORE_AFTER.md) - 了解改善
3. 為新 Module 創建 Message Service

### 高級開發者/架構師
1. [TRANSLATION_OPUS_SOLUTION.md](./TRANSLATION_OPUS_SOLUTION.md) - 架構決策
2. [TRANSLATION_SHORTHAND_ANALYSIS.md](./TRANSLATION_SHORTHAND_ANALYSIS.md) - 方案評估
3. [DESIGN_EMAIL_MESSAGE_STRATEGY.md](./DESIGN_EMAIL_MESSAGE_STRATEGY.md) - Email 策略
4. 指導團隊，制定標準

---

## ❓ 常見問題

### Q: 現在就要實施 Message Service 嗎？
**A**: 不用。可以先用 ITranslator，當代碼增多時再逐步遷移。

### Q: Email 訊息怎麼用？
**A**: 現在：直接用 ITranslator。當 Email 變複雜時：創建 IEmailMessages Service。

### Q: 已有 AuthMessageService，其他 Module 也要建？
**A**: 是的。每個 Module 建立專用的 Message Service（AuthMessageService、UserMessageService 等）。

### Q: 能用全局 helper 簡化語法嗎？
**A**: 不行。為保持 DDD 零依賴，必須透過依賴注入。使用 Message Service Pattern 是最優選擇。

### Q: 支援多少語言？
**A**: 目前：en、zh-TW。可輕鬆添加新語言（只需新增 locales/{lang}/ 目錄）。

---

## 📝 版本歷史

| 日期 | 版本 | 改動 |
|------|------|------|
| 2026-03-13 | 1.0 | 初始版本：i18n 基礎 + 訊息簡寫優化 + Email 策略 |

---

**最後更新**: 2026-03-13 | **貢獻者**: AI | **狀態**: 完成 ✅
