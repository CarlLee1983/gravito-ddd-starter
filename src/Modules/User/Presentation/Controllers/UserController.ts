/**
 * @file UserController.ts
 * @description 用戶模組控制器
 *
 * 在 DDD 架構中的角色：
 * - 表現層 (Presentation Layer)：處理外部 HTTP 請求並回傳回應。
 * - 職責：解析請求參數、呼叫領域服務或倉儲、並將結果轉換為 API 格式。
 *
 * 設計原則：
 * - 控制器接收依賴注入，不直接創建依賴
 * - 所有依賴通過構造函數注入
 * - 使用 IHttpContext 而不是 GravitoContext（框架無關）
 * - 不訪問任何容器或框架對象
 */

import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { IUserRepository } from '../../Domain/Repositories/IUserRepository'
import { User } from '../../Domain/Aggregates/User'

/**
 * 用戶控制器類別
 */
export class UserController {
	/**
	 * 建構子
	 * @param repository - 用戶倉儲介面實例
	 */
	constructor(private repository: IUserRepository) {}

	/**
	 * GET /api/users
	 * 列出所有用戶
	 *
	 * @param ctx - HTTP 上下文
	 * @returns JSON 回應
	 */
	async index(ctx: IHttpContext): Promise<Response> {
		try {
			const users = await this.repository.list()

			return ctx.json({
				success: true,
				data: users.map((u: any) => ({
					id: u.id,
					name: u.name,
					email: u.email,
					createdAt: u.createdAt.toISOString(),
				})),
			})
		} catch (error: any) {
			return ctx.json(
				{
					success: false,
					message: error.message || 'Failed to list users',
				},
				500,
			)
		}
	}

	/**
	 * POST /api/users
	 * 建立新用戶
	 *
	 * @param ctx - HTTP 上下文
	 * @returns JSON 回應 (201 Created)
	 */
	async store(ctx: IHttpContext): Promise<Response> {
		try {
			const body = await ctx.getJsonBody<{ name: string; email: string }>()

			// 驗證輸入
			if (!body.name || !body.email) {
				return ctx.json(
					{
						success: false,
						message: 'Missing required fields: name, email',
					},
					400,
				)
			}

			// 檢查用戶是否已存在
			const existingUser = await this.repository.findByEmail(body.email)
			if (existingUser) {
				return ctx.json(
					{
						success: false,
						message: 'User already exists',
					},
					400,
				)
			}

			// 創建用戶實體
			const id = crypto.randomUUID()
			const user = User.create(id, body.name, body.email)
			await this.repository.save(user)

			return ctx.json(
				{
					success: true,
					message: 'User created successfully',
					data: {
						id: user.id,
						name: user.name,
						email: user.email,
						createdAt: user.createdAt.toISOString(),
					},
				},
				201,
			)
		} catch (error: any) {
			return ctx.json(
				{
					success: false,
					message: error.message || 'Failed to create user',
				},
				400,
			)
		}
	}

	/**
	 * GET /api/users/:id
	 * 獲取特定用戶詳情
	 *
	 * @param ctx - HTTP 上下文
	 * @returns JSON 回應
	 */
	async show(ctx: IHttpContext): Promise<Response> {
		try {
			const id = ctx.params.id

			if (!id) {
				return ctx.json(
					{
						success: false,
						message: 'User ID is required',
					},
					400,
				)
			}

			const user = await this.repository.findById(id)

			if (!user) {
				return ctx.json(
					{
						success: false,
						message: 'User not found',
					},
					404,
				)
			}

			return ctx.json({
				success: true,
				data: {
					id: user.id,
					name: user.name,
					email: user.email,
					createdAt: user.createdAt.toISOString(),
				},
			})
		} catch (error: any) {
			return ctx.json(
				{
					success: false,
					message: error.message || 'Failed to get user',
				},
				500,
			)
		}
	}
}
