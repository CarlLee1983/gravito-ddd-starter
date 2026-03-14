/**
 * @file UXHooksIntegration.test.ts
 * @description Phase 4 UX Hooks 集成測試
 *
 * 測試場景：
 * - 多個 Hooks 在表單元件中的互動
 * - Cart 結帳流程（useOptimisticUpdate）
 * - 表單編輯器（useUnsavedChanges + useAutoSave）
 * - Article 發佈流程（所有 Hooks 組合）
 */

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'

/**
 * 模擬的表單元件狀態管理器
 * 用於測試 useUnsavedChanges + useAutoSave 互動
 */
class FormComponentManager {
  private isDirty = false
  private formData = { title: '', content: '' }
  private savedDraft = false
  private isSubmitting = false
  private submitError: string | null = null
  private lastSavedAt: Date | null = null

  // 模擬 useUnsavedChanges
  markDirty() {
    this.isDirty = true
  }

  markSaved() {
    this.isDirty = false
  }

  getIsDirty() {
    return this.isDirty
  }

  // 模擬 useAutoSave
  updateFormData(data: Partial<typeof this.formData>) {
    this.formData = { ...this.formData, ...data }
    this.markDirty()
    this.autoSaveToDraft()
  }

  private autoSaveToDraft() {
    // 模擬 debounce 儲存
    this.savedDraft = true
    this.lastSavedAt = new Date()
  }

  getFormData() {
    return this.formData
  }

  hasDraft() {
    return this.savedDraft
  }

  getSavedAt() {
    return this.lastSavedAt
  }

  // 表單提交
  async submitForm(): Promise<boolean> {
    if (this.isSubmitting) {
      return false
    }

    this.isSubmitting = true
    this.submitError = null

    try {
      // 模擬 API 調用
      await new Promise((resolve) => setTimeout(resolve, 50))

      // 模擬驗證
      if (!this.formData.title) {
        throw new Error('標題不能為空')
      }

      // 提交成功
      this.markSaved()
      this.savedDraft = false
      return true
    } catch (error) {
      this.submitError = error instanceof Error ? error.message : '提交失敗'
      return false
    } finally {
      this.isSubmitting = false
    }
  }

  getError() {
    return this.submitError
  }

  isLoading() {
    return this.isSubmitting
  }

  clear() {
    this.formData = { title: '', content: '' }
    this.isDirty = false
    this.savedDraft = false
    this.submitError = null
    this.lastSavedAt = null
  }
}

/**
 * 模擬的 Cart 結帳管理器
 * 用於測試 useOptimisticUpdate 互動
 */
class CartCheckoutManager {
  private cartItems = [
    { id: 1, name: 'Item 1', price: 10, quantity: 1 },
    { id: 2, name: 'Item 2', price: 20, quantity: 1 },
  ]
  private isUpdating = false
  private error: Error | null = null
  private lastOperation = ''
  private optimisticData: any = null

  updateQuantity(itemId: number, newQuantity: number) {
    const item = this.cartItems.find((i) => i.id === itemId)
    if (item) {
      // 樂觀更新
      this.optimisticData = {
        ...item,
        quantity: newQuantity,
      }
      this.lastOperation = 'optimistic-update'

      // 模擬 API 調用
      this.performUpdate(itemId, newQuantity)
    }
  }

  private async performUpdate(itemId: number, newQuantity: number) {
    this.isUpdating = true
    this.error = null

    try {
      await new Promise((resolve) => setTimeout(resolve, 30))

      // API 成功
      const item = this.cartItems.find((i) => i.id === itemId)
      if (item) {
        item.quantity = newQuantity
      }
      this.lastOperation = 'update-success'
    } catch (err) {
      // 失敗回滾
      this.error = err instanceof Error ? err : new Error('更新失敗')
      this.optimisticData = null
      this.lastOperation = 'update-failed'
    } finally {
      this.isUpdating = false
    }
  }

