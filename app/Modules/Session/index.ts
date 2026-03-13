/**
 * @file index.ts
 * @description Session 模組公開 API 導出與裝配定義
 */

import type { IModuleDefinition } from '@/Shared/Infrastructure/Wiring/ModuleDefinition'
import { SessionServiceProvider } from './Infrastructure/Providers/SessionServiceProvider'

// Domain - Aggregates
export { Session } from './Domain/Aggregates/Session'

// Domain - ValueObjects
export { SessionId } from './Domain/ValueObjects/SessionId'

// Domain - Events
export { SessionCreated } from './Domain/Events/SessionCreated'
export { SessionRevoked } from './Domain/Events/SessionRevoked'

// Domain - Repositories
export type { ISessionRepository } from './Domain/Repositories/ISessionRepository'

// Domain - Exceptions
export { InvalidCredentialsException } from './Domain/Exceptions/InvalidCredentialsException'
export { SessionExpiredException } from './Domain/Exceptions/SessionExpiredException'

// Application - Services
export { ValidateSessionService } from './Application/Services/ValidateSessionService'
export type { ValidationResult } from './Application/Services/ValidateSessionService'

// Application - DTOs
export type { LoginDTO } from './Application/DTOs/LoginDTO'
export type { SessionDTO } from './Application/DTOs/SessionDTO'

// Infrastructure
export { MemorySessionRepository } from './Infrastructure/Persistence/MemorySessionRepository'
export { SessionServiceProvider } from './Infrastructure/Providers/SessionServiceProvider'

/**
 * 模組定義物件（用於自動裝配）
 *
 * 🔒 Session 為內部服務模組
 *
 * 架構角色：
 * - 由 Auth 模組獨占使用
 * - 管理用戶認證會話的生命週期
 * - 不對外公開 HTTP 路由
 *
 * 生命週期：
 * - 登入時：Auth.LoginService → SessionRepository.create()
 * - 驗證時：Auth.ValidateSessionService → ISessionRepository.validate()
 * - 登出時：Auth.LogoutService → ISessionRepository.revoke()
 *
 * 無需實現 registerRoutes()，因為會話操作完全由 Auth 模組管理
 */
export const SessionModule: IModuleDefinition = {
  name: 'Session',
  provider: SessionServiceProvider,
  // Session 為內部服務，無需 HTTP 路由層 (Presentation)
}
