/**
 * @file index.ts
 * @description User 模組公開 API 導出與裝配定義
 */

import type { IModuleDefinition } from '@/Shared/Infrastructure/Framework/ModuleDefinition'
import { UserServiceProvider } from './Infrastructure/Providers/UserServiceProvider'
import { registerUserRepositories } from './Infrastructure/Providers/registerUserRepositories'
import { registerUser } from '@/wiring/index'

// Domain
export { User } from './Domain/Aggregates/User'
export type { IUserRepository } from './Domain/Repositories/IUserRepository'

// Infrastructure
export { UserRepository } from './Infrastructure/Persistence/UserRepository'
export { UserServiceProvider } from './Infrastructure/Providers/UserServiceProvider'

// Presentation
export { UserController } from './Presentation/Controllers/UserController'
export { registerUserRoutes } from './Presentation/Routes/api'

/**
 * 裝配器專用的模組定義物件
 * 使模組可被自動掃描裝配 (Auto-Wiring)
 */
export const UserModule: IModuleDefinition = {
	name: 'User',
	provider: UserServiceProvider,
	registerRepositories: registerUserRepositories,
	registerRoutes: registerUser
}
