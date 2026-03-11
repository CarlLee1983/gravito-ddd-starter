# Post Module

Post 模組 - DDD 實現。

## 架構

```
Post/
├── Domain/
│   ├── Entities/
│   ├── ValueObjects/
│   ├── Repositories/
│   │   └── IPostRepository.ts
│   └── Services/
├── Application/
│   ├── Services/
│   └── DTOs/
├── Presentation/
│   ├── Controllers/
│   │   └── PostController.ts
│   └── Routes/
│       └── Post.routes.ts
├── Infrastructure/
│   ├── Repositories/
│   │   └── PostRepository.ts
│   └── Providers/
│       └── PostServiceProvider.ts
├── tests/
├── index.ts
└── README.md
```

## 使用

1. 在 `src/app.ts` 中使用適配器註冊 ServiceProvider：
   ```typescript
   core.register(createGravitoServiceProvider(new PostServiceProvider()))
   ```

2. 在 `src/wiring/index.ts` 中添加 `registerPost` 函式

3. 在 `src/routes.ts` 中調用 `registerPost(core)`

## 框架無關設計

- Routes 接收 `IModuleRouter` + `controller`
- Controllers 接收 `IHttpContext`（不依賴 `GravitoContext`）
- ServiceProvider 繼承 `ModuleServiceProvider`（不依賴 `@gravito/core`）
- 未來換框架只需修改 `adapters/`
