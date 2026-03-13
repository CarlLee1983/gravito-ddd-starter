/**
 * @file pages.ts
 * @description Post 模組頁面路由
 *
 * 處理前端 SSR 頁面請求（文章列表、詳細頁面）
 */

import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { IPostQueryService } from '../../Application/Queries/IPostQueryService'

/**
 * 註冊 Post 頁面路由
 *
 * @param router - 模組路由器
 * @param queryService - 文章查詢服務
 */
export function registerPageRoutes(
  router: IModuleRouter,
  queryService: IPostQueryService
): void {
  // 文章列表頁面
  router.get('/posts', [], async (ctx: IHttpContext) => {
    try {
      const posts = await queryService.findAll()
      return ctx.render('Post/Index', { posts })
    } catch (error) {
      return ctx.render('Post/Index', { posts: [] })
    }
  })

  // 文章詳細頁面
  router.get('/posts/:id', [], async (ctx: IHttpContext) => {
    try {
      const { id } = ctx.params
      const post = await queryService.findById(id!)
      if (!post) {
        return ctx.render('404')
      }
      return ctx.render('Post/Detail', { post })
    } catch (error) {
      return ctx.render('404')
    }
  })

  // 新建文章頁面
  router.get('/posts/create', [], async (ctx: IHttpContext) => {
    return ctx.render('Post/Create')
  })
}
