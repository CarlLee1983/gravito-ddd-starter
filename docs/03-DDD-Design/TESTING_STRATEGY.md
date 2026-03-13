# 🧪 測試策略與目標 (Testing Strategy)

本文件定義 Gravito DDD 項目的測試體系，確保代碼變更不會破壞現有功能。

---

## 1. 測試分類

### 單元測試 (Unit Tests)
- **對象**: 領域實體 (Entities)、值物件 (Value Objects)、領域服務。
- **目標**: 驗證業務規則是否正確實現。
- **要求**: 必須 100% 覆蓋所有路徑，禁止使用任何 Mock 庫 (因為 Domain 層不應有依賴)。

### 整合測試 (Integration Tests)
- **對象**: Repositories、應用服務 (Application Services)。
- **目標**: 驗證各組件間的協作以及與外部設施 (DB, Redis) 的交互。
- **要求**: 使用 `MemoryDatabaseAccess` 或臨時的測試資料庫。

### 端到端測試 (E2E Tests)
- **對象**: 完整 HTTP 端點。
- **目標**: 驗證從請求到響應的完整流程。
- **要求**: 模擬真實的 API 調用。

---

## 2. 測試覆蓋率目標 (Minimum Thresholds)

我們追求高質量的測試覆蓋，而非僅僅是數字。

| 層級 | 目標覆蓋率 | 重點 |
| :--- | :--- | :--- |
| **Domain Layer** | 80% + | 核心業務邏輯、驗證規則 |
| **Application Layer** | 60% + | 使用案例流程、事務協調 |
| **Infrastructure Layer** | 50% + | 數據轉換 (toDomain/toRow) |
| **Presentation Layer** | 40% + | 路由映射、異常捕捉 |
| **整體項目** | **50% +** | 確保關鍵路徑安全 |

---

## 3. 如何編寫測試

### Domain 層範例 (Bun Test)
```typescript
describe('User Entity', () => {
  it('應能正確創建活躍用戶', () => {
    const user = User.create({ name: 'Carl', email: 'carl@example.com' })
    expect(user.status.value).toBe('active')
  })
})
```

### Repository 整合測試範例
```typescript
describe('UserRepository', () => {
  it('應能保存並根據 ID 查找用戶', async () => {
    const db = new MemoryDatabaseAccess()
    const repo = new UserRepository(db)
    const user = User.create({ name: 'Test', email: 'test@example.com' })

    await repo.save(user)
    const found = await repo.findById(user.id)
    expect(found?.email).toBe(user.email)
  })
})
```

最後更新: 2026-03-13
