# 更新日誌 (Changelog)

所有項目的重要變更都記錄在此。遵循 [Semantic Versioning](https://semver.org/lang/zh_CN/) 規範。

## [1.1.0] - 2024-03-10

### 🎯 重點

完整的開發者體驗（DX）改進方案，提升整體評分到 8.8/10。

### ✨ 新增功能

#### 開發工具
- **`bun run verify`** - 完整檢查（typecheck + lint + test + coverage）
- **`bun run setup`** - 自動化初始設置流程（install + hooks + verify）
- **`bun run troubleshoot`** - 環境診斷和故障排查工具

#### 文檔
- **QUICK_REFERENCE.md** - 常用命令和工作流程速查表
  - 📋 常用指令速查表
  - 📊 工作流程檢查清單
  - 🔥 常見任務快速指南
  - 🚨 快速故障排查
  - 📖 重要文檔連結

#### 診斷工具
- **scripts/troubleshoot.sh** - 完整的環境診斷腳本
  - Runtime 環境檢查
  - 項目依賴驗證
  - 數據庫連接測試
  - Redis/Cache 配置檢查
  - TypeScript 編譯驗證
  - 埠可用性檢查

### 📝 改進

- **README.md**
  - 新增「快速參考」連結（頁面頂部）
  - 重新組織文檔結構
  - 改進導航清晰度
  - 新增 Setup & Maintenance scripts 表格

- **package.json**
  - 新增 `verify`、`setup`、`troubleshoot` 指令
  - 保持向後兼容性

- **DX_AUDIT.md**
  - 記錄改進進度
  - 更新評分統計

### 📊 DX 評分改進

| 維度 | 舊分 | 新分 | 改進 |
|------|------|------|------|
| 初始體驗 | 8/10 | 8.5/10 | ⬆️ +0.5 |
| 文檔完整性 | 9/10 | 9.5/10 | ⬆️ +0.5 |
| 開發工具 | 8/10 | 9/10 | ⬆️ +1.0 |
| 故障排查 | 7/10 | 9/10 | ⬆️ +2.0 |
| **整體 DX** | **8.2/10** | **8.8/10** | **⬆️ +0.6** |

### 🔄 相容性

- ✅ 完全向後相容（BC）
- ✅ 無 breaking changes
- ✅ 所有現有功能保持不變

### 📚 文檔更新

- 新增 [QUICK_REFERENCE.md](./docs/QUICK_REFERENCE.md)
- 更新 [README.md](./README.md)
- 更新 [DX_AUDIT.md](./DX_AUDIT.md)

### 🚀 升級指南

無需任何升級步驟，只需更新到最新版本：

```bash
git pull origin master
bun install
bun run setup  # 可選：運行新的設置指令
```

---

## [1.0.0] - 2024-02-28

### 🎯 首次發佈

Gravito DDD Starter 的首個正式版本。

### ✨ 核心功能

- ✅ 標準 DDD 四層架構（Domain/Application/Infrastructure/Presentation）
- ✅ 依賴注入和 IoC 容器（@gravito/core）
- ✅ Reference User 模組範例
- ✅ 完整測試框架（Unit/Integration/Feature）
- ✅ 熱重載開發環境
- ✅ TypeScript 類型安全
- ✅ 自動化模組生成（@gravito/pulse）
- ✅ 完整的 Git Hooks 設置

### 📚 文檔

- ARCHITECTURE.md - DDD 架構詳解
- MODULE_GUIDE.md - 模組開發指南
- SETUP.md - 開發環境配置
- API_GUIDELINES.md - API 設計規範
- TESTING.md - 測試策略
- TROUBLESHOOTING.md - 常見問題

### 🛠️ 開發工具

- Bun 執行時
- TypeScript 5.3+
- Biome 代碼格式化和 Lint
- Vitest 測試框架
- Git Hooks 自動檢查

---

## 版本化規範

### Semantic Versioning

遵循 [Semantic Versioning 2.0.0](https://semver.org/) 規範：

- **MAJOR** (主版本) - Breaking changes
- **MINOR** (次版本) - 新增功能（向後相容）
- **PATCH** (修正版本) - 修復 Bug（向後相容）

格式：`MAJOR.MINOR.PATCH[-prerelease][+build]`

### 版本發佈流程

1. 更新 `package.json` 中的 `version`
2. 更新 `CHANGELOG.md`
3. 提交更新：`git commit -m "chore: release v1.x.x"`
4. 創建 git tag：`git tag v1.x.x`
5. 推送到遠程：`git push origin master && git push origin v1.x.x`

---

## 最近版本

- **最新穩定版**: [v1.1.0](#110---2024-03-10)
- **前一版本**: [v1.0.0](#100---2024-02-28)

更多資訊請查看：[GitHub Releases](https://github.com/gravito-framework/gravito-ddd-starter/releases)

---

**最後更新**: 2024-03-10
**維護者**: Gravito Team
