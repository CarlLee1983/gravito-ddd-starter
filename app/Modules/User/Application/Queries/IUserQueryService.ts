import type { IQuerySide } from '@/Shared/Application/IQuerySide'
import type { UserReadModel } from '../ReadModels/UserReadModel'

export interface IUserQueryService extends IQuerySide<UserReadModel> {
  findByEmail(email: string): Promise<UserReadModel | null>
}
