# 📚 模組清單與架構分析

**最後更新**: 2026-03-14 | **模組數量**: 10 個 | **TS 檔案**: 201 個

---

## 🎯 模組總覽

| # | 模組 | 檔案數 | 層級 | 職責 | 狀態 |
|---|------|--------|------|------|------|
| 1 | **Auth** | 11 | DAPP | 認證 & 授權 | ✅ |
| 2 | **Cart** | 28 | DAPP | 購物車管理 | ✅ |
| 3 | **Health** | 17 | DAPP | 系統健康檢查 | ✅ |
| 4 | **Order** | 21 | DAPP | 訂單管理 | ✅ |
| 5 | **Payment** | 23 | DAPP | 支付處理 | ✅ |
| 6 | **Portal** | 6 | AP | 入口點 & 儀表板 | ✅ |
| 7 | **Post** | 27 | DAPP | 文章發佈 | ✅ |
| 8 | **Product** | 24 | DAPP | 商品管理 | ✅ |
| 9 | **Session** | 15 | AP | 會話管理 | ✅ |
| 10 | **User** | 29 | DAPP | 用戶管理 | ✅ |

**層級說明**:
- **DAPP**: Domain + Application + Presentation (完整模組)
- **AP**: Application + Presentation (無 Domain 層)

---

## 📊 模組架構分類

### 🔵 完整 DDD 模組 (8 個)

| 模組 | 特性 | 關鍵聚合根 | 事件 |
|------|------|----------|------|
| **User** | 用戶核心 | User | UserCreated, UserNameChanged |
| **Auth** | 認證流程 | Session | LoginRequested |
| **Post** | 文章發佈 | Post | PostPublished, PostArchived |
| **Product** | 商品目錄 | Product | ProductCreated |
| **Cart** | 購物車 | Cart | CartCheckoutRequested |
| **Order** | 訂單處理 | Order | OrderPlaced, OrderConfirmed |
| **Payment** | 支付流程 | Payment | PaymentSucceeded |
| **Health** | 系統監控 | HealthCheck | HealthCheckPerformed |

### 🟢 應用層模組 (2 個)

| 模組 | 特性 | 用途 |
|------|------|------|
| **Session** | 會話管理 | JWT 驗證、會話維護 |
| **Portal** | 入口模組 | 儀表板、首頁路由 |

---

## 🏗️ 各模組詳細架構

### 1️⃣ User 模組 (用戶核心)

```
app/Modules/User/
├── Domain/
│   ├── Aggregates/User.ts              # 聚合根
│   ├── ValueObjects/                   # Email, UserName
│   ├── Events/                         # UserCreated, UserNameChanged
│   └── Repositories/IUserRepository    # Port 介面
├── Application/
│   ├── Services/                       # CreateUserService
│   ├── DTOs/                          # CreateUserDTO, UserResponseDTO
│   ├── Queries/GetUserService         # CQRS 讀側
│   ├── ReadModels/UserReadModel       # 讀模型
│   └── Jobs/WelcomeEmailJob           # 非同步任務
├── Infrastructure/
│   ├── Persistence/UserRepository     # Adapter 實現
│   ├── Services/UserMessageService    # 訊息服務
│   └── Providers/UserServiceProvider  # DI 配置
└── Presentation/
    ├── Controllers/UserController      # HTTP 層
    └── Routes/                        # API 路由
```

**統計**: 29 個檔案 | **測試**: ✅ | **事件**: 2 個

**主要責任**:
- 用戶身份與基本資訊管理
- 郵件通知 (新用戶歡迎郵件)
- CQRS 讀側優化查詢

---

### 2️⃣ Auth 模組 (認證授權)

