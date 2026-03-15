# .gitignore 審計報告

## 概述

掃蕩專案中所有應該被忽略但未被正確處理的檔案和目錄。

**掃蕩日期**: 2026-03-15
**狀態**: 5 個問題已識別

---

## 問題清單

### 🔴 高優先級

#### 1. Playwright 測試報告被追蹤

**位置**: `playwright-report/`
**大小**: 584 KB
**檔案數**: ~50+ 檔案和目錄
**狀態**: ❌ 被 git 追蹤

```
playwright-report/
├── index.html          ✗ 被追蹤
├── data/
│   └── *.png          ✗ 被追蹤
└── ...
```

**問題**: Playwright E2E 測試執行後生成的測試報告被提交，累積無用資產。

**解決方案**:
```gitignore
# Playwright E2E 測試報告
playwright-report/
test-results/
```

---

#### 2. Bun 測試結果目錄遺漏

**位置**: `test-results/`
**大小**: 1.1 MB
**檔案數**: ~200+ 目錄（每個測試一個）
**狀態**: ⚠️ 未被追蹤，但應明確忽略

```
test-results/
├── PlaywrightUXHooks-Phase-4--01c78-...
├── PlaywrightUXHooks-Phase-4--0ad3b-...
└── ... (~12+ 個目錄)
```

**問題**:
- Playwright 測試的詳細結果和 artifacts
- 包含截圖、視頻、trace 檔案
- 每次測試執行都會重新生成

**解決方案**: 添加到 .gitignore

---

### 🟡 中優先級

#### 3. dist/ 目錄編譯產物

**位置**: `dist/config/**/*.js`
**大小**: 40 KB
**檔案數**: ~15+ 編譯檔案
**狀態**: ✓ 已忽略（但規則可改進）

```
dist/
├── config/
│   ├── app/
│   │   ├── app.js         ✓ 被忽略
│   │   ├── cache.js       ✓ 被忽略
│   │   └── ...
│   └── tools/
│       └── drizzle.config.js  ✓ 被忽略
```

**問題**: 目前 `dist/` 整個被忽略是對的，但可以更明確規則。

**改進方案**:
```gitignore
# 編譯輸出
dist/**/*.js
dist/**/*.map
dist/**/*.d.ts

# 但保留必要的檔案（如有）
!dist/config/  # 如需運行時配置
```

---

#### 4. 臨時目錄規則不夠完整

**位置**: `storage/tmp/`, `storage/framework/cache/`
**狀態**: ✓ 已有規則，但可改進

**當前規則**:
```gitignore
storage/tmp/**
storage/framework/cache/**
```

**改進方案**:
```gitignore
# 臨時和快取（允許目錄存在但忽略內容）
storage/tmp/**
storage/framework/cache/**
!storage/tmp/.gitkeep          # 保證目錄存在
!storage/framework/cache/.gitkeep
```

---

### 🟢 低優先級

#### 5. IDE 和系統檔案補充

**已規則**: `.idea`, `.vscode`, `.DS_Store`

**可補充規則**:
```gitignore
# macOS
.DS_Store
.AppleDouble
.LSOverride
*.swp
*.swo

# Windows
Thumbs.db
Desktop.ini

# IDE
.vscode/
.idea/
*.iml
*.sublime-project
*.sublime-workspace

# 編輯器備份
*~
*.bak
*.swp
```

---

## 改進建議

### 方案 A: 最小改進（推薦）

只添加發現的兩個關鍵問題：

```gitignore
# 測試報告（Playwright 和 Bun）
playwright-report/
test-results/
```

**優勢**: 簡潔，解決主要問題

---

### 方案 B: 完全改進（全面）

重構整個 .gitignore，組織更清晰：

```gitignore
# 依賴
node_modules/

# 環境
.env
.env.local
.env.*.local

# 編譯產物
dist/
config/**/*.js
config/**/*.d.ts
config/**/*.map

# 數據庫
*.db
*.sqlite
*.sqlite3
database/*.db
storage/**/*.db

# 測試產物
coverage/
.nyc_output/
test-results/
playwright-report/
.playwright-artifacts-*/

# 快取
.turbo/
.cache/
storage/tmp/**
storage/framework/cache/**

# IDE 和編輯器
.idea/
.vscode/
.history/
*.swp
*.swo
*~

# macOS
.DS_Store
.AppleDouble
.LSOverride

# 日誌
*.log
logs/

# 雜項
gravito.lock.json
KNOWLEDGE_BASE.md
```

**優勢**: 全面、註解清晰、易於維護

---

## 執行計畫

### Step 1: 立即修復（本提交）

```bash
# 添加遺漏的規則
cat >> .gitignore << 'EOF'

# 測試報告和結果
playwright-report/
test-results/
.playwright-artifacts-*/
EOF
```

### Step 2: 移除已追蹤的測試報告

```bash
# 從 git 移除（但保留本地）
git rm -r --cached playwright-report/
git rm -r --cached test-results/
git commit -m "chore: remove tracked test artifacts from git"
```

### Step 3: 優化 .gitignore（可選）

使用方案 B 重構 .gitignore，提高可讀性。

---

## 驗證清單

執行以下命令驗證改進：

```bash
# 1. 檢查是否還有被追蹤的測試報告
git ls-files | grep -E "(playwright-report|test-results)"

# 2. 運行測試並驗證無遺留
bun test
bun run tests/cleanup-verify.ts

# 3. 檢查 git 狀態
git status

# 應該顯示：
# working tree clean
```

---

## 長期維護建議

### 自動化檢查

在 `.git/hooks/pre-commit` 中添加檢查：

```bash
#!/bin/bash
# 檢查是否意外提交了測試報告
if git diff --cached --name-only | grep -E "(\.db|test-results|playwright-report)" > /dev/null; then
  echo "❌ Error: Attempting to commit test artifacts!"
  exit 1
fi
```

### 定期審計

```bash
# 每月執行
du -sh * | sort -rh | head -20
git ls-files | wc -l
```

---

## 相關配置

| 檔案 | 用途 |
|------|------|
| `.gitignore` | 全局忽略規則 |
| `.gitignore_local` (可選) | 個人本地規則 |
| `.git/info/exclude` | 不提交的本地規則 |

---

## 總結

| 項目 | 狀態 | 影響 |
|------|------|------|
| Playwright 報告被追蹤 | 🔴 需修復 | 580+ KB 無用資產 |
| 測試結果目錄 | 🔴 需添加 | 1.1+ MB 無用資產 |
| dist/ 產物 | ✓ 已忽略 | - |
| 臨時目錄 | ✓ 已忽略 | - |
| IDE/系統檔案 | ✓ 已忽略 | - |

**預期改進**:
- ↓ 儲存庫大小 ~1.7 MB
- ↓ git ls-files 計數 ~50+ 檔案
- ✅ 更清晰的架構規則

---

**更新**: 2026-03-15
**下一步**: 立即修復 + 移除已追蹤檔案
