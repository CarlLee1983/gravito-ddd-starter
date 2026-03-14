# 🌐 前端集成與頁面路由指南

Gravito DDD 的前端集成方案，包含 SSR、Token 管理與 UX 優化。

---

## 📋 本分類包含

| 文檔 | 重點 |
|------|------|
| **[PAGES_ROUTING_IMPLEMENTATION.md](./PAGES_ROUTING_IMPLEMENTATION.md)** | ⭐ **核心指南**：頁面路由 (SSR) 實現與模組化路由結構 |
| **[MIDDLEWARE_GUIDE.md](./MIDDLEWARE_GUIDE.md)** | 中間件開發指南：認證、權限與動態 Locale 處理 |
| **[TOKEN_MANAGEMENT.md](./TOKEN_MANAGEMENT.md)** | JWT Token 管理策略：存儲、傳遞與安全性 |
| **[TOKEN_AUTO_REFRESH.md](./TOKEN_AUTO_REFRESH.md)** | Token 自動刷新機制：確保用戶會話連續性 |
| **[CSRF_RETRY_FORM_PROTECTION.md](./CSRF_RETRY_FORM_PROTECTION.md)** | CSRF 保護與表單重試機制：提高系統安全性與魯棒性 |
| **[UX_ENHANCEMENT_HOOKS.md](./UX_ENHANCEMENT_HOOKS.md)** | UX 增強 Hooks：前端與後端狀態同步的常用工具 |

---

## 🎯 快速導航

### "我想為新模組添加頁面"
→ 參考 [PAGES_ROUTING_IMPLEMENTATION.md](./PAGES_ROUTING_IMPLEMENTATION.md) 的實施步驟。
→ 了解 `Presentation/Routes/pages.ts` 的結構。

### "我想自定義中間件"
→ 參考 [MIDDLEWARE_GUIDE.md](./MIDDLEWARE_GUIDE.md) 了解如何註冊全局或模組中間件。

### "如何處理 Token 刷新"
→ 參考 [TOKEN_AUTO_REFRESH.md](./TOKEN_AUTO_REFRESH.md) 了解無感知刷新的原理。

---

## 🏗️ 核心架構：SSR 渲染流

系統使用 `Inertia.js` (或類似機制) 實現 SSR，數據流如下：

1. **Controller**: 準備數據。
2. **ctx.render()**: 將數據傳遞給前端組件。
3. **Frontend Component**: 接收 props 並渲染頁面。

```typescript
// Controller 示例
export async function show(ctx: IModuleContext) {
  const product = await productQuery.findById(ctx.params.id)
  return ctx.render('Product/Detail', { product })
}
```

---

## 🔗 相關資源

**架構設計**:
- [路由分層模式](../02-Architecture/CORE_DESIGN.md)

**實施案例**:
- [Auth 模組路由實施](../04-Module-Development/DEVELOPMENT_GUIDE.md)

---

**快速導航**:
← [資料庫與 ORM 適配](../05-Database-ORM/)
→ [接線系統與適配器](../06-Adapters-Wiring/)

最後更新: 2026-03-14