```
app/Modules/Auth/
├── Domain/
│   ├── Aggregates/                    # (無聚合根，純功能)
│   ├── Exceptions/InvalidCredentials  # 認證異常
│   └── Services/AuthService           # Domain 服務
├── Application/
│   ├── Services/                      # LoginService, RegisterService
│   └── DTOs/                         # LoginDTO, TokenDTO
├── Infrastructure/
│   ├── Adapters/CredentialVerifier    # 密碼驗證 Adapter
│   ├── Services/JwtService            # JWT 生成
│   └── Providers/AuthServiceProvider  # 配置
└── Presentation/
    ├── Controllers/AuthController      # 認證端點
    ├── Routes/api.ts                  # POST /api/auth/*
    └── Routes/pages.ts                # GET /login, /register
```

**統計**: 11 個檔案 | **測試**: ✅ | **事件**: 無

**主要責任**:
- 使用者登入/註冊
- JWT 令牌生成與驗證
- 密碼安全驗證

---

### 3️⃣ Post 模組 (文章發佈)

```
app/Modules/Post/
├── Domain/
│   ├── Aggregates/Post.ts             # 聚合根
│   ├── ValueObjects/                  # Title, Content
│   ├── Events/                        # PostPublished, PostArchived
│   └── Repositories/IPostRepository
├── Application/
│   ├── Services/CreatePostService     # 發佈文章
│   ├── Queries/GetPostService         # CQRS 讀側
│   └── DTOs/PostDTO
├── Infrastructure/
│   ├── Persistence/PostRepository     # Atlas ORM
│   └── Providers/PostServiceProvider
└── Presentation/
    ├── Controllers/PostController
    └── Routes/
```

**統計**: 27 個檔案 | **測試**: ✅ | **事件**: 3 個

**主要責任**:
- 文章生命週期管理 (草稿→發佈→存檔)
- 標題唯一性保證
- 事件驅動: 發佈時觸發 PostPublished

---

### 4️⃣ Product 模組 (商品目錄)

```
app/Modules/Product/
├── Domain/
│   ├── Aggregates/Product.ts          # 商品聚合根
│   ├── ValueObjects/ProductId, Price
│   └── Repositories/IProductRepository
├── Application/
│   ├── Services/CreateProductService
│   ├── Queries/GetProductService      # 讀側最佳化
│   └── ReadModels/ProductReadModel
├── Infrastructure/
│   ├── Persistence/ProductRepository  # Atlas
│   ├── Services/ProductQueryService   # CQRS 實現
│   └── Providers/
└── Presentation/
    ├── Controllers/ProductController
    └── Routes/
```

**統計**: 24 個檔案 | **測試**: ✅ | **事件**: 1 個

**特色**:
- CQRS 讀側優化 (ProductReadModel)
- IProductQueryService 被 Cart 跨模組依賴

---

### 5️⃣ Cart 模組 (購物車)

```
app/Modules/Cart/
├── Domain/
│   ├── Aggregates/Cart.ts             # 聚合根
│   ├── Aggregates/CartItem.ts         # 值物件
│   ├── Events/ItemAdded, ItemRemoved
│   ├── Repositories/ICartRepository
│   └── Services/CartService           # 防腐層 (Product 查詢)
├── Application/
│   ├── Services/                      # AddItemService, CheckoutService
│   └── DTOs/
├── Infrastructure/
│   ├── Persistence/CartRepository
│   ├── Adapters/ProductCatalogAdapter # 防腐層實現
│   └── Providers/
└── Presentation/
    ├── Controllers/CartController
    └── Routes/
```

**統計**: 28 個檔案 | **測試**: ✅ | **事件**: 4 個

**核心模式**:
- **防腐層** (Anti-Corruption Layer): ProductCatalogAdapter 隔離 Product Context
- **跨模組依賴**: IProductQueryService
- **事件驅動**: CartCheckoutRequested → Order 模組監聽

---

### 6️⃣ Order 模組 (訂單)

