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

import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { IUserMessages } from '@/Modules/User/Presentation/Ports/IUserMessages'
import { CreateUserService } from '../../Application/Services/CreateUserService'
import { GetUserService } from '../../Application/Services/GetUserService'

/**
 * 用戶控制器類別
 *
 * 遵循 DDD 原則：
 * - 所有業務邏輯完全透過 Application Service 進行
 * - 不直接操作 Domain Entity 或 Repository
 * - 職責僅限於解析 HTTP 請求和格式化回應
 */
export class UserController {
	/**
	 * 建構子
	 * @param createUserService - 建立用戶應用服務
	 * @param getUserService - 查詢用戶應用服務
	 * @param userMessages - 用戶訊息服務
	 */
	constructor(
		private createUserService: CreateUserService,
		private getUserService: GetUserService,
		private userMessages: IUserMessages
	) {}

	/**
	 * GET /api/users
	 * 列出所有用戶
	 *
	 * @param ctx - HTTP 上下文
	 * @returns JSON 回應
	 */
	async index(ctx: IHttpContext): Promise<Response> {
		const users = await this.getUserService.listAll()

		return ctx.json({
			success: true,
			data: users.map(u => ({
				id: u.id,
				name: u.name,
				email: u.email,
				createdAt: u.createdAt,
			})),
		})
	}

	/**
	 * POST /api/users
	 * 建立新用戶
	 *
	 * @param ctx - HTTP 上下文
	 * @returns JSON 回應 (201 Created)
	 */
	async store(ctx: IHttpContext): Promise<Response> {
		const body = await ctx.getJsonBody<{ name: string; email: string }>()

		// 基礎輸入驗證
		if (!body.name || !body.email) {
			return ctx.json(
				{
					success: false,
					message: this.userMessages.validationMissingFields(),
				},
				400,
			)
		}

		// 透過 Application Service 執行建立用戶的業務邏輯
		const userDto = await this.createUserService.execute({
			id: crypto.randomUUID(),
			name: body.name,
			email: body.email,
		})

		return ctx.json(
			{
				success: true,
				message: this.userMessages.userCreatedSuccessfully(),
				data: userDto,
			},
			201,
		)
	}

	/**
	 * GET /api/users/:id
	 * 獲取特定用戶詳情
	 *
	 * @param ctx - HTTP 上下文
	 * @returns JSON 回應
	 */
	async show(ctx: IHttpContext): Promise<Response> {
		const id = ctx.params.id

		if (!id) {
			return ctx.json(
				{
					success: false,
					message: this.userMessages.validationUserIdRequired(),
				},
				400,
			)
		}

		// 透過 Application Service 查詢用戶
		const userDto = await this.getUserService.findById(id)

		if (!userDto) {
			return ctx.json(
				{
					success: false,
					message: this.userMessages.userNotFound(),
				},
				404,
			)
		}

		return ctx.json({
			success: true,
			data: userDto,
		})
	}
}
