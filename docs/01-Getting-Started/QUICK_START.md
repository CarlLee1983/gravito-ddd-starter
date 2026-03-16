# ⏱️ 15 分鐘實戰：建立你的第一個模組

本教學帶你用最短路徑建立一個 `Bookmark` 模組，並跑起第一個 API。

---

## 1) 生成模組結構

```bash
bun run generate:module Bookmark
```

---

## 2) 實作 Domain Entity（範例）

`app/Modules/Bookmark/Domain/Entities/Bookmark.ts`

```ts
import { BaseEntity } from '@/Foundation/Domain/BaseEntity'

export class Bookmark extends BaseEntity {
  constructor(
    public url: string,
    public title: string,
    public userId: string
  ) {
    super()
    if (!url.startsWith('http')) throw new Error('Invalid URL')
  }
}
```

---

## 3) 建立 Controller 與路由

在 `app/Modules/Bookmark/Presentation/Controllers/BookmarkController.ts` 新增簡單 handler，
並在 `index.ts` 的 `registerRoutes` 中掛載路由：

```ts
registerRoutes: (ctx) => {
  const controller = ctx.container.make('bookmarkController')
  const router = ctx.createModuleRouter()
  router.post('/bookmarks', (c) => controller.store(c))
}
```

---

## 4) 啟動與驗證

```bash
ORM=memory bun run dev
curl -X POST http://localhost:3000/bookmarks \
  -H "Content-Type: application/json" \
  -d '{"url":"https://gravito.dev","title":"Gravito"}'
```

---

## ✅ 下一步

- 補齊 Repository 介面與實作
- 加入 Application Service（Use Case）
- 撰寫單元測試

最後更新: 2026-03-16
