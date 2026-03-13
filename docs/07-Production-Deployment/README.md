# 🚀 生產部署指南 (Production & Deployment)

本指南涵蓋從本地開發到正式環境上線的所有必要步驟、優化建議與故障排除。

---

## 📋 本分類包含

| 文檔 | 重點 |
| :--- | :--- |
| **[DEPLOYMENT.md](./DEPLOYMENT.md)** | ⭐ **核心指南**: 環境變數、Docker 配置與雲端部署。 |
| **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** | 故障排除: 安裝、啟動、資料庫與路由常見問題。 |

---

## 🎯 快速導航

### "我準備好要上線了，需要做什麼？"
→ 參考 [DEPLOYMENT.md](./DEPLOYMENT.md) 的安全檢查清單。

### "我想使用 Docker 部署"
→ 參考 [DEPLOYMENT.md](./DEPLOYMENT.md) 的 Docker 部署章節。

### "啟動時報錯或找不到路由？"
→ 參考 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) 進行診斷。

---

## 🚀 典型上線流程

### 1. 環境準備
- [ ] 確保伺服器具備 **Bun** 執行環境。
- [ ] 設定好 PostgreSQL 與 Redis 服務。
- [ ] 準備生產環境用的 `.env` 檔案。

### 2. 安全檢查 (Critical)
- [ ] **APP_DEBUG=false**: 嚴禁在生產環境開啟除錯模式。
- [ ] **密鑰管理**: 確保 `APP_KEY` 與資料庫密碼不洩露。
- [ ] **CORS 配置**: 僅允許受信任的域名。

### 3. 執行部署
```bash
bun install --frozen-lockfile
bun run build
bun run migrate
bun run start
```

---

## ✅ 部署檢查清單 (Deployment Checklist)

- [ ] 所有 Unit/Integration 測試皆已通過。
- [ ] 已設定正確的 `APP_URL`.
- [ ] 健康檢查端點 `/health` 回傳 `healthy`.
- [ ] 已配置日誌輪轉或聚集系統。

---

## 🔗 相關資源

**架構參考**:
- [核心架構設計](../02-Architecture/CORE_DESIGN.md)
- [事件系統架構](../02-Architecture/EVENT_SYSTEM.md)

**開發規範**:
- [DDD 實施檢查清單](../03-DDD-Design/DDD_CHECKLIST.md)
- [模組開發指南](../04-Module-Development/DEVELOPMENT_GUIDE.md)

最後更新: 2026-03-13
