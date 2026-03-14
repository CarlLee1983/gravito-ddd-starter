/**
 * @file PostPageController.ts
 * @description Post 頁面控制器
 *
 * 處理 SSR 頁面請求：文章列表、文章詳細、建立文章頁面。
 * 封裝文章頁面的邏輯。
 */

import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { IPostQueryService } from '../../Application/Queries/IPostQueryService'

/**
 * Post 頁面控制器
 *
 * 負責文章列表、詳細頁、建立文章頁的顯示邏輯。
 */
export class PostPageController {
  constructor(private readonly queryService: IPostQueryService) {}

  /**
   * 顯示文章列表頁面。
   */
  async showIndex(ctx: IHttpContext): Promise<Response> {
    try {
      const posts = await this.queryService.findAll()
      return ctx.render('Post/Index', { posts })
    } catch (error) {
      return ctx.render('Post/Index', { posts: [] })
    }
  }

  /**
   * 顯示文章詳細頁面。
   */
  async showDetail(ctx: IHttpContext): Promise<Response> {
    try {
      const { id } = ctx.params
      const post = await this.queryService.findById(id!)
      if (!post) {
        return ctx.render('404')
      }
      return ctx.render('Post/Detail', { post })
    } catch (error) {
      return ctx.render('404')
    }
  }

  /**
   * 顯示建立文章頁面。
   * 需由 Page Guard 中間件先行設定 authenticatedUserId；未登入時重定向到 /login。
   */
  async showCreate(ctx: IHttpContext): Promise<Response> {
    const userId = ctx.get('authenticatedUserId') as string | undefined
    if (!userId) {
      return ctx.redirect('/login')
    }
    return ctx.render('Post/Create', { userId })
  }
}
