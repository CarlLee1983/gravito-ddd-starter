# 📦 生產就緒性路線圖

## 概述

Gravito DDD Starter 已是一個成熟的 DDD 架構框架，具備完整的資料庫抽象、ORM 切換、DI 容器、Health Check 等核心功能。

本文檔規劃如何**逐步補充生產級功能**，同時**保持簡潔、避免過度設計**。

---

## Phase 1：認證與授權系統（優先）⭐⭐⭐

### 為什麼優先？
- 幾乎每個業務模組都需要
- 直接影響 API 安全性
- 複雜度可控，符合 DDD

### 設計原則

採用 **基於角色的存取控制 (RBAC)** + **JWT Token**：

```
Shared/Domain/Auth/
├── ValueObjects/
│   ├── Permission.ts      # 權限值物件
│   ├── Role.ts           # 角色值物件
│   └── TokenPayload.ts   # Token 負載
├── Entities/
│   └── AuthToken.ts      # Token 實體（帶過期時間）
├── Repositories/
│   ├── IAuthTokenRepository.ts
│   └── IPermissionRepository.ts
└── Services/
    └── AuthorizationService.ts  # Domain Service（檢查權限）

Shared/Application/
├── AuthException.ts       # 認證/授權異常
├── JwtTokenService.ts     # Token 簽發和驗證
└── AuthMiddleware.ts      # 驗證中間件

User/Domain/
├── ValueObjects/
│   └── UserRole.ts       # 用戶角色（active/inactive/admin）
└── Services/
    └── AuthenticationService.ts  # Domain Service（簽發 Token）

User/Application/
└── Commands/
    ├── LoginCommand.ts
    └── LoginHandler.ts
```

### 實施步驟

1. **基礎類別** - Domain 層
   - Permission、Role ValueObjects
   - AuthToken Entity
   - IAuthTokenRepository、IPermissionRepository

2. **Service** - Application 層
   - `JwtTokenService`：簽發 + 驗證 Token
   - `AuthenticationService`：驗證用戶、簽發 Token

3. **Middleware** - Presentation 層
   - `AuthMiddleware`：檢查 JWT，注入用戶上下文
   - `AuthorizationMiddleware`：檢查權限

4. **Repository** - Infrastructure 層
   - `AuthTokenRepository`（Token 儲存）
   - `PermissionRepository`（權限查詢）

5. **API 端點** - User 模組
   - `POST /api/auth/login` - 登入
   - `POST /api/auth/logout` - 登出
   - `POST /api/auth/refresh` - Token 刷新

### 架構圖

```
POST /api/auth/login
    ↓
UserController.login()
    ↓
AuthenticationService.authenticate()
    ↓
User.verifyPassword() [Domain Service]
    ↓
JwtTokenService.sign() [生成 Token]
    ↓
AuthTokenRepository.save()
    ↓
Response: { access_token, refresh_token, expires_in }

↓（後續請求）

GET /api/users (Header: Authorization: Bearer token)
    ↓
AuthMiddleware.handle()
    ↓
JwtTokenService.verify()
    ↓
AuthorizationService.hasPermission() [檢查權限]
    ↓
if allowed → proceed
else → 403 Forbidden
```

### 文檔需求
- `AUTHENTICATION_GUIDE.md` - JWT 實現
- `RBAC_GUIDE.md` - 角色權限系統
- `SECURITY_CHECKLIST.md` - 安全檢查清單

---

## Phase 2：檔案管理系統（中等優先級）⭐⭐

### 為什麼需要？
- 大多數應用都需要上傳頭像、文件、圖片
- 可獨立為子系統
- 複雜度中等

### 設計原則

採用 **策略模式**，支援多個儲存後端：

```
File/Domain/
├── Entities/
│   └── File.ts           # File 聚合根（名稱、大小、MIME、路徑）
├── ValueObjects/
│   ├── FileExtension.ts  # 副檔名值物件
│   ├── FileSize.ts       # 檔案大小值物件（檢查限制）
│   └── FilePath.ts       # 路徑值物件
├── Repositories/
│   └── IFileRepository.ts  # 檔案記錄倉儲
└── Services/
    └── FileStorageService.ts  # Domain Service（驗證、生成路徑）

File/Infrastructure/
├── Storages/             # 儲存策略
│   ├── IFileStorage.ts   # 介面
│   ├── LocalFileStorage.ts  # 本地檔案系統
│   ├── S3FileStorage.ts  # AWS S3（未實作）
│   └── CloudinaryStorage.ts  # Cloudinary（未實作）
├── Repositories/
│   └── FileRepository.ts  # DB 記錄
└── Providers/
    └── FileServiceProvider.ts
```

