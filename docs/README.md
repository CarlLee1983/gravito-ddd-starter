# 📚 Gravito DDD Starter 文檔中心

歡迎來到 Gravito DDD Starter。本文檔區分**必需**和**可選**，幫助你快速上手。

---

## 🎯 選擇你的起點

### 👤 我是新手（15 分鐘快速開始）

**Tier 1 - 必需文檔**（⭐⭐⭐）

只需讀 **5 個文檔**，可以開始開發：

1. **[環境設置](./01-Getting-Started/SETUP.md)** (5 min)
   - 如何安裝和啟動

2. **[快速參考](./01-Getting-Started/QUICK_REFERENCE.md)** (5 min)
   - 最常用的指令

3. **[建立模組](./04-Module-Development/MODULE_GUIDE.md)** (15 min)
   - 如何從零開始建立業務功能

4. **[資料庫操作](./05-Database-ORM/DATABASE.md)** (10 min)
   - Migration、Seeder、查詢操作

5. **[質量檢查](./04-Module-Development/NEW_MODULE_CHECKLIST.md)** (5 min)
   - 完成模組後的驗證清單

✅ 讀完這 5 個，你就可以開始開發了！

---

### 🔨 我要開發功能（日常使用）

**常見任務快速查找**：

| 任務 | 文檔 | 時間 |
|------|------|------|
| 建立新模組 | [MODULE_GUIDE.md](./04-Module-Development/MODULE_GUIDE.md) | 15 min |
| 操作資料庫 | [DATABASE.md](./05-Database-ORM/DATABASE.md) | 10 min |
| 驗證模組質量 | [NEW_MODULE_CHECKLIST.md](./04-Module-Development/NEW_MODULE_CHECKLIST.md) | 5 min |
| 遇到問題 | [故障排除](./07-Production-Deployment/TROUBLESHOOTING.md) | ? |

---

### 📖 我想深入理解（可選）

**Tier 2 & 3 - 參考和深度文檔**（⭐⭐ / ⭐）

有時間時可深入學習：

