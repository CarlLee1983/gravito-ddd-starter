/**
 * @file index.ts
 * @description Auth 模組公開 API 導出與裝配定義
 */

import type { IModuleDefinition } from '@/Shared/Infrastructure/Wiring/ModuleDefinition'
import { AuthServiceProvider } from './Infrastructure/Providers/AuthServiceProvider'
import { wireAuthRoutes } from './Infrastructure/Wiring/wireAuthRoutes'

// Application - Services
export { LoginService } from './Application/Services/LoginService'
export { RegisterService } from './Application/Services/RegisterService'
export { LogoutService } from './Application/Services/LogoutService'

// Application - DTOs
export type { SessionDTO } from './Application/DTOs/SessionDTO'

// Presentation
export { AuthController } from './Presentation/Controllers/AuthController'

/**
 * 模組定義物件（用於自動裝配）
 */
export const AuthModule: IModuleDefinition = {
  name: 'Auth',
  provider: AuthServiceProvider,
  registerRoutes: wireAuthRoutes,
}
