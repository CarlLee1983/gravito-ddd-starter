/**
 * Migration Helper - 簡化 Laravel 風格的 migration 編寫
 *
 * 提供便利函數讓 migration 檔案更清晰地使用 SchemaBuilder
 */
type AtlasOrbit = any;
import { type ITableBuilder } from './SchemaBuilder';
/**
 * 在 migration 中建立表
 *
 * @example
 * ```typescript
 * await createTable(db, 'users', (t) => {
 *   t.id()
 *   t.string('name').notNull()
 *   t.timestamps()
 * })
 * ```
 */
export declare function createTable(db: AtlasOrbit, table: string, callback: (t: ITableBuilder) => void): Promise<void>;
/**
 * 在 migration 中刪除表
 *
 * @example
 * ```typescript
 * await dropTable(db, 'users')
 * ```
 */
export declare function dropTable(db: AtlasOrbit, table: string): Promise<void>;
/**
 * 在 migration 中刪除表（如果存在）
 *
 * @example
 * ```typescript
 * await dropTableIfExists(db, 'users')
 * ```
 */
export declare function dropTableIfExists(db: AtlasOrbit, table: string): Promise<void>;
/**
 * 執行原始 SQL 語句（用於自訂邏輯）
 *
 * @example
 * ```typescript
 * await rawSQL(db, 'ALTER TABLE users ADD INDEX idx_email (email)')
 * ```
 */
export declare function rawSQL(db: AtlasOrbit, sqlStatement: string): Promise<void>;
export {};
//# sourceMappingURL=MigrationHelper.d.ts.map