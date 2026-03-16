/**
 * @file EventStoreVersionConflictException.ts
 * @description Event Store 版本衝突異常
 *
 * 當多個併發操作嘗試為同一聚合根附加事件，且版本不匹配時拋出此異常。
 * 這確保事件按順序追加，防止並發事件寫入衝突。
 *
 * **設計模式**: Optimistic Locking
 * - 不使用鎖，而是在寫入時檢查版本
 * - 如果版本不匹配，表示其他操作已更新，拋出異常
 * - 調用方應重新載入聚合根並重試
 */

export class EventStoreVersionConflictException extends Error {
  /**
   * 建構子
   *
   * @param aggregateId - 聚合根 ID
   * @param expectedVersion - 預期版本
   * @param currentVersion - 實際版本
   */
  constructor(
    public readonly aggregateId: string,
    public readonly expectedVersion: number,
    public readonly currentVersion: number
  ) {
    super(
      `Event Store version conflict for aggregate "${aggregateId}": ` +
      `expected version ${expectedVersion}, but found ${currentVersion}. ` +
      `Another process may have modified this aggregate. Please reload and retry.`
    )
    this.name = 'EventStoreVersionConflictException'
  }
}
