# 聰明的工廠優化 - 從多重工廠到單一透明倉儲

## 問題：工廠代碼的演進

在早期的設計中，我們可能需要為不同的 ORM（如 Memory, Drizzle, Atlas）編寫不同的 Repository 類別。這導致工廠函數充斥著重複的 `switch/case` 邏輯。

```typescript
// ❌ 過時的做法：為每個 ORM 分別建立類別並進行分支
export function createUserRepository(orm: string, db?: IDatabaseAccess) {
  switch (orm) {
    case 'memory': return new MemoryUserRepository()
    case 'drizzle': return new DrizzleUserRepository(db!)
    case 'atlas': return new AtlasUserRepository(db!)
  }
}
```

**這種做法的問題：**
- 💥 隨模組與 ORM 數量增加，代碼呈 O(n × m) 增長。
- 💥 大量重複的領域邏輯分散在不同的持久化實現中。
- 💥 違反開放封閉原則。

---

## 終極解決方案：單一透明倉儲 (Single Transparent Repository)

目前的架構已優化為 **「單一倉儲 + 技術適配器」**。Repository 只依賴 `IDatabaseAccess` 介面，而「資料存放在哪」的技術細節完全由上層注入的適配器決定。

### ✅ 聰明的做法：零分支工廠

由於 Repository 是 ORM 無關的，我們的工廠註冊變得極其簡潔：

```typescript
// app/Modules/User/Infrastructure/Providers/registerUserRepositories.ts

export function registerUserRepositories(db: IDatabaseAccess, eventDispatcher?: IEventDispatcher): void {
  const registry = getRegistry()
  
  // 唯一的 UserRepository 同時支援 Memory, Drizzle, Atlas 等所有 ORM
  const factory = () => new UserRepository(db, eventDispatcher)

  registry.register('user', factory)
}
```

---

## 設計對比

| 指標 | 多重類別模式 (舊) | 單一透明模式 (新) |
| :--- | :--- | :--- |
| **類別數量** | n 個模組 × m 個 ORM | **n 個模組** (固定) |
| **重複代碼** | 高 (不同類別間邏輯重複) | **0%** |
| **工廠複雜度** | O(m) 分支 | **O(1)** (直接實例化) |
| **維護難度** | 高 | **極低** |

---

## 為何這是「聰明的」優化？

### 1. 職責完全分離
- **Repository**: 只負責「業務規則與資料的對應」。
- **Adapter (`IDatabaseAccess`)**: 只負責「SQL/記憶體操作的實現」。
- **Wirer**: 只負責「根據環境變數將兩者配對」。

### 2. 測試優勢
你不需要 Mock 整個資料庫，只需在測試中注入 `MemoryDatabaseAccess` 到同一個 `UserRepository` 中，即可獲得毫秒級的測試速度，且測試的正是你生產環境使用的同一份代碼。

### 3. 未來擴展性
若未來要新增一個新的 ORM（例如 Prisma），你只需要建立一個 `PrismaDatabaseAccess` 適配器。**現有的 100 個模組完全不需要修改任何工廠代碼**，系統即可自動支援。

---

## 總結

**Smart Factor**：⭐⭐⭐⭐⭐

真正的「聰明」不是寫出複雜的工廠生成器，而是透過**優良的抽象設計（Ports & Adapters）**，讓複雜的工廠邏輯從根本上消失。

最後更新: 2026-03-13