```
app/Modules/Order/
├── Domain/
│   ├── Aggregates/Order.ts            # 訂單聚合根
│   ├── Aggregates/OrderLine.ts        # 訂單行項目
│   ├── ValueObjects/OrderStatus
│   ├── Events/OrderPlaced, OrderConfirmed
│   └── Repositories/IOrderRepository
├── Application/
│   ├── Services/PlaceOrderService
│   └── EventListeners/CartCheckoutRequestedListener
├── Infrastructure/
│   ├── Persistence/OrderRepository
│   └── Providers/OrderServiceProvider
└── Presentation/
    ├── Controllers/OrderController
    └── Routes/
```

**統計**: 21 個檔案 | **測試**: ✅ | **事件**: 3 個

**重點**:
- **事件監聽**: 監聽 CartCheckoutRequested，自動建立訂單
- **狀態機**: Pending → Confirmed → Shipped / Cancelled
- **自動支付啟動**: OrderPlaced → Payment 模組

---

### 7️⃣ Payment 模組 (支付)

```
app/Modules/Payment/
├── Domain/
│   ├── Aggregates/Payment.ts          # 支付聚合根
│   ├── ValueObjects/PaymentStatus     # Pending, Succeeded, Failed
│   ├── Events/PaymentSucceeded
│   └── Repositories/IPaymentRepository
├── Application/
│   ├── Services/InitiatePaymentService
│   ├── Queries/GetPaymentService
│   └── EventListeners/OrderPlacedListener
├── Infrastructure/
│   ├── Adapters/StripeAdapter         # 第三方支付整合
│   ├── Persistence/PaymentRepository
│   └── Providers/PaymentServiceProvider
└── Presentation/
    ├── Controllers/PaymentController
    └── Routes/
```

**統計**: 23 個檔案 | **測試**: ✅ | **事件**: 2 個

**特色**:
- **第三方整合**: StripeAdapter (支付網關)
- **事件監聽**: 監聽 OrderPlaced
- **支付流程**: 5 種支付方式 (Stripe, PayPal, etc)

---

### 8️⃣ Health 模組 (系統監控)

```
app/Modules/Health/
├── Domain/
│   ├── Aggregates/HealthCheck.ts
│   ├── ValueObjects/SystemChecks
│   ├── Services/HealthProbeService    # Domain 服務
│   ├── Events/HealthCheckPerformed
│   └── Repositories/IHealthRepository
├── Application/
│   ├── Services/PerformHealthCheckService
│   └── DTOs/HealthCheckDTO
├── Infrastructure/
│   ├── Adapters/HealthProbeAdapter    # 系統探測
│   ├── Persistence/HealthRepository
│   └── Providers/HealthServiceProvider
└── Presentation/
    ├── Controllers/HealthController
    └── Routes/
```

**統計**: 17 個檔案 | **測試**: ✅ | **事件**: 1 個

**用途**:
- 資料庫連線檢查
- Redis / Cache 可用性檢查
- 系統整體健康狀況報告

---

### 9️⃣ Session 模組 (會話)

```
app/Modules/Session/
├── Domain/
│   ├── Aggregates/Session.ts
│   ├── ValueObjects/SessionId
│   ├── Exceptions/InvalidCredentials
│   └── Repositories/ISessionRepository
├── Application/
│   ├── Services/ValidateSessionService
│   └── DTOs/
└── Infrastructure/
    ├── Persistence/SessionRepository
    └── Providers/SessionServiceProvider
```

**統計**: 15 個檔案 | **層級**: Application + Domain (無 Presentation)

**特色**:
- 無 Presentation 層 (由 Auth 模組公開)
- JWT 驗證與會話維護
- 被 Auth 跨模組依賴

---

### 🔟 Portal 模組 (入口)

```
app/Modules/Portal/
├── Application/
│   ├── Services/PortalService
│   └── DTOs/
└── Presentation/
    ├── Controllers/PortalController
    └── Routes/
```

**統計**: 6 個檔案 | **層級**: Application + Presentation

