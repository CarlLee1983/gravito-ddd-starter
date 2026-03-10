/**
 * Post Module
 * 公開 API 導出
 */

// Domain
export type { IPostRepository } from './Domain/Repositories/IPostRepository'

// Presentation
export { registerPostRoutes } from './Presentation/Routes/Post.routes'
export { PostController } from './Presentation/Controllers/PostController'

// Infrastructure
export { PostRepository } from './Infrastructure/Repositories/PostRepository'
export { PostServiceProvider } from './Infrastructure/Providers/PostServiceProvider'
