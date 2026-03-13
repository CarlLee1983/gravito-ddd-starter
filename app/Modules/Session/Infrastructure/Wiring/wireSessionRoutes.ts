/**
 * @file wireSessionRoutes.ts
 * @description Session 模組路由接線
 *
 * 組裝 AuthController 並註冊認證路由。
 */

import type { IRouteRegistrationContext } from '@/Shared/Infrastructure/Wiring/ModuleDefinition'
import { AuthController } from '../../Presentation/Controllers/AuthController'
import { registerAuthRoutes } from '../../Presentation/Routes/api'
import type { IUserRepository } from '@/Modules/User/Domain/Repositories/IUserRepository'
import type { CreateSessionService } from '../../Application/Services/CreateSessionService'
import type { RevokeSessionService } from '../../Application/Services/RevokeSessionService'
import { resolveRepository } from '@wiring/RepositoryResolver'

/**
 * 註冊 Session 模組路由
 *
 * @param ctx - 路由註冊 Context
 */
export function wireSessionRoutes(ctx: IRouteRegistrationContext): void {
  // 根據上下文創建路由器（支持 JWT Guard）
  const router = ctx.createAuthRouter?.() ?? ctx.createModuleRouter()

  // 從容器取得依賴
  const createSessionService = ctx.container.make('createSessionService') as CreateSessionService
  const revokeSessionService = ctx.container.make('revokeSessionService') as RevokeSessionService
  const userRepository = resolveRepository('user') as IUserRepository

  // 組裝控制器
  const controller = new AuthController(createSessionService, revokeSessionService, userRepository)

  // 註冊路由
  registerAuthRoutes(router as any, controller)
}