**用途**:
- 應用首頁與儀表板
- 無業務邏輯 (Domain 層)
- 聚合多個模組的資訊

---

## 🔗 模組依賴關係

### 跨模組依賴圖

```
Portal (入口)
├── 聚合 Product 資訊
├── 聚合 Cart 資訊
└── 聚合 User 資訊

Auth (認證)
├── 依賴 → User (用戶驗證)
├── 依賴 → Session (會話管理)
└── 提供 → JWT 令牌

Cart (購物車)
├── 防腐層 → Product (IProductQueryService)
└── 發佈 → CartCheckoutRequested

Order (訂單)
├── 監聽 ← Cart (CartCheckoutRequested)
└── 發佈 → OrderPlaced

Payment (支付)
├── 監聽 ← Order (OrderPlaced)
└── 發佈 → PaymentSucceeded

User (用戶)
├── 發佈 → UserCreated
└── 監聽本身 → 生成歡迎郵件

Post (文章)
├── 發佈 → PostPublished
└── 獨立模組

Health (監控)
└── 監控所有基礎設施

Session (會話)
└── 被 Auth 依賴
```

---

## 📈 模組成熟度評估

| 模組 | 測試 | 事件 | CQRS | 文檔 | 成熟度 |
|------|------|------|------|------|--------|
| User | ✅ | ✅ | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| Auth | ✅ | ❌ | ❌ | ✅ | ⭐⭐⭐⭐ |
| Post | ✅ | ✅ | ❌ | ✅ | ⭐⭐⭐⭐ |
| Product | ✅ | ✅ | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| Cart | ✅ | ✅ | ❌ | ✅ | ⭐⭐⭐⭐ |
| Order | ✅ | ✅ | ❌ | ✅ | ⭐⭐⭐⭐ |
| Payment | ✅ | ✅ | ❌ | ✅ | ⭐⭐⭐⭐ |
| Health | ✅ | ✅ | ❌ | ✅ | ⭐⭐⭐⭐ |
| Session | ✅ | ❌ | ❌ | ⚠️ | ⭐⭐⭐ |
| Portal | ❌ | ❌ | ❌ | ⚠️ | ⭐⭐⭐ |

---

## 🎯 最佳實踐總結

### ✅ 做得好

1. **清晰的分層** - 所有完整模組都遵循 DDD 四層架構
2. **事件驅動** - 跨模組通訊使用事件，解耦合
3. **防腐層設計** - Cart 使用 ProductCatalogAdapter 隔離依賴
4. **CQRS 應用** - User/Product 使用讀側最佳化
5. **自動裝配** - ModuleAutoWirer 系統完整

### ⚠️ 需改進

1. **Session 文檔** - 缺少詳細說明
2. **Portal 完整性** - 應補充 tests 目錄
3. **跨模組測試** - 缺少集成測試驗證事件鏈
4. **API 文檔** - 缺少 OpenAPI/Swagger 定義

---

## 📋 下一步行動

### Phase 1: 文檔完善
- [ ] 補充 Session 模組文檔
- [ ] 完善 Portal 模組說明
- [ ] 新增 API 規格文檔

### Phase 2: 代碼改進
- [ ] Session 模組添加測試
- [ ] Portal 模組補充測試
- [ ] 跨模組集成測試

### Phase 3: 新模組規劃
- [ ] 評估是否需要新增模組
- [ ] 設計模組間的協作模式

---

**相關文檔**:
- [MODULE_GENERATION_WITH_ADAPTERS.md](./MODULE_GENERATION_WITH_ADAPTERS.md) - 模組生成指南
- [SHOPPING_MODULES_GUIDE.md](./SHOPPING_MODULES_GUIDE.md) - 購物系統深度分析
- [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) - 開發工作流
- [../02-Architecture/CORE_DESIGN.md](../02-Architecture/CORE_DESIGN.md) - 架構核心原則

**最後更新**: 2026-03-14
