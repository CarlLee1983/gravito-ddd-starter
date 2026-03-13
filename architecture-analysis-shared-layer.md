# gravito-ddd 架構審查報告 - Shared 層設計缺陷

## 執行摘要

**架構違規等級**: **CRITICAL** ⚠️
**影響範圍**: 模組耦合 + 可替換性 + DDD 設計原則
**優先級**: **P1**（應立即修復）

---

## 評估結果

### 問題概述

`AuthorDTO` 位於 `app/Shared/Application/DTOs/AuthorDTO.ts`，被 Post 模組的 `PostWithAuthorDTO` 所導入使用。這個設計違反了 DDD 的核心原則，造成了以下關鍵問題：

1. **模組間不必要的耦合** - Post 模組直接依賴 User 領域的 DTO
2. **Bounded Context 邊界污染** - Shared 層成為域模型洩露的地方
3. **可替換性風險** - User 模組的任何變更都會直接影響 Post 模組
4. **違反倒依賴原則** - Post 應該定義自己的契約，而不依賴 User 的實現

---

## 詳細分析

### 1. 問題根源

#### AuthorDTO 為何不應在 Shared 層

**原文註釋聲稱**:
> 「多個網域（Post、Review、Order 等）都可能需要作者資訊。統一定義作者的數據結構，避免重複實作。」

**這個假設是錯誤的**：

```typescript
// ❌ 現狀（錯誤）
app/Shared/Application/DTOs/AuthorDTO.ts
  ├─ id: string
  ├─ name: string
  └─ email: string

// Post 模組強依賴
app/Modules/Post/Application/DTOs/PostWithAuthorDTO.ts
  import type { AuthorDTO } from '@/Shared/Application/DTOs/AuthorDTO'
```

**問題**:
1. `AuthorDTO` 是 User 領域的概念，不是「跨域共享」的東西
2. Post、Review、Order 各自對「作者」的認知可能不同
   - Post 只需要 `{ id, name, email }`
   - Review 可能需要 `{ id, name, rating_count, verified }`
   - Order 可能需要 `{ id, company_name, tax_id }`
3. 將 User 的 DTO 放在 Shared，實質上讓所有模組都依賴 User 模組的業務邏輯

---

### 2. DDD 角度的評估

#### Bounded Context 原則違反

DDD 的核心概念是 **Bounded Context**（限界上下文）：

```
┌─── User Bounded Context ────────────┐
│  Domain:                            │
│  - User (聚合根)                    │
│  - UserDTO (User 的應用層表示)      │
│  - Email, UserName (ValueObjects)   │
└─────────────────────────────────────┘
         ↑
         │ (Post 不應直接依賴)
         │
┌─── Post Bounded Context ────────────┐
│  Domain:                            │
│  - Post (聚合根)                    │
│  - AuthorInfo (ValueObject - ✅)    │
│  - IAuthorService (Port - ✅)       │
│  - PostWithAuthorDTO ❌             │
│    (不應導入 User 的 AuthorDTO)     │
└─────────────────────────────────────┘
```

#### 正確的跨界線通訊模式

gravito-ddd 已經實現了正確的跨 Bounded Context 設計：

```typescript
// ✅ 正確: Post 定義自己的 Port（介面）
// app/Modules/Post/Domain/Services/IAuthorService.ts
export interface IAuthorService {
  findAuthor(authorId: string): Promise<AuthorInfo | null>
}

// ✅ 正確: AuthorInfo 是 Post 的 ValueObject（值物件）
// app/Modules/Post/Domain/ValueObjects/AuthorInfo.ts
export class AuthorInfo {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string,
  ) {}
}

// ❌ 錯誤: PostWithAuthorDTO 不應導入 User 的 AuthorDTO
// app/Modules/Post/Application/DTOs/PostWithAuthorDTO.ts
import type { AuthorDTO } from '@/Shared/Application/DTOs/AuthorDTO'  // ← 違規
export interface PostWithAuthorDTO extends PostDTO {
  author: AuthorDTO | null  // ← 應該用 Post 自己定義的結構
}
```

#### AuthorDTO 與 AuthorInfo 的重複

現狀存在**概念重複**：

| 檔案 | 層級 | 目的 | 問題 |
|------|------|------|------|
| `Post/Domain/ValueObjects/AuthorInfo` | Domain | 跨界線 Port 契約 | ✅ 正確 |
| `Shared/Application/DTOs/AuthorDTO` | Shared | 「通用」DTO | ❌ 不必要 |
| `User/Application/DTOs/UserDTO` | User | User 領域 DTO | ✅ 正確 |

**AuthorDTO 實際上是 User 領域的 DTO 穿著 Shared 的外套**。

