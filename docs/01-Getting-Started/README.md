# 🚀 快速上手指南

在 5 分鐘內了解 Gravito DDD Starter，然後在 10 分鐘內開始開發。

---

## 📋 本分類包含

| 文檔 | 用途 | 時間 |
|------|------|------|
| **[快速實戰](./QUICK_START.md)** | 15 分鐘建立第一個模組 | 15 min |

---

## ⚡ 5 分鐘快速開始

### 1. 安裝 (2 min)

```bash
# 克隆專案
git clone <repo-url> my-app
cd my-app

# 安裝依賴
bun install

# 設置 Git hooks（可選）
bun run setup:hooks
```

### 2. 啟動開發伺服器 (1 min)

```bash
# Memory 模式（推薦用於開發）
ORM=memory bun run dev

# 訪問 API（模板預設提供 /api）
curl http://localhost:3000/api
```

### 3. 建立第一個 API (2 min)

```bash
# 生成新模組
bun run generate:module Product

# 編輯模組代碼
# app/Modules/Product/Domain/...
# app/Modules/Product/Presentation/...

# 重新啟動伺服器，新路由自動添加
# GET /products
# POST /products
# GET /products/:id
```

### 4. 驗證 (1 min)

```bash
# 運行最小測試
bun run test

# TypeScript 檢查
bun run typecheck
```

✅ 完成！現在你已經可以開始開發了。

---

## 📚 下一步

1. 讀 [核心架構設計](../02-Architecture/CORE_DESIGN.md)
2. 讀 [模組開發指南](../04-Module-Development/DEVELOPMENT_GUIDE.md)
3. 讀 [DDD 實施檢查清單](../03-DDD-Design/DDD_CHECKLIST.md)

---

## 🎯 常見需求

### "我想快速建立一個 CRUD API"
→ 使用 `bun run generate:module <Name>`  
→ 按 [模組開發指南](../04-Module-Development/DEVELOPMENT_GUIDE.md) 實施  
→ 用 [DDD 實施檢查清單](../03-DDD-Design/DDD_CHECKLIST.md) 驗證

---

## ❓ 常見問題

**Q: 我需要安裝 Docker 嗎？**
A: 不需要。使用 Memory ORM 開發無需數據庫。生產環境再考慮。

**Q: 可以用 npm 代替 bun 嗎？**
A: 可以，但推薦用 bun（更快、內置 ts-node）。

**Q: 支援什麼 ORM？**
A: Memory（開發）、Drizzle（SQLite）、Atlas（完整版）。未來支援 Prisma。

**Q: 第一次需要多長時間？**
A: 安裝到跑第一個 API：15 分鐘。

---

## 📖 參考

- [核心架構設計](../02-Architecture/CORE_DESIGN.md)
- [模組開發指南](../04-Module-Development/DEVELOPMENT_GUIDE.md)
- [專案再利用指南](../10-Project-Reuse/REUSE_GUIDE.md)

最後更新: 2026-03-16
