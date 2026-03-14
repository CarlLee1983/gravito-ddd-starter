# Phase 4：UX 增強 Hooks 實作指南

## 概述

Phase 4 新增 3 個 UX 增強 Hooks，改善使用者體驗：

| Hook | 目的 | 適用場景 |
|------|------|---------|
| `useOptimisticUpdate` | 樂觀 UI 更新 + 失敗自動回滾 | 表單提交、數據編輯 |
| `useUnsavedChanges` | 未儲存變更警告 | 表單、編輯器、長篇幅編輯 |
| `useAutoSave` | Debounce 自動儲存草稿 | 編輯器、表單草稿保存 |

---

## Hook 1：useOptimisticUpdate

### 簽名

```typescript
function useOptimisticUpdate<T>(config: {
  fetchFn: () => Promise<T>              // 初始數據獲取
  onRollback?: (err: Error, prev: T) => void  // 回滾回調
  onSuccess?: (value: T) => void
}): {
  data: T | null
  isLoading: boolean
  error: Error | null
  update: (optimistic: T, apiFn: () => Promise<T>) => Promise<void>
  refetch: () => Promise<void>
}
```

### 核心邏輯

1. **樂觀更新**：`update()` 立即更新 UI，同時進行 API 調用
2. **失敗回滾**：API 失敗時自動恢復上一狀態
3. **防 Unmount**：使用 `isMountedRef` 保護非同步回調

### 使用範例

```typescript
import { useOptimisticUpdate } from '@/hooks'
import { userApi } from '@/services/api'

export function UserProfile({ userId }: { userId: string }) {
  const { data: user, update, error } = useOptimisticUpdate({
    fetchFn: async () => {
      const res = await userApi.getById(userId)
      return res.data
    },
    onRollback: (err, prevUser) => {
      toast.error(`更新失敗，已恢復: ${err.message}`)
    },
    onSuccess: (user) => {
      toast.success(`成功更新 ${user.name}`)
    }
  })

  const handleNameChange = async (newName: string) => {
    const optimisticUser = { ...user, name: newName }

    await update(
      optimisticUser,
      () => userApi.update(userId, { name: newName })
    )
  }

  if (!user) return <div>載入中...</div>

  return (
    <div>
      <input
        value={user.name}
        onChange={(e) => handleNameChange(e.target.value)}
      />
      {error && <div className="error">{error.message}</div>}
    </div>
  )
}
```

### 最佳實踐

- ✅ 用於即時回應的表單欄位（名稱、郵件等）
- ✅ 搭配 toast 提示失敗情況
- ✅ 在樂觀值不確定時提供 loading state

---

## Hook 2：useUnsavedChanges

### 簽名

```typescript
function useUnsavedChanges(
  externalIsDirty?: boolean,
  options?: {
    message?: string          // beforeunload 訊息
    enableBeforeUnload?: boolean  // 預設 true
  }
): {
  isDirty: boolean
  markSaved: () => void
  markDirty: () => void
}
```

### 核心邏輯

1. **計算 dirty**：`computedIsDirty = externalIsDirty || internalDirty`
2. **beforeunload 警告**：監聽 `computedIsDirty` 動態添加/移除事件監聽
3. **SSR 安全**：檢查 `typeof window !== 'undefined'`

### 使用範例（react-hook-form）

```typescript
import { useForm } from 'react-hook-form'
import { useUnsavedChanges } from '@/hooks'

export function EditUserForm({ userId }: { userId: string }) {
  const { register, handleSubmit, formState: { isDirty } } = useForm()

  const { isDirty: totalDirty, markSaved } = useUnsavedChanges(isDirty, {
    message: '您有未儲存的變更，確定要離開嗎？'
  })

  const onSubmit = async (data) => {
    await userApi.update(userId, data)
    markSaved()  // 提交成功後清除 dirty
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name')} />
      <button type="submit" disabled={!totalDirty}>
        儲存
      </button>
    </form>
  )
}
```