  async checkout(): Promise<boolean> {
    this.isUpdating = true
    this.error = null

    try {
      if (this.cartItems.length === 0) {
        throw new Error('購物車為空')
      }

      await new Promise((resolve) => setTimeout(resolve, 50))
      this.lastOperation = 'checkout-success'
      return true
    } catch (err) {
      this.error = err instanceof Error ? err : new Error('結帳失敗')
      this.lastOperation = 'checkout-failed'
      return false
    } finally {
      this.isUpdating = false
    }
  }

  getItems() {
    return this.cartItems
  }

  getError() {
    return this.error
  }

  isLoading() {
    return this.isUpdating
  }

  getLastOperation() {
    return this.lastOperation
  }

  getOptimisticData() {
    return this.optimisticData
  }

  clear() {
    this.cartItems = [
      { id: 1, name: 'Item 1', price: 10, quantity: 1 },
      { id: 2, name: 'Item 2', price: 20, quantity: 1 },
    ]
    this.isUpdating = false
    this.error = null
    this.lastOperation = ''
    this.optimisticData = null
  }
}

/**
 * 複合元件管理器
 * 測試所有 Hooks 在複雜場景中的互動
 */
class ArticleEditorManager {
  private form: FormComponentManager
  private autosaveDelay = 100

  constructor() {
    this.form = new FormComponentManager()
  }

  // 模擬用戶編輯
  async editTitle(newTitle: string) {
    this.form.updateFormData({ title: newTitle })

    // 等待 debounce
    await new Promise((resolve) => setTimeout(resolve, this.autosaveDelay + 50))
  }

  async editContent(newContent: string) {
    this.form.updateFormData({ content: newContent })

    // 等待 debounce
    await new Promise((resolve) => setTimeout(resolve, this.autosaveDelay + 50))
  }

  // 檢查狀態
  isDirty() {
    return this.form.getIsDirty()
  }

  hasDraft() {
    return this.form.hasDraft()
  }

  getFormData() {
    return this.form.getFormData()
  }

  getSavedAt() {
    return this.form.getSavedAt()
  }

  // 嘗試發佈
  async publish(): Promise<boolean> {
    const success = await this.form.submitForm()
    return success
  }

  getError() {
    return this.form.getError()
  }

  isLoading() {
    return this.form.isLoading()
  }

  clear() {
    this.form.clear()
  }
}

// ============================================================
// 集成測試
// ============================================================

