/**
 * @file TransactionIsolationLevel.ts
 * @description 資料庫事務隔離等級定義
 *
 * 遵循 ANSI SQL 標準的四個隔離等級，控制併發事務間的可見性。
 *
 * **隔離等級對比**:
 * | 等級 | 髒讀 | 不可重複讀 | 幻讀 | 性能 |
 * |------|------|----------|------|------|
 * | READ_UNCOMMITTED | ✓ | ✓ | ✓ | ⚡⚡⚡ |
 * | READ_COMMITTED | ✗ | ✓ | ✓ | ⚡⚡ |
 * | REPEATABLE_READ | ✗ | ✗ | ✓ | ⚡ |
 * | SERIALIZABLE | ✗ | ✗ | ✗ | ⚠️ |
 *
 * **推薦使用**:
 * - 高並發讀取 → READ_COMMITTED
 * - 金融交易 → REPEATABLE_READ
 * - 強一致性 → SERIALIZABLE (使用需謹慎，可能造成死鎖)
 */

/**
 * 資料庫事務隔離等級列舉
 *
 * @public
 */
export enum TransactionIsolationLevel {
  /**
   * 讀未提交（最寬鬆）
   *
   * **特性**:
   * - 允許髒讀：可讀取其他未提交事務的變更
   * - 允許不可重複讀
   * - 允許幻讀
   *
   * **使用場景**:
   * - 報表統計（對精確性要求不高）
   * - 實驗性查詢
   * - 最大化吞吐量場景
   *
   * **風險**: 讀取的數據可能被回滾，造成業務邏輯混亂
   */
  READ_UNCOMMITTED = 'READ_UNCOMMITTED',

  /**
   * 讀已提交（推薦用於高並發）
   *
   * **特性**:
   * - 不允許髒讀：只讀取已提交事務的變更
   * - 允許不可重複讀：同一事務內，行數據可被其他事務修改
   * - 允許幻讀：新增/刪除的行在掃描中可見
   *
   * **使用場景**:
   * - 高並發 Web 應用（OLTP）
   * - 大多數業務系統
   * - 性能和一致性的平衡點
   *
   * **說明**: 大多數數據庫系統的默認隔離級別
   */
  READ_COMMITTED = 'READ_COMMITTED',

  /**
   * 可重複讀（MySQL 默認）
   *
   * **特性**:
   * - 不允許髒讀
   * - 不允許不可重複讀：一旦讀取行，該行在事務期間不會被修改
   * - 允許幻讀：新行可能在重新掃描時出現
   *
   * **使用場景**:
   * - 需要事務內一致讀取的業務邏輯
   * - 金融交易（部分保護）
   * - 庫存管理系統
   *
   * **說明**: MySQL InnoDB 的默認級別
   */
  REPEATABLE_READ = 'REPEATABLE_READ',

  /**
   * 可序列化（最嚴格）
   *
   * **特性**:
   * - 完全隔離：事務按序列執行
   * - 不允許髒讀、不可重複讀、幻讀
   * - 最高的數據一致性保證
   *
   * **使用場景**:
   * - 關鍵金融交易（轉帳、清算）
   * - 庫存倒扣（防超賣）
   * - 審計日誌（需絕對準確）
   *
   * **警告**:
   * - 性能開銷大（可能序列化瓶頸）
   * - 容易引發死鎖
   * - 應配合重試機制使用
   *
   * **實現細節**: 記憶體實現使用全表互斥鎖
   */
  SERIALIZABLE = 'SERIALIZABLE',
}

/**
 * 取得隔離等級的說明
 *
 * @param level - 隔離等級
 * @returns 隔離等級的人類可讀說明
 *
 * @example
 * ```typescript
 * const desc = getIsolationLevelDescription(TransactionIsolationLevel.REPEATABLE_READ)
 * // "可重複讀：不允許髒讀、不可重複讀，但允許幻讀"
 * ```
 */
export function getIsolationLevelDescription(level: TransactionIsolationLevel): string {
  const descriptions: Record<TransactionIsolationLevel, string> = {
    [TransactionIsolationLevel.READ_UNCOMMITTED]:
      '讀未提交：允許髒讀、不可重複讀、幻讀（最大並發，最低一致性）',
    [TransactionIsolationLevel.READ_COMMITTED]:
      '讀已提交：不允許髒讀，允許不可重複讀、幻讀（推薦高並發）',
    [TransactionIsolationLevel.REPEATABLE_READ]:
      '可重複讀：不允許髒讀、不可重複讀，允許幻讀（MySQL 默認）',
    [TransactionIsolationLevel.SERIALIZABLE]:
      '可序列化：完全隔離，無髒讀、不可重複讀、幻讀（最高一致性，性能成本大）',
  }
  return descriptions[level]
}

/**
 * 比較兩個隔離等級的嚴格程度
 *
 * @param level1 - 第一個隔離等級
 * @param level2 - 第二個隔離等級
 * @returns 正數表示 level1 更嚴格，負數表示 level2 更嚴格，0 表示相同
 *
 * @example
 * ```typescript
 * const cmp = compareIsolationLevel(
 *   TransactionIsolationLevel.READ_COMMITTED,
 *   TransactionIsolationLevel.REPEATABLE_READ
 * )
 * // 返回 -1（READ_COMMITTED 不如 REPEATABLE_READ 嚴格）
 * ```
 */
export function compareIsolationLevel(
  level1: TransactionIsolationLevel,
  level2: TransactionIsolationLevel
): number {
  const order: Record<TransactionIsolationLevel, number> = {
    [TransactionIsolationLevel.READ_UNCOMMITTED]: 0,
    [TransactionIsolationLevel.READ_COMMITTED]: 1,
    [TransactionIsolationLevel.REPEATABLE_READ]: 2,
    [TransactionIsolationLevel.SERIALIZABLE]: 3,
  }
  return order[level1] - order[level2]
}