---

### 3. gravito-ddd 架構規則違反

根據專案 CLAUDE.md 的核心規則：

#### 違反規則 1: Module 內部禁止直接依賴特定 ORM

CLAUDE.md 明確指出：
> ❌ Module 內部禁止直接依賴特定 ORM（如 `import '@gravito/atlas'`）

**推論**: 模組也不應直接依賴其他模組的具體表示（DTO）

**違規情況**:
```typescript
// Post 模組直接依賴 User 模組的 AuthorDTO
import type { AuthorDTO } from '@/Shared/Application/DTOs/AuthorDTO'
//        └─ 實質上是 User 的東西，卻放在 Shared
```

#### 違反規則 2: 倒依賴原則

**正確的倒依賴**:
```
Post Domain → Port (IAuthorService, AuthorInfo)
     ↑                  ↓
     └── Infrastructure ACL ← User Repository
```

**當前錯誤的依賴**:
```
Post Domain → Post Application
     ↓
Post Application → Shared (AuthorDTO)
     ↓
AuthorDTO ← User's structure
```

Post 應該完全不知道 User 模組的 DTO，只知道自己定義的 `AuthorInfo` ValueObject。

---

### 4. 真實影響場景

#### 場景 1: User 模組重構（ORM 切換）

```
當前狀況: Atlas → Drizzle 遷移

Timeline:
1. User 模組改用 Drizzle adapter
2. UserDTO 的內部序列化邏輯可能改變
3. AuthorDTO 無法保持向後相容
4. ❌ Post 模組無法預期的破壞性變更

危害程度: 多個模組同時故障
```

#### 場景 2: User DTO 欄位變更

```
需求: User 需要添加 "avatar_url" 欄位

Timeline:
1. User 模組更新: UserDTO { id, name, email, avatar_url }
2. Shared 層 AuthorDTO 需要跟著改？還是不改？
3. 如果改了: Post 模組突然收到 avatar_url（非預期）
4. 如果不改: AuthorDTO 與 UserDTO 不同步（分裂）

結果: 多個模組的數據一致性問題
```

#### 場景 3: 新增第三個模組（Review）

```
假設要添加 Review 模組，也需要作者資訊

選項 1: 也使用 AuthorDTO（推廣 Shared 層污染）
選項 2: 重新定義自己的 ReviewAuthorDTO（重複代碼）
選項 3: 使用 User 的 UserDTO（模組間強耦合）

都是壞的選擇，原因根源在於 AuthorDTO 在 Shared 層
```

---

### 5. 推薦重構方案

### 方案 A: 移動 AuthorDTO 到 User 模組（推薦）

```typescript
// 移動目標:
// FROM: app/Shared/Application/DTOs/AuthorDTO.ts
// TO:   app/Modules/User/Application/DTOs/AuthorDTO.ts

// app/Modules/User/Application/DTOs/AuthorDTO.ts
export interface AuthorDTO {
  id: string
  name: string
  email: string
}

// app/Modules/User/index.ts (導出)
export type { AuthorDTO } from './Application/DTOs/AuthorDTO'

// app/Modules/Post/Application/DTOs/PostWithAuthorDTO.ts
import type { AuthorDTO } from '@/Modules/User'  // ✅ 正確的導入路徑
export interface PostWithAuthorDTO extends PostDTO {
  author: AuthorDTO | null
}
```

**優點**:
- ✅ AuthorDTO 回歸 User 領域所有權
- ✅ 明確的依賴關係：Post → User
- ✅ AuthorDTO 變更時，責任在 User 模組
- ✅ 遵循 DDD 原則

**缺點**:
- Post 直接依賴 User（但這是正當的，因為 Post 確實需要 User 資訊）

---

### 方案 B: Post 定義自己的 DTO，轉換層負責映射（推薦備選）

```typescript
// app/Modules/Post/Application/DTOs/PostWithAuthorDTO.ts
// （完全不依賴 AuthorDTO）
export interface PostWithAuthorDTO extends PostDTO {
  author: {  // ✅ Post 自己定義
    id: string
    name: string
    email: string
  } | null
}

// OR 定義值物件
export interface AuthorForPostDTO {
  id: string
  name: string
  email: string
}

export interface PostWithAuthorDTO extends PostDTO {
  author: AuthorForPostDTO | null
}

// 在 GetPostService 中進行映射
export class GetPostService implements IPostQueryService {
  private async toReadModel(dto: PostDTO): Promise<PostReadModel> {
    // ... 查詢作者資訊（通過 IAuthorService）
    const author = await this.authorService.findAuthor(dto.authorId)

    // ✅ 映射: AuthorInfo (Domain) → AuthorForPostDTO (Application)
    return {
      id: dto.id,
      author: author ? {
        id: author.id,
        name: author.name,
        email: author.email
      } : null
    }
  }
}
```

