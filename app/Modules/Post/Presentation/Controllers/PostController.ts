/**
 * @file PostController.ts
 * @description 處理 Post 模組相關的 HTTP 請求
 * @module src/Modules/Post/Presentation/Controllers
 */

import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { CreatePostService } from '../../Application/Services/CreatePostService'
import { GetPostService } from '../../Application/Services/GetPostService'

/**
 * PostController 類別
 *
 * 在 DDD 架構中屬於「表現層 (Presentation Layer)」。
 * 負責接收外部請求並返回適當的 HTTP 響應。
 *
 * 遵循 DDD 原則：
 * - 所有業務邏輯完全透過 Application Service 進行
 * - 不直接操作 Domain Entity 或 Repository
 * - 職責僅限於解析 HTTP 請求和格式化回應
 */
export class PostController {
	/**
	 * 建立 PostController 實例
	 *
	 * @param createPostService - 建立文章應用服務
	 * @param getPostService - 查詢文章應用服務
	 */
	constructor(
		private createPostService: CreatePostService,
		private getPostService: GetPostService
	) {}

	/**
	 * GET /api/posts
	 * 取得所有文章列表
	 *
	 * @param ctx - HTTP 上下文介面
	 * @returns Promise 包含 HTTP 響應對象
	 */
	async index(ctx: IHttpContext): Promise<Response> {
		try {
			const posts = await this.getPostService.listAll()
			return ctx.json({
				success: true,
				data: posts,
			})
		} catch (error: any) {
			return ctx.json(
				{
					success: false,
					message: error.message || 'Failed to list posts',
				},
				500,
			)
		}
	}

	/**
	 * GET /api/posts/:id
	 * 取得單一文章詳情
	 *
	 * @param ctx - HTTP 上下文介面
	 * @returns Promise 包含文章資料的 HTTP 響應
	 */
	async show(ctx: IHttpContext): Promise<Response> {
		try {
			const id = ctx.params.id
			if (!id) {
				return ctx.json(
					{
						success: false,
						message: 'ID is required',
					},
					400,
				)
			}

			// 透過 Application Service 查詢文章
			const postDto = await this.getPostService.findById(id)

			if (!postDto) {
				return ctx.json(
					{
						success: false,
						message: 'Post not found',
					},
					404,
				)
			}

			return ctx.json({
				success: true,
				data: postDto,
			})
		} catch (error: any) {
			return ctx.json(
				{
					success: false,
					message: error.message || 'Failed to get post',
				},
				500,
			)
		}
	}

	/**
	 * POST /api/posts
	 * 建立新文章
	 *
	 * @param ctx - HTTP 上下文介面
	 * @returns Promise 包含建立結果的 HTTP 響應
	 */
	async store(ctx: IHttpContext): Promise<Response> {
		try {
			const body = await ctx.getJsonBody<{ title: string; content?: string; authorId: string }>()

			// 基礎輸入驗證
			if (!body.title || !body.authorId) {
				return ctx.json(
					{
						success: false,
						message: 'Missing required fields: title, authorId',
					},
					400,
				)
			}

			// 透過 Application Service 執行建立文章的業務邏輯
			const postDto = await this.createPostService.execute({
				id: crypto.randomUUID(),
				title: body.title,
				content: body.content,
				authorId: body.authorId,
			})

			return ctx.json(
				{
					success: true,
					message: 'Post created successfully',
					data: postDto,
				},
				201,
			)
		} catch (error: any) {
			// 根據不同的錯誤類型返回適當的 HTTP 狀態碼
			const statusCode = error.message?.includes('已') ? 400 : 400
			return ctx.json(
				{
					success: false,
					message: error.message || 'Failed to create post',
				},
				statusCode,
			)
		}
	}
}
