/**
 * @file index.ts
 * @description User 模組公開 API 導出與裝配定義
 */

import type { IModuleDefinition } from '@/Shared/Infrastructure/Wiring/ModuleDefinition'
import { UserServiceProvider } from './Infrastructure/Providers/UserServiceProvider'
import { registerUserRepositories } from './Infrastructure/Providers/registerUserRepositories'
import { wireUserRoutes } from './Infrastructure/Wiring/wireUserRoutes'

// Domain - Aggregates
export { User } from './Domain/Aggregates/User'

// Domain - ValueObjects
export { Email } from './Domain/ValueObjects/Email'
export { UserName } from './Domain/ValueObjects/UserName'

// Domain - Events
export { UserCreated } from './Domain/Events/UserCreated'
export { UserNameChanged } from './Domain/Events/UserNameChanged'
export { UserEmailChanged } from './Domain/Events/UserEmailChanged'

// Domain - Repositories
export type { IUserRepository } from './Domain/Repositories/IUserRepository'

// Application - Services
export { CreateUserService } from './Application/Services/CreateUserService'
export { GetUserService } from './Application/Services/GetUserService'

// Application - DTOs
export { UserDTO, type UserJSONData } from './Application/DTOs/UserDTO'
export type { AuthorDTO } from './Application/DTOs/AuthorDTO'

// Application - ReadModels (CQRS)
export type { UserReadModel } from './Application/ReadModels/UserReadModel'

// Application - Queries (CQRS)
export type { IUserQueryService } from './Application/Queries/IUserQueryService'

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
	registerRoutes: wireUserRoutes
}