**優點**:
- ✅ Post 完全獨立，不依賴 User DTO
- ✅ 若干模組都可以定義自己的「作者」結構
- ✅ Shared 層保持純淨
- ✅ 明確的轉換責任

**缺點**:
- 需要在 GetPostService 中進行映射邏輯

---

### 方案 C: 使用專門的 Port 和 ACL (最正式但複雜)

```typescript
// app/Modules/Post/Infrastructure/ACL/UserAuthorAdapter.ts
// （Anti-Corruption Layer）

import type { AuthorDTO as UserAuthorDTO } from '@/Modules/User'
import type { AuthorForPostDTO } from '../../Application/DTOs/PostWithAuthorDTO'

/**
 * 防腐層: 轉換 User 模組的 AuthorDTO 到 Post 的視圖
 * 這樣 Post 就不直接依賴 User 的 DTO
 */
export class UserAuthorAdapter {
  static toPostDTO(userAuthor: UserAuthorDTO): AuthorForPostDTO {
    return {
      id: userAuthor.id,
      name: userAuthor.name,
      email: userAuthor.email,
      // 若未來 User 添加字段，ACL 決定是否映射
    }
  }
}
```

**優點**:
- ✅ 最高的模組獨立性
- ✅ 若 User DTO 變更，ACL 吸收變化
- ✅ 符合 DDD 防腐層模式

**缺點**:
- 最複雜，小型項目可能過度工程化

---

### 推薦方案排序

1. **第一選擇**: 方案 A（移動 AuthorDTO 到 User）
   - 簡單直接，符合現實依賴
   - 當 Post 確實需要 User 的資訊時，直接依賴是合理的

2. **第二選擇**: 方案 B（Post 定義自己的 DTO）
   - 若未來 Review、Order 等模組有不同的「作者」概念
   - 提供最大的靈活性

3. **第三選擇**: 方案 C（ACL 防腐層）
   - 企業級應用的最佳實踐
   - 需要高度的模組獨立性時使用

---

### 6. 相關的其他 Shared 層問題

檢查 Shared 層的其他 80 個檔案，發現的設計問題：

#### ✅ 正確的 Shared 層設計

以下檔案應該在 Shared 層（正確）：

```
Shared/Domain/
├── AggregateRoot.ts          ✅ 所有模組的基類
├── BaseEntity.ts             ✅ 所有模組的基類
├── ValueObject.ts            ✅ 所有模組的基類
├── DomainEvent.ts            ✅ 領域事件基類
├── IntegrationEvent.ts       ✅ 整合事件基類
├── Exceptions/
│   ├── DomainException.ts    ✅ 所有模組的異常基類
│   ├── ValidationException.ts ✅ 通用驗證異常
│   └── ...                   ✅ 其他基礎異常

Shared/Application/
├── BaseDTO.ts               ✅ DTO 基類
├── IQuerySide.ts            ✅ CQRS 讀側介面
├── Jobs/                    ✅ 工作隊列系統（跨模組）
└── OptimisticLockException.ts ✅ 併發控制

Shared/Infrastructure/
├── IDatabaseAccess.ts       ✅ ORM 無關的數據庫介面
├── IEventDispatcher.ts      ✅ 事件發送者（跨模組）
├── IEventStore.ts           ✅ 事件存儲（跨模組）
├── IRedisService.ts         ✅ Redis 服務介面
├── ICacheService.ts         ✅ 快取服務介面
├── IJobQueue.ts             ✅ 工作隊列介面
├── Repositories/            ✅ Repository 基類
├── Database/                ✅ ORM 適配層
└── Framework/               ✅ Framework 集成層
```

#### ⚠️ 有問題的 Shared 層設計

| 檔案 | 位置 | 問題 | 等級 |
|------|------|------|------|
| AuthorDTO | `Shared/Application/DTOs/` | ❌ User 領域的 DTO，不應在 Shared | **CRITICAL** |

**檢查結論**:
- AuthorDTO 是唯一的明顯違規
- 其餘 Shared 層設計都符合規範
- 主要責任是將 AuthorDTO 移出 Shared 層

---

## 實施計畫

### 第一步: 選擇重構方案

建議採用 **方案 A（移動到 User 模組）**：

