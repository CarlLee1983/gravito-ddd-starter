# API 設計規範 (API Guidelines)

遵循 REST 最佳實踐的 API 設計標準。

## 目錄

- [URL 和路由](#url-和路由)
- [HTTP 方法](#http-方法)
- [請求格式](#請求格式)
- [響應格式](#響應格式)
- [狀態碼](#狀態碼)
- [錯誤處理](#錯誤處理)
- [分頁](#分頁)
- [過濾和排序](#過濾和排序)
- [版本管理](#版本管理)
- [安全性](#安全性)
- [代碼範例](#代碼範例)

---

## URL 和路由

### 命名規範

所有 API 路由應以 `/api` 開頭，後跟資源名稱。

```
/api/<resource>           # 列表和創建
/api/<resource>/<id>      # 獲取、更新、刪除
/api/<resource>/<id>/<sub-resource>  # 子資源
```

### 資源名稱

使用 **複數的小寫名稱**，用連字符連接多個單詞：

```
✅ 正確
/api/users
/api/user-profiles
/api/product-categories
/api/payment-transactions

❌ 錯誤
/api/User
/api/user_profile
/api/UserProfile
/api/getUsers
```

### 完整 URL 範例

```
GET    /api/users                      # 列表所有用戶
POST   /api/users                      # 創建用戶
GET    /api/users/123                  # 獲取特定用戶
PATCH  /api/users/123                  # 更新用戶
DELETE /api/users/123                  # 刪除用戶
GET    /api/users/123/orders           # 用戶的訂單
POST   /api/users/123/orders           # 為用戶創建訂單
GET    /api/users/123/orders/456       # 特定用戶的特定訂單
```

---

## HTTP 方法

### 方法對應表

| 方法 | 用途 | 冪等性 | 安全 | 示例 |
|------|------|--------|------|------|
| GET | 檢索資源 | ✅ | ✅ | GET /api/users/123 |
| POST | 創建新資源 | ❌ | ❌ | POST /api/users |
| PATCH | 部分更新 | ❌ | ❌ | PATCH /api/users/123 |
| PUT | 完全替換 (不推薦) | ✅ | ❌ | PUT /api/users/123 |
| DELETE | 刪除資源 | ✅ | ❌ | DELETE /api/users/123 |
| HEAD | 如 GET，但無響應體 | ✅ | ✅ | HEAD /api/users |
| OPTIONS | 獲取允許的方法 | ✅ | ✅ | OPTIONS /api/users |

### 方法選擇指南

#### GET - 檢索

```
用途: 獲取單個資源或列表
特點: 冪等、安全、可緩存
範例:
  GET /api/users/123          # 獲取用戶
  GET /api/users?status=active # 列表並過濾
```

#### POST - 創建

```
用途: 創建新資源或執行動作
特點: 非冪等、不安全
規則:
  - 應返回 201 Created
  - 應在 Location 頭中返回新資源的 URL
  - 應返回創建的資源
範例:
  POST /api/users              # 創建用戶
  POST /api/users/123/verify  # 執行動作 (動詞可用於特殊動作)
```

#### PATCH - 部分更新

```
用途: 更新資源的某些字段
特點: 通常非冪等、不安全
規則:
  - 只更新提供的字段
  - 未提供的字段保持不變
  - 應返回 200 OK 或 204 No Content
範例:
  PATCH /api/users/123        # 更新用戶的部分字段
  Content-Type: application/json
  {
    "email": "new@example.com"
  }
```

#### DELETE - 刪除

```
用途: 刪除資源
特點: 冪等、不安全
規則:
  - 應返回 204 No Content (無響應體)
  - 或返回 200 OK 和成功訊息
  - 第二次刪除同一資源應返回 404
範例:
  DELETE /api/users/123       # 刪除用戶
```

---

## 請求格式

### 內容類型

所有請求應使用 JSON:

```
Content-Type: application/json
```

### 請求體 - 創建資源

```json
POST /api/users
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "status": "active"
}
```

### 請求體 - 更新資源

```json
PATCH /api/users/123
Content-Type: application/json

{
  "email": "newemail@example.com"
}
```

### 查詢參數

```
GET /api/users?status=active&sort=-created_at&limit=10&page=2

查詢參數:
- status: 過濾參數
- sort: 排序 (- 表示降序)
- limit: 分頁大小
- page: 頁碼
```

### 命名規範

- **路徑參數**: 小寫，用連字符分隔
  ```
  /api/users/{user-id}
  /api/orders/{order-id}
  ```

- **查詢參數**: 駝峰式或小寫
  ```
  ?createdAfter=2024-01-01
  ?created_after=2024-01-01
  (保持一致)
  ```

- **JSON 鍵**: 駝峰式 (JavaScript 慣例)
  ```json
  {
    "userId": "123",
    "userName": "John",
    "createdAt": "2024-03-10T10:30:00Z"
  }
  ```

---

## 響應格式

### 成功響應

所有成功響應應遵循統一格式:

```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "John Doe",
    "email": "john@example.com",
    "status": "active",
    "createdAt": "2024-03-10T10:30:00Z",
    "updatedAt": "2024-03-10T10:30:00Z"
  }
}
```

### 列表響應

```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "User 1",
      "email": "user1@example.com"
    },
    {
      "id": "2",
      "name": "User 2",
      "email": "user2@example.com"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 2,
    "totalPages": 50
  }
}
```

### 分頁元數據

```json
"meta": {
  "total": 1000,        // 總記錄數
  "page": 1,            // 當前頁
  "pageSize": 20,       // 每頁大小
  "totalPages": 50,     // 總頁數
  "hasNext": true,      // 是否有下一頁
  "hasPrev": false      // 是否有上一頁
}
```

### 日期格式

使用 ISO 8601 格式:

```json
{
  "createdAt": "2024-03-10T10:30:00Z",
  "updatedAt": "2024-03-10T10:30:00Z",
  "deletedAt": "2024-03-10T11:45:00Z"
}
```

### 空響應

```json
{
  "success": true,
  "data": null
}
```

---

## 狀態碼

### 成功 (2xx)

```
200 OK              # 一般成功響應，有響應體
201 Created         # 資源創建成功，應包含 Location 頭
204 No Content      # 成功，但無響應體 (DELETE, PATCH)
```

**使用範例**:

```typescript
// 201 Created
async create(ctx: any) {
  const user = await service.create(body)
  return ctx.json({ success: true, data: user }, { status: 201 })
}

// 204 No Content
async delete(ctx: any) {
  await service.delete(id)
  return ctx.json(null, { status: 204 })
}
```

### 客戶端錯誤 (4xx)

```
400 Bad Request           # 請求格式或內容錯誤
401 Unauthorized          # 缺少身份驗證
403 Forbidden             # 沒有權限
404 Not Found             # 資源不存在
409 Conflict              # 衝突 (如重複資源)
422 Unprocessable Entity  # 驗證失敗
429 Too Many Requests     # 速率限制
```

**使用範例**:

```typescript
// 400 Bad Request
if (!body.name) {
  return ctx.json(
    { success: false, error: 'Missing required field: name' },
    { status: 400 }
  )
}

// 404 Not Found
const user = await repository.findById(id)
if (!user) {
  return ctx.json(
    { success: false, error: 'User not found' },
    { status: 404 }
  )
}

// 422 Unprocessable Entity
try {
  const email = new Email(body.email)  // 驗證失敗
} catch (error) {
  return ctx.json(
    { success: false, error: 'Invalid email format' },
    { status: 422 }
  )
}
```

### 伺服器錯誤 (5xx)

```
500 Internal Server Error  # 未預期的伺服器錯誤
503 Service Unavailable    # 服務臨時不可用 (維護等)
```

**使用範例**:

```typescript
// 500 Internal Server Error
try {
  await riskyOperation()
} catch (error) {
  console.error('Unexpected error:', error)
  return ctx.json(
    { success: false, error: 'Internal server error' },
    { status: 500 }
  )
}
```

---

## 錯誤處理

### 錯誤響應格式

```json
{
  "success": false,
  "error": "User not found",
  "code": "USER_NOT_FOUND",
  "details": {
    "userId": "123",
    "context": "Additional debugging info"
  }
}
```

### 常見錯誤代碼

```
// 驗證錯誤
INVALID_INPUT
MISSING_REQUIRED_FIELD
INVALID_EMAIL_FORMAT

// 資源錯誤
RESOURCE_NOT_FOUND
RESOURCE_ALREADY_EXISTS
RESOURCE_IN_USE

// 業務邏輯錯誤
INSUFFICIENT_PERMISSIONS
INVALID_STATUS_TRANSITION
INSUFFICIENT_FUNDS

// 系統錯誤
INTERNAL_SERVER_ERROR
SERVICE_UNAVAILABLE
DATABASE_CONNECTION_ERROR
```

### 錯誤處理控制器

```typescript
export class BaseController {
  protected handleError(ctx: any, error: any) {
    console.error('Error:', error)

    // 應用異常
    if (error instanceof AppException) {
      return ctx.json(
        {
          success: false,
          error: error.message,
          code: error.code || 'APP_ERROR'
        },
        { status: error.statusCode || 400 }
      )
    }

    // 驗證錯誤
    if (error.name === 'ValidationError') {
      return ctx.json(
        {
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors
        },
        { status: 422 }
      )
    }

    // 未知錯誤
    return ctx.json(
      {
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}
```

---

## 分頁

### 查詢參數

```
GET /api/users?page=2&limit=20

參數:
- page: 頁碼 (預設: 1)
- limit: 每頁記錄數 (預設: 20, 最大: 100)
```

### 響應

```json
{
  "success": true,
  "data": [ /* 20 條記錄 */ ],
  "meta": {
    "total": 500,
    "page": 2,
    "pageSize": 20,
    "totalPages": 25,
    "hasNext": true,
    "hasPrev": true
  }
}
```

### 實現範例

```typescript
export class ListUsersService {
  async execute(page: number = 1, limit: number = 20) {
    // 驗證
    if (page < 1) page = 1
    if (limit < 1 || limit > 100) limit = 20

    // 計算偏移
    const offset = (page - 1) * limit

    // 查詢
    const [data, total] = await Promise.all([
      this.repository.find({ offset, limit }),
      this.repository.count()
    ])

    // 返回
    return {
      data: data.map(e => UserDTO.fromEntity(e)),
      meta: {
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    }
  }
}
```

---

## 過濾和排序

### 過濾查詢

```
GET /api/users?status=active&role=admin&createdAfter=2024-01-01

支援的操作:
- 相等: ?status=active
- 範圍: ?createdAfter=2024-01-01&createdBefore=2024-03-10
- 包含: ?tags=js,typescript
- 不相等: ?status!=inactive (可選)
```

### 排序查詢

```
GET /api/users?sort=name,-createdAt

規則:
- sort 參數包含字段名稱
- '-' 前綴表示降序
- 多個字段用逗號分隔
- 預設: 升序
```

### 實現範例

```typescript
interface QueryFilters {
  status?: string
  role?: string
  createdAfter?: string
  createdBefore?: string
  sort?: string
  page?: number
  limit?: number
}

export class ListUsersService {
  async execute(filters: QueryFilters) {
    let query = this.repository.query()

    // 應用過濾
    if (filters.status) {
      query = query.where('status', filters.status)
    }
    if (filters.role) {
      query = query.where('role', filters.role)
    }
    if (filters.createdAfter) {
      query = query.where('created_at', '>=', filters.createdAfter)
    }
    if (filters.createdBefore) {
      query = query.where('created_at', '<=', filters.createdBefore)
    }

    // 應用排序
    if (filters.sort) {
      const parts = filters.sort.split(',')
      for (const part of parts) {
        if (part.startsWith('-')) {
          query = query.orderBy(part.substring(1), 'desc')
        } else {
          query = query.orderBy(part, 'asc')
        }
      }
    }

    // 應用分頁
    const limit = Math.min(filters.limit || 20, 100)
    const page = Math.max(filters.page || 1, 1)
    const offset = (page - 1) * limit

    const data = await query.offset(offset).limit(limit).select()
    const total = await this.repository.count()

    return {
      data,
      meta: {
        total,
        page,
        pageSize: limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  }
}
```

---

## 版本管理

### URL 版本化 (推薦)

```
/api/v1/users           # 版本 1
/api/v2/users           # 版本 2
```

### 頭部版本化 (可選)

```
GET /api/users
Accept-Version: 1
```

### 何時升版

- ✅ 添加新端點
- ✅ 添加可選參數
- ✅ 添加響應字段
- ❌ 刪除端點 (用廢棄)
- ❌ 更改現有字段的含義
- ❌ 更改響應格式

### 廢棄流程

```
1. 標記為廢棄 (新版本中)
   GET /api/users
   Deprecation: true

2. 提供遷移指南
   Documentation updated

3. 6 個月後移除
   端點完全刪除
```

---

## 安全性

### 速率限制

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1615000000
```

**實現**:

```typescript
// 中間件
app.use(rateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 100,                  // 每個 IP 最多 100 個請求
  message: 'Too many requests, please try again later'
}))
```

### 驗證和授權

所有需要身份驗證的端點應要求 Bearer token:

```
GET /api/users
Authorization: Bearer <jwt-token>
```

### CORS

配置允許的來源:

```typescript
app.use(cors({
  origin: ['http://localhost:3000', 'https://example.com'],
  credentials: true
}))
```

### 輸入驗證

始終驗證和淨化用戶輸入:

```typescript
import { z } from 'zod'

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  status: z.enum(['active', 'inactive'])
})

const validated = createUserSchema.parse(body)
```

---

## 代碼範例

### 完整的 CRUD 端點

```typescript
import type { PlanetCore } from '@gravito/core'
import { UserController } from '../Controllers/UserController'

export async function registerUserRoutes(core: PlanetCore) {
  const controller = new UserController(core)

  // 列表
  core.router.get('/api/users', async (ctx) => {
    const page = parseInt(ctx.req.query.page || '1')
    const limit = parseInt(ctx.req.query.limit || '20')
    const status = ctx.req.query.status

    const result = await controller.list(ctx, { page, limit, status })
    return ctx.json(result)
  })

  // 創建
  core.router.post('/api/users', async (ctx) => {
    try {
      const body = await ctx.req.json()
      const result = await controller.create(ctx, body)
      return ctx.json(result, { status: 201 })
    } catch (error: any) {
      return ctx.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }
  })

  // 獲取
  core.router.get('/api/users/:id', async (ctx) => {
    const result = await controller.show(ctx, ctx.req.param('id'))
    if (!result) {
      return ctx.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }
    return ctx.json(result)
  })

  // 更新
  core.router.patch('/api/users/:id', async (ctx) => {
    try {
      const body = await ctx.req.json()
      const result = await controller.update(ctx, ctx.req.param('id'), body)
      return ctx.json(result)
    } catch (error: any) {
      return ctx.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }
  })

  // 刪除
  core.router.delete('/api/users/:id', async (ctx) => {
    await controller.delete(ctx, ctx.req.param('id'))
    return ctx.json(null, { status: 204 })
  })
}
```

### 控制器實現

```typescript
export class UserController {
  constructor(private core: PlanetCore) {}

  async list(ctx: any, filters: { page: number; limit: number; status?: string }) {
    const service = new ListUsersService(this.core)
    const { data, meta } = await service.execute(filters)

    return {
      success: true,
      data,
      meta
    }
  }

  async create(ctx: any, body: any) {
    const service = new CreateUserService(this.core)
    const user = await service.execute(body)

    return {
      success: true,
      data: user
    }
  }

  async show(ctx: any, id: string) {
    const repository = new UserRepository(this.core.get('db'))
    const user = await repository.findById(id)

    if (!user) return null

    return {
      success: true,
      data: UserDTO.fromEntity(user)
    }
  }

  async update(ctx: any, id: string, body: any) {
    const service = new UpdateUserService(this.core)
    const user = await service.execute(id, body)

    return {
      success: true,
      data: user
    }
  }

  async delete(ctx: any, id: string) {
    const repository = new UserRepository(this.core.get('db'))
    await repository.delete(id)
  }
}
```

---

## 相關文檔

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 系統架構
- [MODULE_GUIDE.md](./MODULE_GUIDE.md) - 模組創建
- [SETUP.md](./SETUP.md) - 環境設置

---

**遵循這些指南，你的 API 會更一致、更易使用、更易維護。**
