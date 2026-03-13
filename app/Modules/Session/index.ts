/**
 * @file index.ts
 * @description Session 模組公開 API 導出與裝配定義
 */

import type { IModuleDefinition } from '@/Shared/Infrastructure/Wiring/ModuleDefinition'
import { SessionServiceProvider } from './Infrastructure/Providers/SessionServiceProvider'
import { wireSessionRoutes } from './Infrastructure/Wiring/wireSessionRoutes'

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
export { CreateSessionService } from './Application/Services/CreateSessionService'
export { ValidateSessionService } from './Application/Services/ValidateSessionService'
export { RevokeSessionService } from './Application/Services/RevokeSessionService'
export type { ValidationResult } from './Application/Services/ValidateSessionService'

// Application - DTOs
export type { LoginDTO } from './Application/DTOs/LoginDTO'
export type { SessionDTO } from './Application/DTOs/SessionDTO'

// Infrastructure
export { MemorySessionRepository } from './Infrastructure/Persistence/MemorySessionRepository'
export { SessionServiceProvider } from './Infrastructure/Providers/SessionServiceProvider'

// Presentation
export { AuthController } from './Presentation/Controllers/AuthController'
export { registerAuthRoutes } from './Presentation/Routes/api'

/**
 * 模組定義物件（用於自動裝配）
 */
export const SessionModule: IModuleDefinition = {
  name: 'Session',
  provider: SessionServiceProvider,
  registerRoutes: wireSessionRoutes,
}
