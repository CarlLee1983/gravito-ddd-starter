import type { IQuerySide } from '@/Foundation/Application/IQuerySide'
import type { UserReadModel } from '../ReadModels/UserReadModel'

export interface IUserQueryService extends IQuerySide<UserReadModel> {
  findByEmail(email: string): Promise<UserReadModel | null>
}
