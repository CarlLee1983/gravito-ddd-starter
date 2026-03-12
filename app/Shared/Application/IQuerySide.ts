export interface IQuerySide<TReadModel, TFilters = Record<string, unknown>> {
  findById(id: string): Promise<TReadModel | null>
  findAll(filters?: TFilters & { limit?: number; offset?: number }): Promise<TReadModel[]>
  count(filters?: TFilters): Promise<number>
}
