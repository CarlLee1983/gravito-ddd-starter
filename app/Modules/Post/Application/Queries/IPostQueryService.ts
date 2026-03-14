import type { IQuerySide } from '@/Foundation/Application/IQuerySide'
import type { PostReadModel } from '../ReadModels/PostReadModel'

export interface IPostQueryService extends IQuerySide<PostReadModel> {
  findByTitle(title: string): Promise<PostReadModel | null>
  findByAuthor(authorId: string): Promise<PostReadModel[]>
}
