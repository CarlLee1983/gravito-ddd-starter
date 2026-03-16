# ⏱️ 15 分鐘實戰：建立你的第一個模組

本教學將帶領你從零開始，在 Gravito DDD 架構中建立一個簡單的 **「書籤 (Bookmark)」** 模組。

## 🎯 目標
1. 建立模組目錄結構。
2. 定義 Domain Entity 與 Repository 介面。
3. 實作 Application Service (Use Case)。
4. 設定 API 路由與 Controller。
5. 執行測試驗證。

---

## 第 1 步：生成模組結構 (1 分鐘)

使用內建的產生器快速建立基礎目錄：

```bash
bun run make:module Bookmark
```

這會在 `app/Modules/Bookmark` 下生成標準的四層結構。

---

## 第 2 步：定義領域模型 (3 分鐘)

在 `Domain` 層定義我們的業務對象。

### 2.1 定義 Entity
建立 `app/Modules/Bookmark/Domain/Entities/Bookmark.ts`:

```typescript
import { BaseEntity } from '@/Shared/Domain/BaseEntity';

export class Bookmark extends BaseEntity {
  constructor(
    public readonly id: string,
    public url: string,
    public title: string,
    public userId: string
  ) {
    super(id);
    if (!url.startsWith('http')) throw new Error('無效的 URL');
  }

  static create(data: { url: string; title: string; userId: string }): Bookmark {
    const id = crypto.randomUUID();
    return new Bookmark(id, data.url, data.title, data.userId);
  }
}
```

### 2.2 定義 Repository 介面
建立 `app/Modules/Bookmark/Domain/Repositories/IBookmarkRepository.ts`:

```typescript
import { Bookmark } from '../Entities/Bookmark';

export interface IBookmarkRepository {
  save(bookmark: Bookmark): Promise<void>;
  findById(id: string): Promise<Bookmark | null>;
  findByUserId(userId: string): Promise<Bookmark[]>;
}
```

---

## 第 3 步：實作應用服務 (4 分鐘)

建立 `app/Modules/Bookmark/Application/Services/CreateBookmarkService.ts`:

```typescript
import { IBookmarkRepository } from '../../Domain/Repositories/IBookmarkRepository';
import { Bookmark } from '../../Domain/Entities/Bookmark';

export class CreateBookmarkService {
  constructor(private bookmarkRepo: IBookmarkRepository) {}

  async execute(input: { url: string; title: string; userId: string }) {
    // 1. 建立領域對象 (自動執行業務驗證)
    const bookmark = Bookmark.create(input);

    // 2. 持久化
    await this.bookmarkRepo.save(bookmark);

    return { id: bookmark.id, url: bookmark.url };
  }
}
```

---

## 第 4 步：表現層設置 (4 分鐘)

### 4.1 實作 Controller
建立 `app/Modules/Bookmark/Presentation/Controllers/BookmarkController.ts`:

```typescript
import { CreateBookmarkService } from '../../Application/Services/CreateBookmarkService';

export class BookmarkController {
  constructor(private createService: CreateBookmarkService) {}

  async store(ctx: any) {
    const body = await ctx.req.json();
    const userId = ctx.get('user')?.id || 'guest';
    
    const result = await this.createService.execute({ ...body, userId });
    
    return ctx.json({ success: true, data: result }, 201);
  }
}
```

### 4.2 設定路由
建立 `app/Modules/Bookmark/Presentation/Routes/bookmark.routes.ts`:

```typescript
import { Hono } from 'hono';
import { BookmarkController } from '../Controllers/BookmarkController';

export const registerBookmarkRoutes = (router: Hono, controller: BookmarkController) => {
  router.post('/bookmarks', (ctx) => controller.store(ctx));
};
```

---

## 第 5 步：註冊與裝配 (3 分鐘)

在 `app/Modules/Bookmark/index.ts` 中導出模組定義，系統會自動透過 `ModuleAutoWirer` 進行裝配。

```typescript
import { IModuleDefinition } from '@/Shared/Infrastructure/IModuleDefinition';
import { BookmarkController } from './Presentation/Controllers/BookmarkController';
import { CreateBookmarkService } from './Application/Services/CreateBookmarkService';

export const BookmarkModule: IModuleDefinition = {
  name: 'Bookmark',
  
  // 依賴注入註冊
  registerProviders(container) {
    container.singleton('bookmarkRepo', () => new InMemoryBookmarkRepository());
    container.singleton('createBookmarkService', (c) => new CreateBookmarkService(c.make('bookmarkRepo')));
    container.singleton('bookmarkController', (c) => new BookmarkController(c.make('createBookmarkService')));
  },

  // 路由註冊
  registerRoutes({ router, container }) {
    const controller = container.make('bookmarkController');
    registerBookmarkRoutes(router, controller);
  }
};
```

---

## 🏁 測試你的模組

啟動伺服器：
```bash
bun run dev
```

使用 `curl` 測試：
```bash
curl -X POST http://localhost:3000/bookmarks \
  -H "Content-Type: application/json" \
  -d '{"url": "https://gravito.dev", "title": "Gravito Framework"}'
```

**預期回應：**
```json
{"success":true,"data":{"id":"...","url":"https://gravito.dev"}}
```

---

## 💡 下一步
- 實作真正的 `SqliteBookmarkRepository`。
- 增加 `BookmarkDeleted` 領域事件。
- 撰寫單元測試於 `tests/Unit/Modules/Bookmark`。

恭喜！你已經掌握了 Gravito DDD 的開發精髓。