```bash
1. 移動檔案
   FROM: app/Shared/Application/DTOs/AuthorDTO.ts
   TO:   app/Modules/User/Application/DTOs/AuthorDTO.ts

2. 更新 User 模組導出
   app/Modules/User/index.ts
   export type { AuthorDTO } from './Application/DTOs/AuthorDTO'

3. 更新 Post 模組導入
   FROM: import type { AuthorDTO } from '@/Shared/Application/DTOs/AuthorDTO'
   TO:   import type { AuthorDTO } from '@/Modules/User'

4. 刪除 Shared 層的舊檔案
   rm app/Shared/Application/DTOs/AuthorDTO.ts
   rm app/Shared/Application/DTOs/ (如果資料夾空了)

5. 更新測試引入路徑
```

### 第二步: 驗證變更

```bash
# 運行所有測試
bun test

# 檢查型別
bun run typecheck

# 檢查無引用的舊路徑
grep -r "Shared/Application/DTOs/AuthorDTO" app/
grep -r "@/Shared.*AuthorDTO" app/
```

### 第三步: 文檔更新

- 更新 `docs/02-Architecture/` 相關文檔，說明：
  - Bounded Context 邊界的清晰定義
  - 跨模組通訊的正確模式
  - Shared 層應包含/排除什麼

---

## 相關的最佳實踐建議

### 1. Shared 層的清晰指南

**Shared 層應包含**:
- ✅ 所有模組的基類（Entity, AggregateRoot, ValueObject）
- ✅ 跨模組的基礎異常
- ✅ ORM 無關的基礎設施介面
- ✅ 工作隊列、事件發佈等系統級服務
- ✅ 常用的轉換工具

**Shared 層不應包含**:
- ❌ 任何模組特定的 DTO、Entity 或 ValueObject
- ❌ 某個模組的領域概念
- ❌ 模組特定的例外
- ❌ 模組特定的應用服務

### 2. 跨 Bounded Context 通訊模式

**正確的模式**:
```
Module A (需要 Module B 的資訊)
  ├─ Domain/Services/IModuleBService (Port)
  ├─ Domain/ValueObjects/ModuleBAggregateInfo (Domain VO)
  └─ Infrastructure/ACL/ModuleBAdapter (防腐層)
        ↓
     Module B 的 Repository/DTO
```

**禁止的模式**:
```
Module A 直接導入 Module B 的 DTO (❌)
Module A 的型別依賴 Module B 的 Domain 類 (❌)
Module A 和 Module B 共享 Shared DTO (❌)
```

### 3. 未來相似問題的預防

建議在 PR review 時檢查：

```typescript
// ❌ 模式檢測: 模組間 DTO 導入
// 搜索所有 @Modules/X 的導入 (除了 tests/)
grep -r "from '@/Modules/[^/]*/.*DTO" app/Modules --exclude-dir=tests

// 如果發現，需要確認:
// 1. 是否創建了 Port (IService)?
// 2. 是否需要 ACL 防腐層?
// 3. 是否應該在 Shared 定義?
```

---

## 結論

### 核心結論

**AuthorDTO 在 Shared 層是一個明確的架構違規**，必須立即修正。

**根本原因**:
- AuthorDTO 是 User 模組的領域概念，不是真正的「跨模組共享」
- 將其放在 Shared，造成了 Post 對 User 的無謂耦合
- 違反了 DDD 的 Bounded Context 原則

**推薦解決方案**:
1. **方案 A（移動到 User）** - 最簡單，適合當前架構
2. 若需要 Post 完全獨立，使用 **方案 B（自定義 DTO）**

**影響評估**:
- 修正難度: 中等（檔案移動 + 導入路徑更新）
- 風險等級: 低（架構層面，邏輯不變）
- 實施時間: 1-2 小時

**長期收益**:
- ✅ 清晰的模組邊界
- ✅ 降低耦合度
- ✅ 提高模組可替換性
- ✅ 符合 DDD 原則
- ✅ 為將來的 Review、Order 等模組打下正確基礎

---

## 附錄: 引用的架構原則

### DDD 原則

1. **Bounded Context** - 每個模組應有清晰的邊界
2. **Ubiquitous Language** - 通用語言不跨越邊界
3. **Anti-Corruption Layer** - 防腐層吸收外部變化
4. **Dependency Inversion** - 上層模組依賴介面，不依賴實現

### gravito-ddd 專案規則

- CLAUDE.md: Module 內禁止直接依賴特定 ORM
- 推論: Module 也不應直接依賴其他 Module 的具體實現

### 工業最佳實踐

- Clean Architecture - 依賴指向內部（Domain）
- Hexagonal Architecture - Port 定義外部邊界
- 企業集成模式 - 轉換層負責格式轉換

---

**報告生成時間**: 2026-03-13
**分析深度**: Opus 級別深度分析
**評審對象**: Shared 層 AuthorDTO 設計
**推薦優先級**: P1 (立即修復)