### 實施步驟

1. **Domain 層**
   - File Aggregate（id、originalName、storagePath、size、mimeType）
   - FileExtension、FileSize ValueObjects
   - FileStorageService Domain Service

2. **Storage 策略**
   - `IFileStorage` 介面
   - `LocalFileStorage` 實現

3. **Repository**
   - 儲存檔案元資料到資料庫

4. **API 端點**
   - `POST /api/files/upload`
   - `GET /api/files/:id`
   - `DELETE /api/files/:id`

5. **ACL 防腐層**
   - 其他模組透過 Port 上傳檔案（不直接依賴 File 模組）

### 簡化版本（推薦）

如果要避免過度設計，可以簡化為：

```
Shared/Infrastructure/FileStorage/
├── IFileStorage.ts              # 單個介面
├── LocalFileStorage.ts          # 本地實現
└── FileUploadService.ts         # 應用服務

// 在 Controller 中：
async upload(ctx: IHttpContext) {
  const file = await ctx.getFormFile('file')
  const path = await fileUploadService.upload(file)
  return ctx.json({ success: true, path })
}
```

### 文檔需求
- `FILE_MANAGEMENT_GUIDE.md` - 檔案上傳和儲存

---

## Phase 3：郵件與通知系統（中等優先級）⭐⭐

### 為什麼需要？
- 用戶註冊確認、密碼重置需要郵件
- 系統警報、通知需要通知系統
- 可漸進式實施

### 設計原則

採用 **事件驅動 + Adapter 模式**：

```
Shared/Domain/Notification/
├── Events/
│   ├── UserRegisteredEvent.ts
│   ├── PasswordResetRequestedEvent.ts
│   └── SystemAlertEvent.ts
├── Repositories/
│   └── INotificationRepository.ts  # 記錄通知
└── ValueObjects/
    └── NotificationStatus.ts

Shared/Infrastructure/Notification/
├── Channels/                    # 通知渠道
│   ├── INotificationChannel.ts
│   ├── EmailChannel.ts          # SMTP
│   ├── SmsChannel.ts            # SMS API（未實作）
│   └── PushChannel.ts           # 推播（未實作）
├── Providers/
│   └── NotificationServiceProvider.ts
└── EventListeners/
    └── UserRegisteredListener.ts  # 事件監聽器
```

### 實施步驟

1. **Domain 層** - 定義通知事件
2. **Infrastructure 層** - 實現郵件渠道
3. **Event System** - 事件監聽和發佈
4. **簡化方式**：直接在 User Module 中處理

### 最簡版本

```typescript
// User/Application/Commands/RegisterUserHandler.ts
async handle(cmd: RegisterUserCommand): Promise<UserDTO> {
  // 建立用戶
  const user = User.create(...)
  await userRepository.save(user)

  // 發送驗證郵件
  await emailService.send({
    to: user.email,
    subject: 'Verify your email',
    template: 'verify-email',
    data: { token: generateToken() }
  })

  return UserDTO.fromEntity(user)
}
```

### 文檔需求
- `NOTIFICATION_SYSTEM_GUIDE.md` - 郵件和通知

---

## Phase 4：隊列與後台工作（低優先級）⭐

### 為什麼後實施？
- 初期可用同步方式替代
- 複雜度最高
- 需要完整的任務隊列系統

### 設計原則

採用 **Job Queue** + **Event System**：

```
Shared/Domain/Queue/
├── Entities/
│   └── Job.ts            # Job 實體（狀態、重試次數、錯誤訊息）
├── Repositories/
│   └── IJobRepository.ts
└── ValueObjects/
    └── JobStatus.ts      # pending/processing/completed/failed

Shared/Infrastructure/Queue/
├── IQueueDriver.ts
├── Drivers/
│   ├── MemoryQueueDriver.ts  # 開發用
│   ├── RedisQueueDriver.ts   # 生產用
│   └── DatabaseQueueDriver.ts # 備用
└── JobProcessor.ts       # 處理器
```

