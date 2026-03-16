
# Presentation Layer (展示層)

展示層負責接收外部請求（如 HTTP）並將其轉發給應用服務。

## 核心組件

- **IHttpContext**: 框架無關的 HTTP 上下文，封裝請求、標頭與回應。
- **IModuleRouter / IAuthRouter**: 模組化路由註冊介面。
- **ApiResponse**: 統一的 JSON 響應結構（success, data, error, meta）。
- **Middlewares**:
  - `JwtGuardMiddleware`: API 認證。
  - `ExceptionHandlingMiddleware`: 全局異常映射。
  - `PageGuardMiddleware`: 頁面路由重定向。

## 渲染引擎

- **Inertia.js**: 實現 SPA over SSR 的現代化頁面渲染。

## 設計規約

1. **精簡控制器**: Controller 僅負責參數解析與呼叫應用服務。
2. **統一回應**: 所有的 API 必須使用 `ApiResponse` 類別進行格式化。
3. **安全性**: 嚴格執行 CSRF 與 Token 驗證。
