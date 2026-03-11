/**
 * User Module 整合測試
 *
 * 測試範圍：
 * - User API 的完整流程（建立、列表、查詢、404 處理）
 * - HTTP 層的請求/響應處理
 * - 模組內的依賴注入和協調
 *
 * 測試場景：
 * - POST /api/users - 建立新用戶
 * - GET /api/users - 列出所有用戶
 * - GET /api/users/:id - 取得特定用戶
 * - GET /api/users/non-existent - 404 錯誤處理
 *
 * @module tests/User/UserModule
 */

import { describe, it, expect, beforeAll } from 'bun:test'
import { createHttpTester, type HttpTester } from '@gravito/core'
import { createApp } from '../../../app'

describe('User Module Integration', () => {
  let tester: HttpTester

  beforeAll(async () => {
    const core = await createApp()
    tester = createHttpTester(core)
  })

  it('should create a new user', async () => {
    const response = await tester.post('/api/users', {
      name: 'Test User',
      email: 'test@example.com'
    })

    response.assertCreated()
    const json = await response.getJson()
    expect(json.success).toBe(true)
    expect(json.data.name).toBe('Test User')
    expect(json.data.email).toBe('test@example.com')
    expect(json.data.id).toBeDefined()
  })

  it('should list users', async () => {
    const response = await tester.get('/api/users')
    
    response.assertOk()
    const json = await response.getJson()
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data)).toBe(true)
    expect(json.data.length).toBeGreaterThan(0)
  })

  it('should get a specific user', async () => {
    // First create a user to get its ID
    const createRes = await tester.post('/api/users', {
      name: 'Find Me',
      email: 'findme@example.com'
    })
    const userData = (await createRes.getJson()).data

    const response = await tester.get(`/api/users/${userData.id}`)
    
    response.assertOk()
    const json = await response.getJson()
    expect(json.data.email).toBe('findme@example.com')
  })

  it('should return 404 for non-existent user', async () => {
    const response = await tester.get('/api/users/non-existent-id')
    response.assertNotFound()
  })
})