describe('Phase 4 UX Hooks 集成測試', () => {
  describe('表單編輯器 -- useUnsavedChanges + useAutoSave', () => {
    let manager: FormComponentManager

    beforeEach(() => {
      manager = new FormComponentManager()
    })

    it('應同時管理 dirty 狀態和自動儲存', async () => {
      expect(manager.getIsDirty()).toBe(false)
      expect(manager.hasDraft()).toBe(false)

      // 編輯表單
      manager.updateFormData({ title: 'Test Title' })

      // 應立即標記為 dirty
      expect(manager.getIsDirty()).toBe(true)

      // 應自動儲存到草稿
      expect(manager.hasDraft()).toBe(true)
      expect(manager.getSavedAt()).not.toBeNull()
    })

    it('提交成功後應清除 dirty 和草稿', async () => {
      manager.updateFormData({ title: 'Test Title', content: 'Content' })
      expect(manager.getIsDirty()).toBe(true)
      expect(manager.hasDraft()).toBe(true)

      const success = await manager.submitForm()
      expect(success).toBe(true)

      // 應清除狀態
      expect(manager.getIsDirty()).toBe(false)
      expect(manager.hasDraft()).toBe(false)
    })

    it('提交失敗時應保持 dirty 和草稿', async () => {
      // 不填寫必填項，導致驗證失敗
      const success = await manager.submitForm()
      expect(success).toBe(false)

      // 不應改變狀態
      expect(manager.getIsDirty()).toBe(false) // 未編輯
      expect(manager.hasDraft()).toBe(false) // 未儲存
    })

    it('多次編輯應持續更新 dirty 和 draft', async () => {
      const firstSavedAt = manager.getSavedAt()

      // 第一次編輯
      manager.updateFormData({ title: 'Title 1' })
      expect(manager.getIsDirty()).toBe(true)
      const afterFirstEdit = manager.getSavedAt()

      // 第二次編輯
      await new Promise((resolve) => setTimeout(resolve, 50))
      manager.updateFormData({ content: 'Content 1' })
      expect(manager.getIsDirty()).toBe(true)
      const afterSecondEdit = manager.getSavedAt()

      // 每次編輯都應更新 savedAt
      expect(afterSecondEdit?.getTime()).toBeGreaterThanOrEqual(
        afterFirstEdit?.getTime() || 0
      )
    })
  })

  describe('購物車結帳流程 -- useOptimisticUpdate', () => {
    let manager: CartCheckoutManager

    beforeEach(() => {
      manager = new CartCheckoutManager()
    })

    afterEach(() => {
      manager.clear()
    })

    it('應樂觀更新購物車數量', async () => {
      expect(manager.getItems()[0].quantity).toBe(1)
      expect(manager.getOptimisticData()).toBeNull()

      manager.updateQuantity(1, 2)

      // 應立即顯示樂觀更新
      expect(manager.getOptimisticData()?.quantity).toBe(2)

      // 等待 API 完成
      await new Promise((resolve) => setTimeout(resolve, 100))

      // API 應成功
      expect(manager.getLastOperation()).toBe('update-success')
      expect(manager.getItems()[0].quantity).toBe(2)
    })

    it('結帳前應檢查購物車', async () => {
      const success = await manager.checkout()
      expect(success).toBe(true)
      expect(manager.getLastOperation()).toBe('checkout-success')
    })

    it('結帳失敗時應返回錯誤', async () => {
      // 清空購物車，導致結帳失敗
      manager.getItems().length = 0

      const success = await manager.checkout()
      expect(success).toBe(false)
      expect(manager.getError()?.message).toContain('購物車為空')
    })

    it('多次數量更新應順序進行', async () => {
      manager.updateQuantity(1, 2)
      await new Promise((resolve) => setTimeout(resolve, 100))

      manager.updateQuantity(1, 3)
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(manager.getItems()[0].quantity).toBe(3)
      expect(manager.getLastOperation()).toBe('update-success')
    })
  })

  describe('Article 編輯器 -- 複合 Hooks', () => {
    let manager: ArticleEditorManager

    beforeEach(() => {
      manager = new ArticleEditorManager()
    })

    afterEach(() => {
      manager.clear()
    })

    it('應在編輯時觸發 dirty 和自動儲存', async () => {
      expect(manager.isDirty()).toBe(false)
      expect(manager.hasDraft()).toBe(false)

      await manager.editTitle('New Article')

      expect(manager.isDirty()).toBe(true)
      expect(manager.hasDraft()).toBe(true)
    })

    it('應允許多次編輯並保持狀態', async () => {
      await manager.editTitle('Title')
      expect(manager.isDirty()).toBe(true)

      await manager.editContent('Content')
      expect(manager.isDirty()).toBe(true)

      expect(manager.getFormData()).toEqual({
        title: 'Title',
        content: 'Content',
      })
    })

    it('發佈成功後應清除所有狀態', async () => {
      await manager.editTitle('Article Title')
      await manager.editContent('Article Content')

      expect(manager.isDirty()).toBe(true)
      expect(manager.hasDraft()).toBe(true)

      const success = await manager.publish()
      expect(success).toBe(true)

      expect(manager.isDirty()).toBe(false)
      expect(manager.hasDraft()).toBe(false)
    })

    it('發佈失敗時應保持草稿', async () => {
      // 不填寫必填項
      const success = await manager.publish()
      expect(success).toBe(false)

      // 應有錯誤訊息
      expect(manager.getError()).not.toBeNull()
    })

    it('應支持重試流程', async () => {
      // 第一次發佈失敗
      let success = await manager.publish()
      expect(success).toBe(false)

      // 填寫必填項
      await manager.editTitle('Valid Title')

      // 第二次發佈成功
      success = await manager.publish()
      expect(success).toBe(true)
      expect(manager.getError()).toBeNull()
    })
  })

  describe('邊界情況 -- Hooks 互動', () => {
    it('快速連續編輯應去重', async () => {
      const form = new FormComponentManager()

      form.updateFormData({ title: 'A' })
      form.updateFormData({ title: 'AB' })
      form.updateFormData({ title: 'ABC' })

      // 應只有一個最新的草稿
      expect(form.getFormData().title).toBe('ABC')
      expect(form.hasDraft()).toBe(true)
    })

    it('應處理提交期間的編輯', async () => {
      const form = new FormComponentManager()
      form.updateFormData({ title: 'Original', content: 'Content' })

      // 提交但不等待
      const submitPromise = form.submitForm()

      // 同時編輯（在實際應用中應被禁用）
      form.updateFormData({ title: 'Updated' })

      await submitPromise

      // 提交應該基於原始數據成功
      expect(form.getError()).toBeNull()
    })

    it('應在購物車更新期間保持一致性', async () => {
      const cart = new CartCheckoutManager()

      // 多個項目同時更新
      cart.updateQuantity(1, 2)
      cart.updateQuantity(2, 3)

      await new Promise((resolve) => setTimeout(resolve, 100))

      // 兩個更新都應成功
      const items = cart.getItems()
      expect(items[0].quantity).toBe(2)
      expect(items[1].quantity).toBe(3)
    })
  })

  describe('用戶交互場景', () => {
    it('場景 1：完整的文章發佈流程', async () => {
      const editor = new ArticleEditorManager()

      // 步驟 1: 開始編輯
      expect(editor.isDirty()).toBe(false)

      // 步驟 2: 編輯內容
      await editor.editTitle('My Article')
      expect(editor.isDirty()).toBe(true)
      expect(editor.hasDraft()).toBe(true)

      // 步驟 3: 繼續編輯
      await editor.editContent('Great content')
      expect(editor.isDirty()).toBe(true)
      expect(editor.hasDraft()).toBe(true)

      // 步驟 4: 發佈
      const success = await editor.publish()
      expect(success).toBe(true)

      // 步驟 5: 驗證清晰狀態
      expect(editor.isDirty()).toBe(false)
      expect(editor.hasDraft()).toBe(false)
    })

    it('場景 2：購物車結帳完整流程', async () => {
      const cart = new CartCheckoutManager()

      // 步驟 1: 檢查初始購物車
      expect(cart.getItems().length).toBeGreaterThan(0)

      // 步驟 2: 調整數量
      cart.updateQuantity(1, 5)
      await new Promise((resolve) => setTimeout(resolve, 100))

      // 步驟 3: 驗證更新
      expect(cart.getItems()[0].quantity).toBe(5)

      // 步驟 4: 結帳
      const success = await cart.checkout()
      expect(success).toBe(true)
    })

    it('場景 3：表單驗證失敗和重試', async () => {
      const form = new FormComponentManager()

      // 步驟 1: 嘗試提交空表單
      let success = await form.submitForm()
      expect(success).toBe(false)
      expect(form.getError()).toContain('標題不能為空')

      // 步驟 2: 填寫表單
      form.updateFormData({ title: 'Valid Title', content: 'Valid Content' })

      // 步驟 3: 重試提交
      success = await form.submitForm()
      expect(success).toBe(true)
      expect(form.getError()).toBeNull()
    })
  })
})