### 使用範例（簡單場景）

```typescript
import { useUnsavedChanges } from '@/hooks'

export function Editor() {
  const [content, setContent] = useState('')
  const { isDirty, markDirty, markSaved } = useUnsavedChanges(false, {
    message: '編輯尚未保存，確定要離開嗎？'
  })

  const handleChange = (text) => {
    setContent(text)
    markDirty()
  }

  const handleSave = async () => {
    await api.saveContent(content)
    markSaved()
  }

  return (
    <div>
      <textarea value={content} onChange={(e) => handleChange(e.target.value)} />
      <button onClick={handleSave} disabled={!isDirty}>保存</button>
    </div>
  )
}
```

### ⚠️ Inertia.js 提示

Inertia 導航**不觸發** `beforeunload` 事件。若需要在路由導航前攔截，使用：

```typescript
import { router } from '@inertiajs/react'

export function MyPage() {
  const { isDirty } = useUnsavedChanges(...)

  useEffect(() => {
    const handleBeforeNavigate = (visit) => {
      if (isDirty && !confirm('有未儲存變更，確定要離開嗎？')) {
        return false
      }
    }

    router.on('before', handleBeforeNavigate)

    return () => {
      router.off('before', handleBeforeNavigate)
    }
  }, [isDirty])

  return <div>...</div>
}
```

---

## Hook 3：useAutoSave

### 簽名

```typescript
function useAutoSave<T>(
  key: string,
  data: T,
  options?: {
    delay?: number                  // Debounce 延遲，預設 2000ms
    enabled?: boolean               // 預設 true
    serialize?: (d: T) => string    // JSON.stringify
    deserialize?: (s: string) => T  // JSON.parse
  }
): {
  savedAt: Date | null
  hasDraft: boolean
  isSaving: boolean
  restoreDraft: () => T | null
  clearDraft: () => void
}
```

### 核心邏輯

1. **智慧儲存**：比較序列化結果，避免無意義儲存
2. **Debounce**：每次 `data` 變更重置 debounce timer
3. **QuotaExceededError 處理**：localStorage 滿時優雅降級
4. **Restore 邏輯**：不直接修改狀態，返回數據供外部處理

### 使用範例

```typescript
import { useAutoSave } from '@/hooks'
import { useState, useEffect } from 'react'

export function ArticleEditor() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  // 分別監聽 title 和 content
  const titleAutoSave = useAutoSave('article-title', title, { delay: 1000 })
  const contentAutoSave = useAutoSave('article-content', content, { delay: 2000 })

  // 頁面載入時恢復草稿
  useEffect(() => {
    if (titleAutoSave.hasDraft) {
      const draft = titleAutoSave.restoreDraft()
      if (draft) setTitle(draft)
    }
    if (contentAutoSave.hasDraft) {
      const draft = contentAutoSave.restoreDraft()
      if (draft) setContent(draft)
    }
  }, [])

  const handlePublish = async () => {
    const res = await postApi.create({ title, content })
    if (res.success) {
      titleAutoSave.clearDraft()
      contentAutoSave.clearDraft()
      toast.success('發佈成功！')
    }
  }

  return (
    <div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="文章標題"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="文章內容"
      />

      <div className="info">
        {titleAutoSave.savedAt && (
          <p>標題草稿已於 {titleAutoSave.savedAt.toLocaleTimeString()} 保存</p>
        )}
        {contentAutoSave.savedAt && (
          <p>內容草稿已於 {contentAutoSave.savedAt.toLocaleTimeString()} 保存</p>
        )}
      </div>

      <button onClick={handlePublish}>發佈文章</button>

      {(titleAutoSave.hasDraft || contentAutoSave.hasDraft) && (
        <button
          onClick={() => {
            titleAutoSave.clearDraft()
            contentAutoSave.clearDraft()
          }}
        >
          清除草稿
        </button>
      )}
    </div>
  )
}
```

### 搭配 react-hook-form

