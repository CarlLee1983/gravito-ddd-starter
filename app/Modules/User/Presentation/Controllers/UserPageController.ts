/**
 * @file UserPageController.ts
 * @description User 頁面控制器
 *
 * 處理 SSR 頁面請求：用戶列表、用戶詳細、個人檔案。
 * 封裝用戶頁面的邏輯。
 */

import type { IHttpContext } from '@/Foundation/Presentation/IHttpContext'
import type { IUserQueryService } from '../../Application/Queries/IUserQueryService'

/**
 * User 頁面控制器
 *
 * 負責用戶列表、詳細頁、個人檔案頁的顯示邏輯。
 */
export class UserPageController {
  constructor(private readonly queryService: IUserQueryService) {}

  /**
   * 顯示用戶列表頁面。
   */
  async showIndex(ctx: IHttpContext): Promise<Response> {
    try {
      const users = await this.queryService.findAll()
      return ctx.render('User/Index', { users })
    } catch (error) {
      return ctx.render('User/Index', { users: [] })
    }
  }

  /**
   * 顯示用戶詳細頁面（公開檔案）。
   */
  async showProfile(ctx: IHttpContext): Promise<Response> {
    try {
      const { id } = ctx.params
      const user = await this.queryService.findById(id!)
      if (!user) {
        return ctx.render('404')
      }
      return ctx.render('User/Profile', { user })
    } catch (error) {
      return ctx.render('404')
    }
  }

  /**
   * 顯示個人檔案頁面。
   * 需由 Page Guard 中間件先行設定 authenticatedUserId；未登入時重定向到 /login。
   */
  async showMyProfile(ctx: IHttpContext): Promise<Response> {
    const userId = ctx.get('authenticatedUserId') as string | undefined
    if (!userId) {
      return ctx.redirect('/login')
    }
    try {
      const user = await this.queryService.findById(userId)
      if (!user) {
        return ctx.render('404')
      }
      return ctx.render('User/MyProfile', { user })
    } catch (error) {
      return ctx.render('404')
    }
  }
}
