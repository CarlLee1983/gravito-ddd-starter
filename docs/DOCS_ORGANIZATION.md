# 📚 文檔組織結構 (2026-03-13)

## 概述

gravito-ddd 文檔體系已重新組織，共 10 個章節，53 個文檔，全面覆蓋從入門到生產部署的完整開發生命周期。

---

## 📖 完整目錄結構

```
docs/
├── 01-Getting-Started/          # 環境配置與入門指南
│   ├── HANDBOOK.md              # 環境安裝與設置詳解
│   └── README.md                # 快速開始
│
├── 02-Architecture/             # 核心架構設計
│   ├── README.md                # 架構概覽
│   ├── CORE_DESIGN.md           # PlanetCore 容器、DI 系統
│   ├── EVENT_SYSTEM.md          # 事件驅動架構
│   └── BOUNDARY_RULES.md        # 邊界保護規則
│
├── 03-DDD-Design/               # 領域驅動設計實踐
│   ├── README.md                # DDD 概覽
│   ├── DOMAIN_DESIGN_GUIDE.md  # 聚合根、值物件、Repository
│   ├── LAYERED_ARCHITECTURE_RULES.md  # 分層原則
│   ├── NAMING_CONVENTION.md     # 命名規約
│   ├── DDD_CHECKLIST.md         # 設計檢查清單
│   ├── COMMON_PITFALLS.md       # 常見陷阱
│   └── TESTING_STRATEGY.md      # 測試策略
│
├── 04-Module-Development/       # 模組開發工作流
│   ├── README.md                # 模組開發概覽
│   └── DEVELOPMENT_GUIDE.md     # 模組生成與開發指南
│
├── 05-Database-ORM/             # 資料庫與 ORM 無關設計
│   ├── README.md                # 資料庫概覽
│   ├── ORM_GUIDE.md             # ORM 選擇與整合
│   ├── ORM_TRANSPARENT_DESIGN.md # ORM 無關架構
│   ├── ORM_SWAPPING_EXAMPLES.md # ORM 遷移案例
│   └── DATABASE_CONVENTIONS.md  # 資料庫命名規約
│
├── 05-Frontend-Integration/     # 前端集成與頁面路由 ✨ NEW
│   ├── README.md                # 前端集成概覽
│   ├── PAGES_ROUTING_IMPLEMENTATION.md # 頁面路由實現
│   ├── MIDDLEWARE_GUIDE.md      # 中間件開發指南
│   ├── TOKEN_MANAGEMENT.md      # JWT Token 管理
│   ├── TOKEN_AUTO_REFRESH.md    # Token 自動刷新
│   ├── CSRF_RETRY_FORM_PROTECTION.md # CSRF 與表單保護
│   └── UX_ENHANCEMENT_HOOKS.md  # UX 增強 Hooks
│
├── 06-Adapters-Wiring/          # 適配器與接線系統
│   ├── README.md                # 適配器系統概覽
│   ├── WIRING_SYSTEM.md         # 接線系統詳解
│   ├── ADAPTER_GUIDE.md         # 適配器開發指南
│   ├── ADAPTER_INTEGRATION_EXAMPLES.md  # 適配器整合案例
│   ├── WIRING_QUICK_REFERENCE.md # 快速參考
│   ├── SMART_FACTORY_OPTIMIZATION.md # 工廠優化
│   └── REDIS_PORT_CONFIGURATION.md # Redis Port 配置
│
├── 07-Production-Deployment/    # 生產部署與運維
│   ├── README.md                # 部署概覽
│   ├── DEPLOYMENT.md            # 部署指南
│   └── TROUBLESHOOTING.md       # 故障排除手冊
│
├── 08-Testing-API/              # 測試與 API 規範
│   ├── README.md                # 測試概覽
│   └── TESTING_API_GUIDE.md     # API 測試指南
│
├── 09-Internationalization/     # 國際化與訊息管理
 ✨ NEW
│   ├── README.md                # i18n 概覽 & 快速導航
│   │
│   ├── I18N_GUIDE.md            # i18n 系統完整指南
│   ├── I18N_EXAMPLE.md          # i18n 實踐範例
│   │
│   ├── TRANSLATION_SHORTHAND_README.md  # 訊息簡寫快速開始
│   ├── TRANSLATION_SHORTHAND_IMPLEMENTATION.md  # 實施步驟
│   ├── TRANSLATION_OPUS_SOLUTION.md     # Opus 架構分析
│   ├── TRANSLATION_SHORTHAND_BEFORE_AFTER.md  # 改善對比
│   ├── TRANSLATION_SHORTHAND_CODE_EXAMPLES.md  # 代碼示例
│   ├── TRANSLATION_SHORTHAND_ANALYSIS.md       # 6 方案評估
│   └── TRANSLATION_SHORTHAND_DECISION_TREE.md  # 決策樹
│   │
│   ├── EMAIL_MESSAGE_DESIGN_INDEX.md    # Email 訊息快速導航
│   ├── DESIGN_EMAIL_MESSAGE_STRATEGY.md # Email 完整策略
│   ├── EMAIL_MESSAGE_IMPLEMENTATION_GUIDE.md  # Email 實施指南
│   └── EMAIL_MESSAGE_COMPARISON_MATRIX.md     # Email 方案對比
│
├── 10-Project-Reuse/             # 專案再利用與模板化
│   └── REUSE_GUIDE.md            # 深度架構分析 + 再利用指南
│
├── README.md                    # 文檔中心首頁
├── CHANGELOG.md                 # 版本變更記錄
└── DOCS_ORGANIZATION.md         # 本文件（文檔組織說明）
```