```typescript
import { useForm } from 'react-hook-form'
import { useAutoSave } from '@/hooks'

export function ArticleForm() {
  const { register, watch, reset } = useForm({
    defaultValues: {
      title: '',
      content: ''
    }
  })

  const formData = watch()

  const autoSave = useAutoSave('article-form', formData, { delay: 1500 })

  // 恢復草稿
  useEffect(() => {
    if (autoSave.hasDraft) {
      const draft = autoSave.restoreDraft()
      if (draft) reset(draft)
    }
  }, [])

  return (
    <form>
      <input {...register('title')} />
      <textarea {...register('content')} />
      {autoSave.savedAt && <p>自動保存於 {autoSave.savedAt.toLocaleTimeString()}</p>}
    </form>
  )
}
```

### 最佳實踐

- ✅ 用於長篇幅編輯（編輯器、文章）
- ✅ 預設 2000ms debounce 避免頻繁儲存
- ✅ 使用 `restoreDraft()` 讓外部決定如何恢復
- ✅ 發佈/提交成功後呼叫 `clearDraft()`
- ⚠️ 不保証 localStorage 可用（配額滿、私密模式）

---

## Cart 頁面修復

### 問題

1. 重複的 `getCookie()` 函數（第 237-248 行）
2. 直接 `fetch` + 手動 token（第 60-72 行）

### 解決方案

**之前**：
```typescript
const token = getCookie('auth_token')
const response = await fetch(`/carts/${user.id}/checkout`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

**之後**：
```typescript
import { cartApi } from '../../services/api'

const response = await cartApi.checkout()
```

### 益處

- ✅ 消除代碼重複
- ✅ 自動帶 Auth header + CSRF token
- ✅ 統一錯誤處理
- ✅ 支持自動重試機制

---

## TypeScript 類型支援

所有 Hooks 都完整導出了 TypeScript 類型：

```typescript
import {
  useOptimisticUpdate,
  type UseOptimisticUpdateConfig,
  useUnsavedChanges,
  type UseUnsavedChangesOptions,
  useAutoSave,
  type UseAutoSaveOptions
} from '@/hooks'
```

---

## 驗證方式

### 1. TypeScript 編譯

```bash
bun run build
```

應無報錯。

### 2. 樂觀更新測試

```typescript
// 故意讓 API 失敗，確認 UI 回滾
const { update, data } = useOptimisticUpdate({
  fetchFn: async () => ({ id: 1, name: 'Test' }),
})

await update(
  { id: 1, name: 'Updated' },
  async () => {
    throw new Error('API 失敗')
  }
)

// data 應該回滾到 { id: 1, name: 'Test' }
```

### 3. beforeunload 測試

1. 填寫表單
2. 調用 `markDirty()`
3. 嘗試關閉標籤頁 → 應出現瀏覽器警告對話框

### 4. autoSave 測試

1. 輸入內容
2. 等待 2 秒（預設 debounce）
3. 開啟 DevTools → Application → localStorage
4. 應看到 `${key}` 和 `${key}__savedAt` 兩個條目

### 5. Cart 結帳測試

1. 打開 DevTools → Network
2. 點擊「結帳付款」按鈕
3. 應看到 `POST /api/cart/checkout` 請求
4. 驗證 `Authorization: Bearer ...` header 存在

---

## 相關文檔

- [Token 管理系統](./TOKEN_MANAGEMENT.md) - P1
- [Token 自動刷新機制](./TOKEN_AUTO_REFRESH.md) - P2
- [CSRF、重試、表單防護](./CSRF_RETRY_FORM_PROTECTION.md) - P3

---

## 更新日誌

### 2026-03-14 - Phase 4 完成

✅ `useOptimisticUpdate` - 樂觀 UI 更新 + 失敗回滾
✅ `useUnsavedChanges` - beforeunload 警告
✅ `useAutoSave` - Debounce localStorage 自動儲存
✅ Cart 頁面修復 - 統一 API 調用
✅ 完整 TypeScript 支援
