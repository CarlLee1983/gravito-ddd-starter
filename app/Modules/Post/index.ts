/**
 * @file index.ts
 * @description Post 模組公開 API 導出與裝配定義
 */

import type { IModuleDefinition } from '@/Shared/Infrastructure/Framework/ModuleDefinition'
import { PostServiceProvider } from './Infrastructure/Providers/PostServiceProvider'
import { registerPostRepositories } from './Infrastructure/Providers/registerPostRepositories'
import { registerPostWithGravito } from '@/Shared/Infrastructure/Framework/GravitoPostAdapter'

// Domain - Aggregates
export { Post } from './Domain/Aggregates/Post'

// Domain - ValueObjects
export { Title } from './Domain/ValueObjects/Title'
export { Content } from './Domain/ValueObjects/Content'

// Domain - Events
export { PostCreated } from './Domain/Events/PostCreated'
export { PostPublished } from './Domain/Events/PostPublished'
export { PostArchived } from './Domain/Events/PostArchived'
export { PostTitleChanged } from './Domain/Events/PostTitleChanged'

// Domain - Repositories
export type { IPostRepository } from './Domain/Repositories/IPostRepository'

// Domain - Services
export type { IAuthorService } from './Domain/Services/IAuthorService'

// Application - Services
export { CreatePostService } from './Application/Services/CreatePostService'
export { GetPostService } from './Application/Services/GetPostService'

// Application - DTOs
export { PostDTO, type PostJSONData } from './Application/DTOs/PostDTO'

// Application - ReadModels (CQRS)
export type { PostReadModel } from './Application/ReadModels/PostReadModel'

// Application - Queries (CQRS)
export type { IPostQueryService } from './Application/Queries/IPostQueryService'

// Presentation
export { registerPostRoutes } from './Presentation/Routes/Post.routes'
export { PostController } from './Presentation/Controllers/PostController'

// Infrastructure
export { PostRepository } from './Infrastructure/Repositories/PostRepository'
export { PostServiceProvider } from './Infrastructure/Providers/PostServiceProvider'
export { UserCreatedHandler } from './Application/Handlers/UserCreatedHandler'

/**
 * 裝配器專用的模組定義物件
 * 使模組可被自動掃描裝配 (Auto-Wiring)
 */
export const PostModule: IModuleDefinition = {
	name: 'Post',
	provider: PostServiceProvider,
	registerRepositories: registerPostRepositories,
	registerRoutes: registerPostWithGravito
}
