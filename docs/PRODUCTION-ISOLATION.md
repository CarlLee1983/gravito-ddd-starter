# 生產隔離架構文檔

## 概述

gravito-ddd 實現了編譯與開發環境的 **100% 完全隔離**。此文檔詳細說明隔離機制、驗證方法，以及生產部署最佳實踐。

## 隔離架構

### 目錄隔離

```
gravito-ddd/
├── src/              ← 源代碼（.ts 僅）
│   ├── bootstrap.ts
│   ├── Modules/
│   └── Shared/
├── config/           ← 配置源代碼（.ts 僅）
│   ├── app.ts
│   ├── database.ts
│   └── index.ts
├── dist/             ← 編譯產物（.js 僅）
│   ├── src/
│   │   ├── bootstrap.js
│   │   └── ...
│   └── config/
│       ├── app.js
│       └── ...
└── .gitignore        ← 排除編譯產物
```

### 隔離保障

| 層級 | 開發環境 | 生產環境 | 隔離機制 |
|------|--------|--------|--------|
| **源代碼** | ✅ src/, config/ | ❌ 無 | .gitignore + build-cleanup |
| **編譯產物** | ✅ 可選 | ✅ dist/ | dist/ 獨立目錄 |
| **開發依賴** | ✅ 15 個 | ❌ 無 | Docker 多階段 |
| **宣告檔** | ✅ .d.ts | ❌ 無 | tsconfig.prod.json |
| **源地圖** | ✅ .map | ❌ 無 | removeComments, sourceMap:false |
| **敏感信息** | ✅ .env | ❌ 無 | .gitignore |

## 構建流程

### 開發構建

```bash
# 完整安裝（含 devDependencies）
$ bun install

# 熱重載開發
$ bun dev
```

結果：源代碼與開發工具完整可用。

### 生產構建

```bash
# 完整安裝（構建用）
$ bun install --production=false

# 生產構建
$ bun run build:prod
```

構建流程：

```
1. TypeScript 編譯 (tsconfig.prod.json)
   ├─ 目標: ES2020
   ├─ 禁用 sourceMap
   ├─ 移除宣告檔 (.d.ts)
   ├─ 移除源註解
   └─ 輸出到 dist/

2. 自動化清理 (build-cleanup.sh)
   ├─ 移除 .ts 源文件
   ├─ 移除 .d.ts 宣告
   ├─ 移除 .map 源地圖
   ├─ 修正 ESM 導入路徑
   └─ 清理源代碼目錄遺留物

3. 結果
   └─ dist/ 416KB（純 .js 編譯產物）
```

### 生產運行

```bash
# 僅安裝生產依賴
$ bun install --production

# 運行生產應用
$ bun dist/src/index.js
```

## Docker 部署

### 多階段構建

```dockerfile
# Stage 1: Builder（編譯）
FROM oven/bun:latest AS builder
├─ 複製源代碼
├─ 完整安裝（含 devDependencies）
└─ 運行 bun run build:prod

# Stage 2: Runtime（運行）
FROM oven/bun:latest
├─ 複製編譯產物（dist/）
├─ 安裝生產依賴
└─ 啟動應用
```

### 構建與運行

```bash
# 構建鏡像
$ docker build -f docker/Dockerfile.prod -t app:prod .

# 運行容器
$ docker run -p 3000:3000 app:prod
```

優勢：
- ✅ 編譯環境完全隔離
- ✅ 最終鏡像無源代碼
- ✅ 最終鏡像無開發依賴
- ✅ 鏡像大小最小化

## 隔離驗證

### 快速檢查

```bash
# 運行隔離檢查腳本
$ bash scripts/check-isolation.sh
```

輸出示例：

```
✅ 隔離檢查通過 (0 個問題)
📊 隔離達成度: 100% ✅
```

### 詳細檢查

#### 1. 源代碼目錄隔離

```bash
# 驗證 config/ 無編譯產物
$ find config -type f -name "*.js" | wc -l
# 預期: 0

# 驗證 src/ 無編譯產物
$ find src -type f -name "*.js" | wc -l
# 預期: 0
```

#### 2. 編譯產物隔離

```bash
# 驗證 dist/ 無源代碼
$ find dist -type f \( -name "*.ts" -o -name "*.d.ts" -o -name "*.map" \) | wc -l
# 預期: 0

# 驗證 dist/ 有編譯產物
$ find dist -type f -name "*.js" | wc -l
# 預期: > 0
```

