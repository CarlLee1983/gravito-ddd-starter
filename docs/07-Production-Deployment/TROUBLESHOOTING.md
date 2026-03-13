# 🚫 故障排查指南 (Troubleshooting Guide)

本文件收錄開發與部署 Gravito DDD 過程中常見的問題與解決方案。

---

## 1. 安裝與啟動 (Installation & Boot)

### 問題: 無法找到模組或 `@gravito/*` 包錯誤
**症狀**: `error: Cannot find module '@gravito/core'`
**解決方案**:
1.  確保已執行 `bun install`.
2.  檢查 `package.json` 中的版本是否與目前使用的 `bun` 版本相容。
3.  清除快取並重試: `rm -rf node_modules bun.lock && bun install`.

### 問題: 埠口占用 (EADDRINUSE)
**症狀**: `Error: listen EADDRINUSE: address already in use :::3000`
**解決方案**:
-   殺掉舊進程: `lsof -i :3000 | awk 'NR!=1 {print $2}' | xargs kill -9`
-   或更改埠口: `PORT=3001 bun run dev`.

---

## 2. 資料庫問題 (Database Issues)

### 問題: `databaseAccess` 為 undefined
**症狀**: `Error: Cannot read property 'table' of undefined`
**原因**: `DatabaseAccessBuilder` 未能在啟動時正確初始化。
**解決方案**:
1.  檢查 `.env` 中的 `ORM` 變數是否正確（`memory`, `drizzle`, `atlas`）。
2.  若使用 `ORM=drizzle` 或 `atlas`，確保 `DB_CONNECTION` 相關變數（如 `DATABASE_URL`）已設定。
3.  檢查 `app/bootstrap.ts` 中是否正確調用了 `ModuleAutoWirer.wire(core, db)`.

### 問題: PostgreSQL 連線拒絕
**症狀**: `connect ECONNREFUSED 127.0.0.1:5432`
**解決方案**:
-   確保 Docker 容器已啟動: `./scripts/docker-pg.sh start`.
-   檢查端口映射: 本專案 Docker 預設使用 **5432** 映射。

---

## 3. 路由與控制器 (Routes & Controllers)

### 問題: 404 Not Found
**症狀**: 訪問 `GET /api/users` 回傳 404.
**解決方案**:
1.  檢查模組入口 `app/Modules/User/index.ts` 是否正確導出了 `UserModule` 物件。
2.  檢查 `UserModule` 內部的 `registerRoutes` 函式是否正確註冊了路徑。
3.  確認路由前綴是否正確（本系統不強制加 `/api`，除非你在 `registerRoutes` 中定義）。

---

## 4. 測試失敗 (Testing)

### 問題: 測試超時或資料庫鎖定
**解決方案**:
-   單元測試優先使用 `ORM=memory`。
-   整合測試若涉及 SQLite，確保測試前已刪除舊的 `.db` 檔案或使用 `:memory:`。

---

## 5. 跨模組依賴 (Wiring)

### 問題: 無法解析特定的 Repository
**原因**: Repository 工廠未能在 `RepositoryRegistry` 中註冊。
**解決方案**:
-   確認 `app/Modules/<Name>/Infrastructure/Providers/registerXxxRepositories.ts` 已被 `index.ts` 引用並賦值給 `registerRepositories` 屬性。

最後更新: 2026-03-13
