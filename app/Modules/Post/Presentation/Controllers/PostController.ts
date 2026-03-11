/**
 * @file PostController.ts
 * @description 處理 Post 模組相關的 HTTP 請求
 * @module src/Modules/Post/Presentation/Controllers
 */

import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { IPostRepository } from '../../Domain/Repositories/IPostRepository'
import type { IAuthorService } from '../../Domain/Services/IAuthorService'
import type { PostWithAuthorDTO } from '../../Application/DTOs/PostWithAuthorDTO'

/**
 * PostController 類別
 * 
 * 在 DDD 架構中屬於「表現層 (Presentation Layer)」。
 * 負責接收外部請求 (透過 IHttpContext)，調用領域層或基礎設施層的服務，並返回適當的 HTTP 響應。
 */
export class PostController {
	/**
	 * 建立 PostController 實例
	 * 
	 * @param repository - 文章倉儲介面
	 * @param authorService - 作者領域服務介面 (ACL Port)
	 */
	constructor(private repository: IPostRepository, private authorService: IAuthorService) {}

	/**
	 * 取得所有文章列表
	 * 
	 * @param ctx - HTTP 上下文介面
	 * @returns Promise 包含 HTTP 響應對象
	 */
	async index(ctx: IHttpContext): Promise<Response> {
		try {
			const items = await this.repository.findAll()
			return ctx.json({
				success: true,
				data: items,
			})
		} catch (error: any) {
			return ctx.json(
				{
					success: false,
					message: error.message || 'Failed to list items',
				},
				500,
			)
		}
	}

	/**
	 * 根據 ID 取得單一文章及其作者資訊
	 * 
	 * 此方法演示了如何透過 IAuthorService (ACL) 獲取來自 User 模組的資料。
	 * 
	 * @param ctx - HTTP 上下文介面
	 * @returns Promise 包含文章與作者複合資料的 HTTP 響應
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

			const post = await this.repository.findById(id)
			if (!post) {
				return ctx.json(
					{
						success: false,
						message: 'Item not found',
					},
					404,
				)
			}

			// 透過 ACL Port 查詢作者資訊（不直接依賴 User 模組）
			const author = await this.authorService.findAuthor(post.userId)

			// 組合 Post + Author 資訊並返回
			const postWithAuthor: PostWithAuthorDTO = {
				id: post.id,
				title: post.title,
				content: post.content,
				authorId: post.userId,
				createdAt: post.createdAt instanceof Date ? post.createdAt.toISOString() : new Date(post.createdAt).toISOString(),
				author,
			}

			return ctx.json({
				success: true,
				data: postWithAuthor,
			})
		} catch (error: any) {
			return ctx.json(
				{
					success: false,
					message: error.message || 'Failed to get item',
				},
				500,
			)
		}
	}

	/**
	 * 建立新文章
	 * 
	 * @param ctx - HTTP 上下文介面
	 * @returns Promise 包含建立結果的 HTTP 響應
	 */
	async store(ctx: IHttpContext): Promise<Response> {
		try {
			const body = await ctx.getJsonBody<any>()
			// TODO: 添加數據驗證和模型創建邏輯
			return ctx.json(
				{
					success: true,
					message: 'Item created successfully',
					data: body,
				},
				201,
			)
		} catch (error: any) {
			return ctx.json(
				{
					success: false,
					message: error.message || 'Failed to create item',
				},
				400,
			)
		}
	}
}
