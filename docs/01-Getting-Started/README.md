# 🚀 快速上手指南

在 5 分鐘內了解 Gravito DDD Starter，然後在 10 分鐘內開始開發。

---

## 📋 本分類包含

| 文檔 | 用途 | 時間 |
|------|------|------|
| **[快速參考](./QUICK_REFERENCE.md)** | 最常用的指令和快速檢查 | 5 min |
| **[環境設置](./SETUP.md)** | 第一次安裝和配置 | 10 min |

---

## ⚡ 5 分鐘快速開始

### 1. 安裝 (2 min)

```bash
# 克隆專案
git clone <repo-url>
cd gravito-ddd-starter

# 安裝依賴
bun install

# 設置 Git hooks
bun run setup
```

### 2. 啟動開發伺服器 (1 min)

```bash
# Memory 模式（推薦用於開發）
ORM=memory bun run dev

# 訪問 API
curl http://localhost:3000/health
```

### 3. 建立第一個 API (2 min)

```bash
# 生成新模組
bun run make:module Product

# 編輯模組代碼
# src/Modules/Product/Domain/Aggregates/Product.ts
# src/Modules/Product/Presentation/Controllers/ProductController.ts

# 重新啟動伺服器，新路由自動添加
# GET /api/products
# POST /api/products
# GET /api/products/:id
```

### 4. 驗證 (1 min)

```bash
# 運行所有測試
bun test

# TypeScript 檢查
bun run typecheck
```

✅ 完成！現在你已經可以開始開發了。

---

## 📚 下一步

### 新手路徑 (完整入門)

1. **了解架構** (20 min)
   - 讀 [整體架構](../02-Architecture/ARCHITECTURE.md)
   - 掌握四層架構基本概念

2. **建立第一個業務模組** (1-2 小時)
   - 跟著 [模組開發指南](../04-Module-Development/MODULE_GUIDE.md)
   - 按照 [DDD 實施檢查清單](../03-DDD-Design/DDD_IMPLEMENTATION_CHECKLIST.md) 檢查質量

3. **理解數據庫** (20 min)
   - 讀 [數據庫指南](../05-Database-ORM/DATABASE.md)
   - 嘗試從 Memory ORM 遷移到 Drizzle

### 有經驗開發者路徑 (快速對接)

1. **讀架構決策** (15 min)
   - [架構決策](../02-Architecture/ARCHITECTURE_DECISIONS.md)
   - [抽象化規則](../02-Architecture/ABSTRACTION_RULES.md)

2. **理解 DDD 實施** (20 min)
   - [DDD 實施檢查清單](../03-DDD-Design/DDD_IMPLEMENTATION_CHECKLIST.md)

3. **探索 ORM 系統** (15 min)
   - [ORM 透明設計](../05-Database-ORM/ORM_TRANSPARENT_DESIGN.md)
   - [ORM 遷移指南](../05-Database-ORM/ORM_MIGRATION_GUIDE.md)

---

## 🎯 常見需求

### "我想快速查找指令"
→ [快速參考](./QUICK_REFERENCE.md)

### "我是 Laravel 開發者，想快速上手"
→ 讀 [SETUP.md](./SETUP.md)
→ 對比 [數據庫指南](../05-Database-ORM/DATABASE.md) (類似 Artisan 指令)

### "我是 Node.js 開發者"
→ 讀 [整體架構](../02-Architecture/ARCHITECTURE.md)
→ 對比 [模組開發指南](../04-Module-Development/MODULE_GUIDE.md)

### "我想快速建立一個 CRUD API"
→ 使用 `bun run make:module <Name> --db`
→ 按 [模組開發指南](../04-Module-Development/MODULE_GUIDE.md) 實施
→ 用 [DDD 實施檢查清單](../03-DDD-Design/DDD_IMPLEMENTATION_CHECKLIST.md) 驗證

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

- [快速參考](./QUICK_REFERENCE.md) - 所有常用指令
- [環境設置](./SETUP.md) - 詳細配置步驟
- [整體架構](../02-Architecture/ARCHITECTURE.md) - 深入理解設計

---

**下一步**:
- 選擇你的學習路徑（新手或有經驗）
- 閱讀 [環境設置](./SETUP.md)
- 或直接跳到 [快速參考](./QUICK_REFERENCE.md)

最後更新: 2026-03-11
