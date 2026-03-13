# 適配器與基礎設施指南 (Adapter Guide)

## 概述

`app/Shared/Infrastructure/Adapters/` 層實現了完整的框架無關設計，將 Gravito 框架的具體實現與領域層/應用層解耦。

### 適配器責任

1. **Port Adaptation** — 將 Gravito 框架服務適配為框架無關的 Port（介面）。
2. **Dependency Composition** — 組裝所有依賴關係。
3. **Service Injection** — 透過建構函式將服務注入到應用層。
4. **Framework Isolation** — 確保框架耦合只存在於此層。

## 架構層次

```
┌─────────────────────────────────────┐
│  Presentation (Routes/Controllers)   │ ← IHttpContext, IModuleRouter
├─────────────────────────────────────┤
│  Application (Services/DTOs)         │ ← IRedisService, ICacheService, etc.
├─────────────────────────────────────┤
│  Domain (Entities/Services)          │ ← Pure Business Logic
├─────────────────────────────────────┤
│  Infrastructure (Repositories)       │ ← Repository Implementations
├─────────────────────────────────────┤
│  Adapters (Port Implementations)     │ ← GravitoDatabaseAdapter, etc.
│                                       │ ← ONLY layer that touches @gravito/*
├─────────────────────────────────────┤
│  Framework (Gravito Core)            │ ← PlanetCore, GravitoContext, etc.
└─────────────────────────────────────┘
```

## 框架無關的 Port 介面

所有 Port 定義皆位於 `app/Shared/Infrastructure/Ports/` 目錄下：

### 1. IDatabaseAccess — 資料庫操作
**位置**: `app/Shared/Infrastructure/Ports/Database/IDatabaseAccess.ts`
Repository 層透過此介面訪問資料庫，完全不依賴 ORM 具體語法。

### 2. IRedisService — Redis 操作
**位置**: `app/Shared/Infrastructure/Ports/Messaging/IRedisService.ts`
用於快取、Session 管理與消息隊列生產。

### 3. ILogger — 統一日誌介面
**位置**: `app/Shared/Infrastructure/Ports/Services/ILogger.ts`
系統內禁止使用 `console.log`，必須透過此適配器進行日誌記錄。

### 4. ITokenSigner — JWT 簽發與驗證
**位置**: `app/Shared/Infrastructure/Ports/Auth/ITokenSigner.ts`
Application 層透過此介面進行 Token 簽發與驗證，完全不依賴 `jose` 或其他 JWT 庫。

```typescript
export interface ITokenSigner {
  sign(payload: Record<string, unknown>): Promise<string>
  verify(token: string): Promise<Record<string, unknown> | null>
}
```

### 5. IInfrastructureProbe — 通用基礎設施探針
**位置**: `app/Modules/Health/Domain/Services/IInfrastructureProbe.ts`
Health 模組透過此介面探測各個基礎設施組件（Database、Redis、Cache 等），完全不知道具體技術棧。

```typescript
export interface IInfrastructureProbe {
  probeByName(name: string): Promise<boolean>
  getProbeableComponents(): string[]
}
```

---

## 適配器實現 (Adapters)

適配器位於 `app/Shared/Infrastructure/Adapters/` 或各模組的 `Infrastructure/Adapters/`，按來源技術分類：

### 1. Gravito 適配器
- **GravitoDatabaseAdapter**: 將 Atlas ORM 適配為 `IDatabaseAccess`。
- **GravitoRedisAdapter**: 將 Plasma Redis 適配為 `IRedisService`。
- **GravitoCacheAdapter**: 將 Stasis Cache 適配為 `ICacheService`。

### 2. 認證適配器
- **JoseTokenSigner** 位置: `app/Shared/Infrastructure/Adapters/Gravito/JoseTokenSigner.ts`
  - 將 `jose` 庫適配為 `ITokenSigner` Port
  - 支持 HS256 簽名和驗證
  - 可無縫替換為其他 JWT 庫實現

### 3. 健康檢查適配器
- **HealthProbeAdapter** 位置: `app/Modules/Health/Infrastructure/Adapters/HealthProbeAdapter.ts`
  - 將多個基礎設施服務適配為 `IInfrastructureProbe` Port
  - 動態註冊可用的探針（database、redis、cache 等）
  - 支持環境變數動態配置

### 4. 消息隊列適配器
- **RabbitMQAdapter**: 提供 AMQP 協議的實作。

---

## 最佳實踐

### ✅ DO
1. **依賴 Port (介面)** — 應用層應僅依賴 `IRedisService`，而非具體的 `RedisClientContract`。
2. **使用工廠生成器** — 優先使用 `createRepositoryFactory` 註冊倉庫（詳見 `SMART_FACTORY_OPTIMIZATION.md`）。
3. **Optional Services** — 基礎設施服務應考慮 `null` 情況（降級模式）。

### ❌ DON'T
1. **禁止向上依賴** — 適配器層禁止導入 Presentation 或 Application 層的具體類別。
2. **禁止洩露抽象** — 適配器必須完全封裝 Gravito 的 API，不應讓原生物件流向應用層。

最後更新: 2026-03-13