---

## 🎯 章節說明

### 01 - Getting Started
**目的**: 快速搭建開發環境
- 環境需求檢查
- Docker 容器配置
- 資料庫初始化
- 首次啟動

### 02 - Architecture
**目的**: 理解核心系統設計
- PlanetCore 容器
- 依賴注入 (DI) 機制
- 事件驅動系統
- 邊界保護規則

### 03 - DDD Design
**目的**: DDD 實踐與模式
- 聚合根、值物件
- Repository 模式
- 領域事件
- 分層架構
- 命名規約
- 常見陷阱

### 04 - Module Development
**目的**: 模組開發工作流
- 模組自動生成
- 模組結構規範
- Service Provider 註冊
- 路由接線

### 05 - Database ORM
**目的**: ORM 無關的資料庫設計
- ORM 選擇與切換
- Repository 實現
- 遷移策略
- 資料庫命名規約

### 06 - Adapters Wiring
**目的**: 基礎設施適配與接線
- Adapter 開發
- Service Provider 接線
- 外部服務整合
- Redis、S3 等配置

### 07 - Production Deployment
**目的**: 生產環境部署與運維
- 部署策略
- 健康檢查
- 監控告警
- 故障排除

### 08 - Testing API
**目的**: 測試與 API 規範
- 單元測試
- 集成測試
- API 測試
- OpenAPI 文檔

### 09 - Internationalization ✨ NEW
**目的**: 多語系國際化與訊息管理
- i18n 基礎系統
- Message Service Pattern（方案 4）
- Email 訊息設計
- 最佳實踐

### 10 - Project Reuse ✨ NEW
**目的**: 將本專案作為 DDD starter 複用到其他專案
- 深度架構分析
- 模組化再利用流程
- 新專案啟動與清理步驟

---

## 📊 文檔統計

| 章節 | 文檔數 | 主題 |
|------|--------|------|
| 01 | 2 | 環境配置 |
| 02 | 4 | 核心架構 |
| 03 | 7 | DDD 實踐 |
| 04 | 2 | 模組開發 |
| 05 | 5 | ORM 設計 |
| 05b | 7 | 前端集成 ✨ |
| 06 | 7 | 適配器系統 |
| 07 | 3 | 生產部署 |
| 08 | 2 | 測試規範 |
| 09 | 13 | 國際化系統 ✨ |
| 10 | 1 | 專案再利用 ✨ |
| **總計** | **53** | - |

---

## 🚀 快速導航

### 👨‍💻 我是新開發者
1. 讀 [01-Getting-Started/HANDBOOK.md](./01-Getting-Started/HANDBOOK.md)
2. 讀 [02-Architecture/CORE_DESIGN.md](./02-Architecture/CORE_DESIGN.md)
3. 讀 [03-DDD-Design/DDD_CHECKLIST.md](./03-DDD-Design/DDD_CHECKLIST.md)
4. 開始開發！

