/**
 * @file index.ts
 * @description Post 模組公開 API 導出與裝配定義
 */

import type { IModuleDefinition } from '@/Shared/Infrastructure/Framework/ModuleDefinition'
import { PostServiceProvider } from './Infrastructure/Providers/PostServiceProvider'
import { registerPostRepositories } from './Infrastructure/Providers/registerPostRepositories'
import { registerPostWithGravito } from '@/Shared/Infrastructure/Framework/GravitoPostAdapter'

// Domain
export type { IPostRepository } from './Domain/Repositories/IPostRepository'

// Presentation
export { registerPostRoutes } from './Presentation/Routes/Post.routes'
export { PostController } from './Presentation/Controllers/PostController'

// Infrastructure
export { PostRepository } from './Infrastructure/Repositories/PostRepository'
export { PostServiceProvider } from './Infrastructure/Providers/PostServiceProvider'

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
