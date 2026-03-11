/**
 * @file index.ts
 * @description Post 模組的公開入口點
 * @module src/Modules/Post
 */

// Domain Layer
export type { IPostRepository } from './Domain/Repositories/IPostRepository'

// Presentation Layer
export { registerPostRoutes } from './Presentation/Routes/Post.routes'
export { PostController } from './Presentation/Controllers/PostController'

// Infrastructure Layer
export { PostRepository } from './Infrastructure/Repositories/PostRepository'
export { PostServiceProvider } from './Infrastructure/Providers/PostServiceProvider'