### 🏗️ 我要設計新模組
1. 讀 [04-Module-Development/DEVELOPMENT_GUIDE.md](./04-Module-Development/DEVELOPMENT_GUIDE.md)
2. 讀 [03-DDD-Design/DOMAIN_DESIGN_GUIDE.md](./03-DDD-Design/DOMAIN_DESIGN_GUIDE.md)
3. 參考 [03-DDD-Design/DDD_CHECKLIST.md](./03-DDD-Design/DDD_CHECKLIST.md)
4. 開始實施！

### 🌍 我要實施多語系功能
1. 讀 [09-Internationalization/README.md](./09-Internationalization/README.md) (快速導航)
2. 讀 [09-Internationalization/TRANSLATION_SHORTHAND_IMPLEMENTATION.md](./09-Internationalization/TRANSLATION_SHORTHAND_IMPLEMENTATION.md)
3. 查看 [09-Internationalization/I18N_EXAMPLE.md](./09-Internationalization/I18N_EXAMPLE.md) (實踐範例)
4. 開始實施！

### 📧 我要設計 Email 訊息
1. 讀 [09-Internationalization/EMAIL_MESSAGE_DESIGN_INDEX.md](./09-Internationalization/EMAIL_MESSAGE_DESIGN_INDEX.md)
2. 參考 [09-Internationalization/EMAIL_MESSAGE_IMPLEMENTATION_GUIDE.md](./09-Internationalization/EMAIL_MESSAGE_IMPLEMENTATION_GUIDE.md)
3. 開始實施！

### 🚀 我要部署到生產環境
1. 讀 [07-Production-Deployment/DEPLOYMENT.md](./07-Production-Deployment/DEPLOYMENT.md)
2. 參考 [07-Production-Deployment/TROUBLESHOOTING.md](./07-Production-Deployment/TROUBLESHOOTING.md)
3. 開始部署！

---

## 📝 文檔維護規則

### 新增文檔
1. 確定所屬章節（01-09）
2. 命名規範：`TOPIC_DETAIL.md` (如：`ORM_TRANSPARENT_DESIGN.md`)
3. 添加到該章節的 `README.md` 中
4. 更新根目錄 `README.md` 的導航

### 更新文檔
1. 修改相應的 `*.md` 文件
2. 更新 `CHANGELOG.md` 記錄更改
3. 如有架構影響，更新 `CLAUDE.md`

### 檔案命名規約
```
TOPIC.md                    # 主要文檔（如 ORM_GUIDE.md）
TOPIC_SUBTOPIC.md          # 詳細文檔（如 ORM_TRANSPARENT_DESIGN.md）
README.md                   # 章節索引
```

---

## 🔗 跨文檔連結

文檔間使用相對路徑連結：

```markdown
# 同章節
[Repository 模式](./DOMAIN_DESIGN_GUIDE.md)

# 不同章節
[Port/Adapter 設計](../06-Adapters-Wiring/ADAPTER_GUIDE.md)

# 根目錄
[CLAUDE.md](../CLAUDE.md)
```

---

## 📈 最近更新

### 2026-03-13 ✨
- **新增**：09-Internationalization 章節（13 個文檔）
- **新增**：i18n 完整系統 + Message Service Pattern
- **新增**：Email 訊息設計指南（5 方案分析）
- **優化**：文檔結構整理與導航優化

### 2026-03-13
- **更新**：CLAUDE.md 添加 i18n 最佳實踐
- **更新**：主 README.md 添加章節 09 導航

---

## 📚 使用統計

| 用途 | 文檔類型 | 數量 |
|------|---------|------|
| 入門指南 | Getting Started | 2 |
| 架構設計 | Architecture + DDD | 11 |
| 開發指南 | Module + ORM | 7 |
| 基礎設施 | Adapters | 7 |
| 運維部署 | Deployment + Testing | 5 |
| 國際化 | i18n + Email | 13 |
| **總計** | - | **48** |

---

## ✅ 檢查清單

文檔新增時請確認：

- [ ] 檔案名稱符合規約 (`TOPIC_SUBTOPIC.md`)
- [ ] 內容結構清晰（標題層級、段落分離）
- [ ] 包含代碼示例（如適用）
- [ ] 添加到所屬章節的 `README.md`
- [ ] 更新根目錄 `README.md` 導航
- [ ] 更新 `CHANGELOG.md`
- [ ] 檢查所有內部連結有效
- [ ] 拼寫檢查（繁體中文）

---

**文檔組織負責人**: AI
**最後更新**: 2026-03-13
**狀態**: ✅ 完成
**版本**: 1.0