#### 3. Git 隔離

```bash
# 驗證編譯產物未提交
$ git status --porcelain | grep -E "\.js|\.d\.ts|\.map"
# 預期: 無輸出

# 驗證 .gitignore 覆蓋
$ grep "config/\*\*/\*.js" .gitignore
$ grep "src/\*\*/\*.js" .gitignore
# 預期: 找到相應規則
```

#### 4. 安全檢查

```bash
# 驗證敏感文件未提交
$ git ls-files | grep -E "\.env|\.log"
# 預期: 無輸出

# 驗證源代碼目錄整潔
$ git status
# 預期: nothing to commit, working tree clean
```

## 配置詳解

### tsconfig.prod.json

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "declaration": false,        // 不生成 .d.ts
    "declarationMap": false,     // 不生成 .d.ts.map
    "sourceMap": false,          // 不生成 .js.map
    "removeComments": true,      // 移除源註解
    "target": "ES2020"           // Node.js 最佳化
  }
}
```

### .gitignore 規則

```
# 源代碼目錄編譯產物
config/**/*.js        # config 源目錄的 .js
src/**/*.js          # src 源目錄的 .js
config/**/*.d.ts     # TypeScript 宣告
src/**/*.d.ts
**/*.js.map          # 源地圖
**/*.d.ts.map
```

### build-cleanup.sh 流程

```bash
1. 移除編譯產物
   find dist -type f \( -name "*.ts" -o -name "*.map" \) -delete

2. 修正 ESM 導入
   - @/Shared -> ./Shared.js
   - ../config -> ../config.js
   - ./app -> ./app.js

3. 清理源代碼遺留物
   find config src -type f \( -name "*.js" -o -name "*.d.ts" \) -delete
```

## 生產部署檢查清單

- [ ] 運行 `bun run build:prod` 成功
- [ ] 運行 `bash scripts/check-isolation.sh` 通過
- [ ] `dist/` 目錄僅包含 .js 文件
- [ ] `src/` 和 `config/` 無 .js 文件
- [ ] git status 顯示 working tree clean
- [ ] Docker 構建成功
- [ ] Docker 鏡像無源代碼文件

## 常見問題

### Q: 為什麼 config/ 要在源代碼目錄？
**A**: config/ 包含應用配置源代碼，必須與 src/ 一起編譯。編譯後只有必要的 .js 被保留在 dist/。

### Q: 能否直接運行 dist/index.js？
**A**: 不能。入點是 `dist/src/index.js`，因為源目錄結構被保留以維持相對路徑正確性。

### Q: .env 文件在哪裡？
**A**: 應放在項目根目錄，**不應提交到 Git**。生產環境通過環境變量或 Docker 秘鑰注入。

### Q: 如何檢查隔離是否完整？
**A**: 運行 `bash scripts/check-isolation.sh`，應顯示 `隔離達成度: 100% ✅`

## 最佳實踐

1. **開發工作流**
   ```bash
   $ bun install           # 含 devDeps
   $ bun dev              # 熱重載開發
   $ bun test             # 運行測試
   ```

2. **生產部署**
   ```bash
   $ bun run build:prod   # 清潔編譯
   $ docker build -f docker/Dockerfile.prod .
   $ docker run -p 3000:3000 app:prod
   ```

3. **驗證隔離**
   ```bash
   $ bash scripts/check-isolation.sh
   # 或在 CI/CD 中加入此檢查
   ```

4. **敏感信息**
   - 絕不提交 `.env` 或敏感配置
   - 使用環境變量或 Docker 秘鑰注入
   - 定期審計 `git ls-files` 確認無洩露

## 架構優勢

| 優勢 | 說明 |
|------|------|
| **安全性** | 生產環境無源代碼、無開發工具 |
| **大小** | 416KB 精簡包，無冗餘 |
| **可重現** | Docker 多階段保證構建一致性 |
| **可維護** | 自動化清理防止遺留產物 |
| **可部署** | 支援 Docker、Bun、Node.js 運行 |

## 更新日期

- **2026-03-11**: 實施完整隔離架構
  - 提交: 96aea0c - 生產隔離實施
  - 提交: b1ce0aa - Config 編譯產物清理
  - 提交: 4097edb - 隔離驗證腳本

---

**隔離達成度: 100% ✅**

任何源代碼都無法從生產環境洩露。
