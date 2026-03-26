
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

1. **精簡控制器**: Controller 負責參數解析、路由分派與呼叫下層服務。
2. **統一回應**: 所有的 API 必須使用 `ApiResponse` 類別進行格式化。
3. **安全性**: 嚴格執行 CSRF 與 Token 驗證。

## Controller 呼叫決策樹

```
收到 HTTP 請求
  │
  ├─ 操作涉及業務編排？（狀態變更、跨服務協調、事務邊界）
  │  └─ YES → 呼叫 Application Service
  │         例：LoginService, PlaceOrderService, CheckoutCartService
  │
  └─ 純查詢且無額外邏輯？（單一資料源、無轉換、無權限過濾）
     └─ YES → 直接呼叫 Repository 或 Application Port
            例：repository.findByEntityId(), userProfileService.findById()
```

### 現有模組範例

| 模組 | 命令操作（經 Application Service） | 查詢操作（直接呼叫） |
|------|-----------------------------------|-----------------------|
| Auth | `LoginService`, `RegisterService`, `LogoutService` | `IUserProfileService.findById()` |
| Cart | `AddItemToCartService`, `CheckoutCartService` | `ICartRepository.findByUserId()` |
| Order | `PlaceOrderService` | `IOrderRepository.findById()` |
| AuditLog | 無（寫入由 Event Handler 負責） | `IAuditEntryRepository.findBySeverity()` |

> **升級時機**：當查詢需要權限過濾、跨模組聚合或資料轉換時，抽出 Application Query Service。
