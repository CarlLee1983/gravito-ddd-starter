/**
 * @file UserAndPostModules.test.ts
 * @description User 和 Post 模組完整功能性測試
 *
 * 測試透過容器驗證：
 * - User API 端點（建立、查詢、列表）
 * - Post API 端點（建立、查詢、列表）
 * - 跨模組功能（事件驅動）
 * - 數據完整性
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test'

const API_BASE = 'http://localhost:3000/api'

// 測試資料存儲
interface TestData {
	userId: string
	postId: string
	userEmail: string
	postTitle: string
}

const testData: TestData = {
	userId: '',
	postId: '',
	userEmail: `user-${Date.now()}@test.com`,
	postTitle: `Test Post - ${Date.now()}`
}

describe('🧪 User 和 Post 模組功能性測試 (使用容器)', () => {
	beforeAll(async () => {
		console.log('\n════════════════════════════════════════')
		console.log('   🚀 開始功能性測試')
		console.log('════════════════════════════════════════\n')
	})

	afterAll(async () => {
		console.log('\n════════════════════════════════════════')
		console.log('   ✅ 測試完成')
		console.log('════════════════════════════════════════\n')
	})

	describe('👤 User 模組 API', () => {
		it('✓ 應該能建立用戶', async () => {
			const response = await fetch(`${API_BASE}/users`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'Test User',
					email: testData.userEmail
				})
			})

			expect([200, 201].includes(response.status)).toBe(true)
			const result = await response.json()
			expect(result.success).toBe(true)
			expect(result.data?.id).toBeDefined()
			expect(result.data?.name).toBe('Test User')

			testData.userId = result.data.id
			console.log(`   📌 用戶已建立: ${testData.userId}`)
		})

		it('✓ 應該能根據 ID 獲取用戶', async () => {
			const response = await fetch(`${API_BASE}/users/${testData.userId}`)
			expect(response.status).toBe(200)
			const result = await response.json()
			expect(result.success).toBe(true)
			expect(result.data?.id).toBe(testData.userId)
			console.log(`   📌 用戶已取得: ${result.data.name}`)
		})

		it('✓ 應該能列出用戶', async () => {
			const response = await fetch(`${API_BASE}/users`)
			expect(response.status).toBe(200)
			const result = await response.json()
			expect(result.success).toBe(true)
			expect(Array.isArray(result.data)).toBe(true)
			expect(result.data.length).toBeGreaterThan(0)
			console.log(`   📌 找到 ${result.data.length} 個用戶`)
		})

		it('✓ 應該能驗證用戶數據完整性', async () => {
			const response = await fetch(`${API_BASE}/users/${testData.userId}`)
			const result = await response.json()
			const user = result.data

			// 驗證所有必需字段
			expect(user.id).toBeTruthy()
			expect(user.name).toBe('Test User')
			expect(user.email).toBe(testData.userEmail)
			expect(user.createdAt).toBeTruthy()

			console.log(`   📌 用戶數據完整性驗證通過`)
		})
	})

	describe('📝 Post 模組 API', () => {
		it('✓ 應該能建立文章', async () => {
			const response = await fetch(`${API_BASE}/Post`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: testData.postTitle,
					content: 'This is a test post content',
					authorId: testData.userId
				})
			})

			expect([200, 201].includes(response.status)).toBe(true)
			const result = await response.json()
			expect(result.success).toBe(true)
			expect(result.data?.id).toBeDefined()
			expect(result.data?.title).toBe(testData.postTitle)

			testData.postId = result.data.id
			console.log(`   📌 文章已建立: ${testData.postId}`)
		})

		it('✓ 應該能根據 ID 獲取文章', async () => {
			const response = await fetch(`${API_BASE}/Post/${testData.postId}`)
			expect(response.status).toBe(200)
			const result = await response.json()
			expect(result.success).toBe(true)
			expect(result.data?.id).toBe(testData.postId)
			console.log(`   📌 文章已取得: ${result.data.title}`)
		})

		it('✓ 應該能列出文章', async () => {
			const response = await fetch(`${API_BASE}/Post`)
			expect(response.status).toBe(200)
			const result = await response.json()
			expect(result.success).toBe(true)
			expect(Array.isArray(result.data)).toBe(true)
			expect(result.data.length).toBeGreaterThan(0)
			console.log(`   📌 找到 ${result.data.length} 篇文章`)
		})

		it('✓ 應該能驗證文章數據完整性', async () => {
			const response = await fetch(`${API_BASE}/Post/${testData.postId}`)
			const result = await response.json()
			const post = result.data

			// 驗證所有必需字段
			expect(post.id).toBeTruthy()
			expect(post.title).toBe(testData.postTitle)
			expect(post.content).toBeTruthy()
			expect(post.authorId).toBe(testData.userId)
			expect(post.createdAt).toBeTruthy()

			console.log(`   📌 文章數據完整性驗證通過`)
		})
	})

	describe('🔗 跨模組功能', () => {
		it('✓ 應該能驗證用戶和文章的關係', async () => {
			const userRes = await fetch(`${API_BASE}/users/${testData.userId}`)
			const userData = await userRes.json()

			const postRes = await fetch(`${API_BASE}/Post/${testData.postId}`)
			const postData = await postRes.json()

			// 驗證文章屬於用戶
			expect(postData.data.authorId).toBe(userData.data.id)
			console.log(`   📌 用戶和文章關係驗證通過`)
		})

		it('✓ 應該能獲取用戶的所有文章', async () => {
			const response = await fetch(`${API_BASE}/Post`)
			const result = await response.json()

			// 篩選該用戶的文章
			const userPosts = result.data.filter(
				(post: any) => post.authorId === testData.userId
			)

			expect(userPosts.length).toBeGreaterThan(0)
			expect(userPosts.some((p: any) => p.id === testData.postId)).toBe(true)
			console.log(`   📌 用戶擁有 ${userPosts.length} 篇文章`)
		})

		it('✓ 應該能驗證事件系統（自動歡迎文章）', async () => {
			// 建立新用戶
			const createRes = await fetch(`${API_BASE}/users`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'Event Test User',
					email: `event-${Date.now()}@test.com`
				})
			})

			const userData = await createRes.json()
			const newUserId = userData.data.id

			// 等待事件處理
			await new Promise(resolve => setTimeout(resolve, 500))

			// 查詢該用戶的文章
			const postsRes = await fetch(`${API_BASE}/Post`)
			const postsData = await postsRes.json()

			const userPosts = postsData.data.filter(
				(post: any) => post.authorId === newUserId
			)

			// 應該至少有一篇自動生成的歡迎文章
			expect(userPosts.length).toBeGreaterThan(0)
			console.log(`   📌 自動事件系統驗證通過 (自動建立 ${userPosts.length} 篇文章)`)
		})
	})

	describe('📊 系統完整性', () => {
		it('✓ 應該能驗證系統健康狀況', async () => {
			const response = await fetch('http://localhost:3000/health')
			expect(response.status).toBe(200)
			const result = await response.json()
			// 系統可能返回 'healthy' 或 'degraded'（取決於 Redis 連接）
			expect(['healthy', 'degraded'].includes(result.status)).toBe(true)
			console.log(`   📌 系統狀態: ${result.status}`)
		})

		it('✓ 應該能驗證 API 響應格式一致性', async () => {
			const response = await fetch(`${API_BASE}/users`)
			const result = await response.json()

			// 驗證標準響應格式
			expect(result.success).toBeDefined()
			expect(result.data).toBeDefined()
			console.log(`   📌 API 響應格式驗證通過`)
		})

		it('✓ 應該能驗證數據持久化', async () => {
			// 驗證之前建立的數據仍然存在
			const userRes = await fetch(`${API_BASE}/users/${testData.userId}`)
			expect(userRes.status).toBe(200)

			const postRes = await fetch(`${API_BASE}/Post/${testData.postId}`)
			expect(postRes.status).toBe(200)

			console.log(`   📌 數據持久化驗證通過`)
		})
	})

	describe('🔄 完整流程驗證', () => {
		it('✓ 應該能完整驗證用戶到文章的工作流', async () => {
			console.log('\n   工作流步驟:')

			// 1. 建立用戶
			const createUserRes = await fetch(`${API_BASE}/users`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: 'Workflow Test User',
					email: `workflow-${Date.now()}@test.com`
				})
			})
			expect([200, 201].includes(createUserRes.status)).toBe(true)
			const userData = await createUserRes.json()
			const workflowUserId = userData.data.id
			console.log(`     1. ✓ 用戶已建立`)

			// 2. 驗證用戶已建立
			const getUserRes = await fetch(`${API_BASE}/users/${workflowUserId}`)
			expect(getUserRes.status).toBe(200)
			console.log(`     2. ✓ 用戶已驗證`)

			// 3. 建立文章
			const createPostRes = await fetch(`${API_BASE}/Post`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: `Workflow Test Post - ${Date.now()}`,
					content: 'Testing complete workflow',
					authorId: workflowUserId
				})
			})
			expect([200, 201].includes(createPostRes.status)).toBe(true)
			const postData = await createPostRes.json()
			const workflowPostId = postData.data.id
			console.log(`     3. ✓ 文章已建立`)

			// 4. 驗證文章已建立
			const getPostRes = await fetch(`${API_BASE}/Post/${workflowPostId}`)
			expect(getPostRes.status).toBe(200)
			console.log(`     4. ✓ 文章已驗證`)

			// 5. 驗證關係
			const finalPostData = await getPostRes.json()
			expect(finalPostData.data.authorId).toBe(workflowUserId)
			console.log(`     5. ✓ 用戶-文章關係已驗證\n`)

			console.log(`   📌 完整工作流驗證通過`)
		})
	})
})
