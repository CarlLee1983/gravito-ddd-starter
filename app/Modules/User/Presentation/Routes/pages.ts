/**
 * @file pages.ts
 * @description User 模組頁面路由
 *
 * 處理前端 SSR 頁面請求（用戶列表、個人檔案）
 */

import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { IUserQueryService } from '../../Application/Queries/IUserQueryService'

/**
 * 註冊 User 頁面路由
 *
 * @param router - 模組路由器
 * @param queryService - 用戶查詢服務
 */
export function registerPageRoutes(
  router: IModuleRouter,
  queryService: IUserQueryService
): void {
  // 用戶列表頁面
  router.get('/users', [], async (ctx: IHttpContext) => {
    try {
      const users = await queryService.findAll()
      return ctx.render('User/Index', { users })
    } catch (error) {
      return ctx.render('User/Index', { users: [] })
    }
  })

  // 用戶詳細頁面（檔案）
  router.get('/users/:id', [], async (ctx: IHttpContext) => {
    try {
      const { id } = ctx.params
      const user = await queryService.findById(id!)
      if (!user) {
        return ctx.render('404')
      }
      return ctx.render('User/Profile', { user })
    } catch (error) {
      return ctx.render('404')
    }
  })

  // 個人檔案頁面（已登入用戶）
  router.get('/profile', [], async (ctx: IHttpContext) => {
    const userId = ctx.get('authenticatedUserId') as string | undefined
    if (!userId) {
      return ctx.redirect('/login')
    }
    try {
      const user = await queryService.findById(userId)
      if (!user) {
        return ctx.render('404')
      }
      return ctx.render('User/MyProfile', { user })
    } catch (error) {
      return ctx.render('404')
    }
  })
}
