/**
 * User Controller
 * 控制器接收依賴注入，不直接創建依賴
 *
 * 設計原則：
 * - 所有依賴通過構造函數注入
 * - 使用 IHttpContext 而不是 GravitoContext（框架無關）
 * - 不訪問任何容器或框架對象
 */

import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { CreateUserHandler } from '../../Application/Commands/CreateUser/CreateUserHandler'
import type { IUserRepository } from '../../Domain/Repositories/IUserRepository'

export class UserController {
	constructor(
		private repository: IUserRepository,
		private createUserHandler: CreateUserHandler,
	) {}

	/**
	 * GET /api/users
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

			const user = await this.createUserHandler.handle({
				name: body.name,
				email: body.email,
			})

			return ctx.json(
				{
					success: true,
					message: 'User created successfully',
					data: user,
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