- **[整體架構](./02-Architecture/ARCHITECTURE.md)** - 理解設計思想
- **[DDD 實施](./03-DDD-Design/DDD_IMPLEMENTATION_CHECKLIST.md)** - 深入 DDD 原則
- **[生產就緒](./07-Production-Deployment/PRODUCTION_READINESS_ROADMAP.md)** - 補充功能計畫
- **[完整文檔目錄](#-完整文檔導航)** - 按分類查閱

---

## 🚀 快速導航

### 🎯 **新手入門** (5 分鐘快速上手)
- **[快速參考](./01-Getting-Started/QUICK_REFERENCE.md)** - 最常用的指令和概念
- **[環境設置](./01-Getting-Started/SETUP.md)** - 第一次安裝

### 🏗️ **架構理解** (深入學習系統設計)
- **[整體架構](./02-Architecture/ARCHITECTURE.md)** - ⭐ 必讀：四層架構概覽
- **[架構決策](./02-Architecture/ARCHITECTURE_DECISIONS.md)** - 為什麼這樣設計
- **[抽象化規則](./02-Architecture/ABSTRACTION_RULES.md)** - 層級分離原則
- **[DI 架構](./02-Architecture/DEPENDENCY_INJECTION_ARCHITECTURE.md)** - 依賴注入系統
- **[進階模式](./02-Architecture/ARCHITECTURE_PATTERNS.md)** - CQRS、Event Sourcing、Saga

### 💎 **DDD 領域設計** (如何正確實施 DDD)
- **[DDD 實施檢查清單](./03-DDD-Design/DDD_IMPLEMENTATION_CHECKLIST.md)** - ⭐ 規劃到 Code Review
- **[ACL 防腐層](./03-DDD-Design/ACL_ANTI_CORRUPTION_LAYER.md)** - 跨模組解耦
- **[Repository 抽象](./03-DDD-Design/REPOSITORY_ABSTRACTION_TEMPLATE.md)** - 數據訪問模式

### 🔨 **模組開發** (建立新業務模組)
- **[模組開發指南](./04-Module-Development/MODULE_GUIDE.md)** - ⭐ 從零開始
- **[模組生成工具](./04-Module-Development/MODULE_GENERATION.md)** - 自動化生成
- **[新模組檢查清單](./04-Module-Development/NEW_MODULE_CHECKLIST.md)** - 確保質量
- **[模組整合](./04-Module-Development/MODULE_INTEGRATION.md)** - 多模組協作

### 🗄️ **數據庫 & ORM** (靈活切換數據庫)
- **[數據庫指南](./05-Database-ORM/DATABASE.md)** - ⭐ Migration、Seeder、查詢
- **[ORM 透明設計](./05-Database-ORM/ORM_TRANSPARENT_DESIGN.md)** - 為什麼無感知 ORM
- **[ORM 遷移指南](./05-Database-ORM/ORM_MIGRATION_GUIDE.md)** - Memory → Drizzle → Atlas
- **[Atlas 適配器](./05-Database-ORM/ATLAS_ADAPTER_GUIDE.md)** - Atlas ORM 完整指南
- **[Drizzle 路線圖](./05-Database-ORM/DRIZZLE_ADAPTER_ROADMAP.md)** - Drizzle ORM 實施

### 🔌 **適配器 & 接線** (框架整合層)
- **[適配器指南](./06-Adapters-Wiring/ADAPTER_INFRASTRUCTURE_GUIDE.md)** - 基礎設施適配
- **[接線指南](./06-Adapters-Wiring/WIRING_GUIDE.md)** - 依賴組裝邏輯
- **[適配器示例](./06-Adapters-Wiring/ADAPTER_INTEGRATION_EXAMPLES.md)** - 完整案例

### 🚀 **生產部署** (讓系統就緒)
- **[生產就緒路線圖](./07-Production-Deployment/PRODUCTION_READINESS_ROADMAP.md)** - ⭐ 補充功能計畫
- **[部署指南](./07-Production-Deployment/DEPLOYMENT.md)** - 上線檢查清單
- **[故障排除](./07-Production-Deployment/TROUBLESHOOTING.md)** - 常見問題解決

### ✅ **測試 & API** (品質保證)
- **[測試指南](./08-Testing-API/TESTING.md)** - 單元、整合、E2E 測試
- **[API 設計規範](./08-Testing-API/API_GUIDELINES.md)** - RESTful 最佳實踐
- **[OpenAPI 文檔](./08-Testing-API/OPENAPI.md)** - API 文檔自動生成

### 📖 **根目錄檔案**
- **[Bootstrap 參考](./BOOTSTRAP_REFERENCE.md)** - 應用啟動流程
- **[模組添加檢查清單](./MODULE_ADD_CHECKLIST.md)** - 添加新模組步驟

---

## 📊 文檔分類結構

```
docs/
├── README.md (你在這裡)
│
├── 01-Getting-Started/          # 🎯 快速上手
│   ├── QUICK_REFERENCE.md       # ⭐ 最常用的指令和概念
│   └── SETUP.md                 # 環境設置
│
├── 02-Architecture/             # 🏗️ 架構設計
│   ├── ARCHITECTURE.md          # ⭐ 四層架構核心
│   ├── ARCHITECTURE_PATTERNS.md # 進階模式 (CQRS, Event Sourcing)
│   ├── ARCHITECTURE_DECISIONS.md
│   ├── ABSTRACTION_RULES.md
│   ├── DEPENDENCY_INJECTION_ARCHITECTURE.md
│   └── SCALABLE_ORM_ARCHITECTURE.md
│
├── 03-DDD-Design/               # 💎 DDD 實施
│   ├── DDD_IMPLEMENTATION_CHECKLIST.md # ⭐ 規劃到 Code Review
│   ├── ACL_ANTI_CORRUPTION_LAYER.md
│   └── REPOSITORY_ABSTRACTION_TEMPLATE.md
│
├── 04-Module-Development/       # 🔨 模組開發
│   ├── MODULE_GUIDE.md          # ⭐ 從零開始
│   ├── MODULE_GENERATION.md
│   ├── NEW_MODULE_CHECKLIST.md
│   └── MODULE_INTEGRATION.md
│
├── 05-Database-ORM/             # 🗄️ 數據庫
│   ├── DATABASE.md              # ⭐ 遷移、查詢、播種
│   ├── ORM_TRANSPARENT_DESIGN.md
│   ├── ORM_MIGRATION_GUIDE.md
│   ├── ATLAS_ADAPTER_GUIDE.md
│   ├── DRIZZLE_ADAPTER_ROADMAP.md
│   └── ORM_SWAPPING_EXAMPLES.md
│
├── 06-Adapters-Wiring/          # 🔌 適配器層
│   ├── ADAPTER_INFRASTRUCTURE_GUIDE.md
│   ├── WIRING_GUIDE.md
│   └── ADAPTER_INTEGRATION_EXAMPLES.md
│
├── 07-Production-Deployment/    # 🚀 生產部署
│   ├── PRODUCTION_READINESS_ROADMAP.md  # ⭐ 功能補充計畫
│   ├── DEPLOYMENT.md
│   └── TROUBLESHOOTING.md
│
├── 08-Testing-API/              # ✅ 測試品質
│   ├── TESTING.md
│   ├── API_GUIDELINES.md
│   └── OPENAPI.md
│
├── BOOTSTRAP_REFERENCE.md       # 應用啟動流程
├── MODULE_ADD_CHECKLIST.md      # 添加新模組
│
└── _Archive/                    # 📦 舊文檔
    ├── IMPLEMENTATION_PLAN.md
    ├── SOLUTION_SUMMARY.md
    └── SESSION_SUMMARY.md
```

---

## 🎓 推薦閱讀順序

### 第 1 天：理解框架
1. [快速參考](./01-Getting-Started/QUICK_REFERENCE.md) (5 min)
2. [整體架構](./02-Architecture/ARCHITECTURE.md) (20 min)
3. [環境設置](./01-Getting-Started/SETUP.md) (10 min)

### 第 2 天：建立第一個模組
1. [模組開發指南](./04-Module-Development/MODULE_GUIDE.md) (30 min)
2. [DDD 實施檢查清單](./03-DDD-Design/DDD_IMPLEMENTATION_CHECKLIST.md) (30 min)
3. 建立簡單模組 (1-2 小時)

### 第 3 天：理解進階概念
1. [ACL 防腐層](./03-DDD-Design/ACL_ANTI_CORRUPTION_LAYER.md) (20 min)
2. [數據庫指南](./05-Database-ORM/DATABASE.md) (20 min)
3. [ORM 遷移指南](./05-Database-ORM/ORM_MIGRATION_GUIDE.md) (20 min)

### 後續：深度學習
- [進階模式](./02-Architecture/ARCHITECTURE_PATTERNS.md) - CQRS、Event Sourcing
- [生產就緒路線圖](./07-Production-Deployment/PRODUCTION_READINESS_ROADMAP.md) - 補充功能
- [測試指南](./08-Testing-API/TESTING.md) - 確保質量

---

## 🔍 按功能快速查找

### 我想...

**建立新功能**
→ [模組開發指南](./04-Module-Development/MODULE_GUIDE.md)
→ [DDD 實施檢查清單](./03-DDD-Design/DDD_IMPLEMENTATION_CHECKLIST.md)

**切換 ORM (Memory → Drizzle → Atlas)**
→ [ORM 遷移指南](./05-Database-ORM/ORM_MIGRATION_GUIDE.md)
→ [ORM 透明設計](./05-Database-ORM/ORM_TRANSPARENT_DESIGN.md)

**解耦多個模組**
→ [ACL 防腐層](./03-DDD-Design/ACL_ANTI_CORRUPTION_LAYER.md)
→ [Module 整合](./04-Module-Development/MODULE_INTEGRATION.md)

**實施認證/授權**
→ [生產就緒路線圖](./07-Production-Deployment/PRODUCTION_READINESS_ROADMAP.md) (Phase 1)

**部署到生產**
→ [部署指南](./07-Production-Deployment/DEPLOYMENT.md)
→ [故障排除](./07-Production-Deployment/TROUBLESHOOTING.md)

**寫測試**
→ [測試指南](./08-Testing-API/TESTING.md)

**找常用指令**
→ [快速參考](./01-Getting-Started/QUICK_REFERENCE.md)

---

## 📈 文檔質量指標

| 分類 | 文檔數 | 完整度 | 推薦度 |
|------|-------|--------|--------|
| Getting Started | 2 | ✅ 100% | ⭐⭐⭐ |
| Architecture | 6 | ✅ 95% | ⭐⭐⭐ |
| DDD Design | 3 | ✅ 100% | ⭐⭐⭐ |
| Module Dev | 6 | ✅ 90% | ⭐⭐⭐ |
| Database/ORM | 7 | ✅ 100% | ⭐⭐⭐ |
| Adapters/Wiring | 6 | ✅ 85% | ⭐⭐ |
| Production | 3 | ✅ 100% | ⭐⭐⭐ |
| Testing/API | 3 | ✅ 85% | ⭐⭐⭐ |
| **整體** | **41** | **95%** | **⭐⭐⭐** |

---

## 💡 文檔更新日誌

### 最新版本 (2026-03-11)

✅ **新增**:
- `PRODUCTION_READINESS_ROADMAP.md` - 生產級功能補充計畫
- `DDD_IMPLEMENTATION_CHECKLIST.md` - DDD 實施檢查清單

✅ **重構**:
- 文檔目錄整理（41 個文檔分類到 8 個目錄）
- 新增 `README.md` 作為導航入口
- 每個目錄新增 `README.md` 作為分類說明

### 下一步計畫

- [ ] 補充認證/授權實施案例
- [ ] 補充檔案管理系統指南
- [ ] 補充隊列系統指南
- [ ] 補充郵件/通知指南
- [ ] 添加更多代碼示例

---

## 🤝 貢獻文檔

如果你想添加或改進文檔：

1. 在合適的分類目錄中建立 `.md` 檔案
2. 遵循文檔模板（標題 → 概述 → 範例 → 檢查清單）
3. 更新對應分類目錄的 `README.md`
4. 如果是重要文檔，更新本頁的導航

---

## 📞 聯繫與支持

遇到問題？

1. 先查看 [故障排除](./07-Production-Deployment/TROUBLESHOOTING.md)
2. 檢查對應功能的文檔
3. 查看 [DDD 實施檢查清單](./03-DDD-Design/DDD_IMPLEMENTATION_CHECKLIST.md) 的常見錯誤

---

**最後更新**: 2026-03-11 | **文檔版本**: 1.0 | **Gravito Version**: 2.0+
