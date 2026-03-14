export class OptimisticLockException extends Error {
  constructor(
    public readonly aggregateType: string,
    public readonly aggregateId: string,
    public readonly expectedVersion: number
  ) {
    super(`[${aggregateType}] id=${aggregateId} 版本衝突：預期版本 ${expectedVersion} 已被其他操作更新`)
    this.name = 'OptimisticLockException'
  }
}
