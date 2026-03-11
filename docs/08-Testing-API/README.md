# ✅ 測試 & API 指南

品質保證：單元測試、整合測試、API 設計規範、文檔生成。

---

## 📋 本分類包含

| 文檔 | 用途 |
|-----|------|
| **[TESTING.md](./TESTING.md)** | ⭐ 單元、整合、E2E 測試完整指南 |
| **[API_GUIDELINES.md](./API_GUIDELINES.md)** | RESTful API 設計規範 |
| **[OPENAPI.md](./OPENAPI.md)** | OpenAPI 文檔自動生成 |

---

## 🎯 推薦順序

### 編寫測試 (40 min)

1. **[TESTING.md](./TESTING.md)** (30 min)
   - 單元測試：Domain 層邏輯
   - 整合測試：Repository + Service
   - E2E 測試：完整 API 流程
   - 覆蓋率目標

2. **常見測試模式** (10 min)
   - Mock vs Stub
   - 測試隔離
   - 非同步測試

### 設計 API (20 min)

3. **[API_GUIDELINES.md](./API_GUIDELINES.md)**
   - 命名規範
   - 狀態碼規範
   - 錯誤回應格式
   - 分頁、排序、篩選

### 生成文檔 (10 min)

4. **[OPENAPI.md](./OPENAPI.md)**
   - 自動生成 Swagger 文檔
   - 文檔同步

---

## 📊 測試覆蓋率目標

| 層級 | 目標 | 優先級 |
|------|------|--------|
| Domain | 80%+ | ⭐⭐⭐ |
| Application | 60%+ | ⭐⭐ |
| Infrastructure | 50%+ | ⭐⭐ |
| Presentation | 40%+ | ⭐ |
| 整體 | 50%+ | ⭐⭐ |

**檢查覆蓋率**:
```bash
bun test --coverage
```

---

## 🧪 測試類型

### 1. 單元測試 (Domain 層)

```typescript
describe('User Aggregate', () => {
  it('should create user with valid email', () => {
    const user = User.create('John', 'john@example.com')
    expect(user.email).toBe('john@example.com')
  })

  it('should throw on invalid email', () => {
    expect(() => new Email('invalid')).toThrow()
  })
})
```

目標覆蓋: **80%+**

### 2. 整合測試 (Application + Infrastructure)

```typescript
describe('UserRepository', () => {
  it('should save and retrieve user', async () => {
    const repo = new UserRepository(new MemoryDatabaseAccess())
    const user = User.create('John', 'john@example.com')

    await repo.save(user)
    const found = await repo.findById(user.id)

    expect(found?.email).toBe('john@example.com')
  })
})
```

目標覆蓋: **60%+**

### 3. E2E 測試 (完整 API)

```typescript
describe('POST /api/users', () => {
  it('should create user via API', async () => {
    const response = await tester.post('/api/users', {
      name: 'John',
      email: 'john@example.com'
    })

    expect(response.status).toBe(201)
    expect(response.body.data.id).toBeDefined()
  })
})
```

目標覆蓋: **關鍵流程 100%**

---

## 💡 API 設計規範

### URL 命名

```
✅ 複數名詞
GET /api/users           # 列表
POST /api/users          # 建立
GET /api/users/:id       # 詳情
PUT /api/users/:id       # 更新
DELETE /api/users/:id    # 刪除

✅ 嵌套資源
GET /api/users/:id/posts          # 用戶的文章
POST /api/users/:id/posts         # 為用戶建立文章
GET /api/users/:id/posts/:postId  # 用戶特定文章

❌ 動詞
GET /api/getUsers        # ❌ 不用動詞
GET /api/create-user     # ❌ 不用動詞
```

### 回應格式

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John",
    "email": "john@example.com",
    "createdAt": "2026-03-11T10:00:00Z"
  },
  "meta": {
    "timestamp": "2026-03-11T10:00:00Z"
  }
}
```

### 錯誤回應

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "email": ["Must be a valid email address"]
    }
  }
}
```

詳見 [API_GUIDELINES.md](./API_GUIDELINES.md)

---

## 🎯 常見場景

### "我不知道該測試什麼"
→ [TESTING.md](./TESTING.md) 的「測試什麼」章節

### "我的測試很慢"
→ [TESTING.md](./TESTING.md) 的「測試性能」章節

### "我不知道 API 怎麼設計"
→ [API_GUIDELINES.md](./API_GUIDELINES.md)

### "我想自動生成 API 文檔"
→ [OPENAPI.md](./OPENAPI.md)

### "我的測試隔離有問題"
→ [TESTING.md](./TESTING.md) 的「測試隔離」章節

---

## ✅ 測試檢查清單

完成功能後：

- [ ] Domain 層有單元測試（80%+）
- [ ] Service 層有整合測試（60%+）
- [ ] 至少 1 個 E2E 測試
- [ ] 所有異常情況有測試
- [ ] 測試無 console.log
- [ ] 測試名稱清晰
- [ ] Mock 使用得當
- [ ] 覆蓋率達標

---

## 🔗 相關資源

**DDD 和模組**:
- [DDD 實施清單](../03-DDD-Design/DDD_IMPLEMENTATION_CHECKLIST.md)
- [模組開發指南](../04-Module-Development/MODULE_GUIDE.md)

**生產部署**:
- [部署指南](../07-Production-Deployment/DEPLOYMENT.md)
- [故障排除](../07-Production-Deployment/TROUBLESHOOTING.md)

---

**快速導航**:
← [生產部署](../07-Production-Deployment/)
→ [回到首頁](../README.md)

最後更新: 2026-03-11