### 簡化方式

初期可使用 **Redis + Bull 隊列庫**：

```typescript
import Queue from 'bull'

const emailQueue = new Queue('emails', {
  redis: { host: '127.0.0.1', port: 6379 }
})

// 添加任務
await emailQueue.add(
  { email: 'user@example.com', subject: 'Welcome' },
  { delay: 5000 }
)

// 處理任務
emailQueue.process(async (job) => {
  await emailService.send(job.data)
})
```

### 文檔需求
- `QUEUE_SYSTEM_GUIDE.md` - 隊列實現

---

## Phase 5：日誌系統（低優先級）⭐

### 當前狀態
- 使用 `console.log`（可接受用於開發）
- Gravito 可能有內置日誌

### 建議方案

1. **簡化版** - 使用標準庫
```typescript
// Shared/Infrastructure/Logging/Logger.ts
export interface ILogger {
  info(message: string, context?: any): void
  warn(message: string, context?: any): void
  error(message: string, error?: Error, context?: any): void
  debug(message: string, context?: any): void
}
```

2. **進階版** - 集成 Pino 或 Winston
```bash
npm install pino
```

3. **不推薦**
- 不要過度工程化日誌系統
- 不要在每個函數中加日誌
- 只記錄重要事件（錯誤、警告、重要業務操作）

---

## Phase 6：API 文檔與監控（未來）⭐

### OpenAPI/Swagger 支援
- 根據註解自動生成文檔
- 不需要手動維護

### 監控與追蹤
- 可集成 DataDog、NewRelic 等
- 暫不在 MVP 範圍內

---

## 優先級表

| Phase | 功能 | 優先級 | 實施難度 | 估計工作量 |
|-------|------|--------|---------|-----------|
| 1 | 認證與授權 | ⭐⭐⭐ | 中等 | 1-2 週 |
| 2 | 檔案管理 | ⭐⭐ | 中等 | 3-4 天 |
| 3 | 郵件通知 | ⭐⭐ | 低 | 2-3 天 |
| 4 | 隊列系統 | ⭐ | 高 | 1 週 |
| 5 | 日誌系統 | ⭐ | 低 | 1 天 |
| 6 | API 文檔 | ⭐ | 低 | 1 天 |

---

## 實施指導原則

### ✅ 要做

1. **遵循 DDD 四層架構** - 每個功能都有 Domain/Application/Infrastructure
2. **使用 Port & Adapter** - 其他模組透過 Port 使用，不直接依賴
3. **寫測試** - 至少單元測試
4. **文檔優先** - 功能前寫文檔和示例
5. **漸進式添加** - 一次一個功能，確保穩定

### ❌ 不要做

1. **過度工程化** - 不要為未來功能預先設計
2. **違反 DDD** - 不要把業務邏輯放在 Infrastructure
3. **跳過 Repository** - 所有數據存取都要透過 Repository
4. **混用框架** - 不要同時用 Gravito + Express
5. **新增過多依賴** - 保持依賴最少化

---

## 快速檢查清單

在實施新功能前，檢查：

- [ ] 已閱讀 ARCHITECTURE.md
- [ ] 功能符合 DDD 四層架構
- [ ] Domain 層不依賴外部（除了值物件和聚合）
- [ ] Repository 介面在 Domain，實現在 Infrastructure
- [ ] 已定義 Port（如果跨模組使用）
- [ ] 已定義 DTO 和轉換規則
- [ ] 有 50%+ 測試覆蓋
- [ ] 文檔完整（至少 API 說明）

---

## 範例實施方案

### 認證系統實施時間表

```
Week 1: Domain 層 (Auth ValueObjects、Services)
Week 2: Infrastructure 層 (JWT、Token Repository)
Week 3: API 端點和測試
Week 4: 文檔和調整
```

### 檔案系統實施時間表

```
Day 1: Domain 層和 IFileStorage
Day 2: LocalFileStorage 實現
Day 3: API 端點
Day 4: 測試和文檔
```

---

## 相關資源

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 整體架構
- [DDD 指南](https://www.domainlanguage.com/ddd/)
- [CQRS 何時使用](./ARCHITECTURE_PATTERNS.md)
- [Gravito 官方文檔](https://gravito-framework.com)

---

**最後更新**：2026-03-11
**下一步**：確認優先級，開始 Phase 1（認證系統）實施
