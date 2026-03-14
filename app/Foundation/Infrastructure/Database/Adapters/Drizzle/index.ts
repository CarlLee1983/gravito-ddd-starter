/**
 * @file index.ts
 * @description Drizzle ORM 適配器進入點
 *
 * 在 DDD 架構中的角色：
 * - 基礎設施層 (Infrastructure Layer)：封裝 Drizzle ORM 的適配實現。
 * - 職責：公開符合系統介面定義的 Drizzle 適配器與連線檢查工具，支援持久化技術的熱抽換。
 *
 * @public - 匯出公開的工廠函數與相關型別
 * @internal - 實現細節對外隱藏
 *
 * **使用方式**：
 * ```typescript
 * import { createDrizzleDatabaseAccess } from '@/Foundation/Infrastructure/Database/Adapters/Drizzle'
 *
 * const db = createDrizzleDatabaseAccess()
 * const users = await db.table('users').select()
 * ```
 */

export { createDrizzleDatabaseAccess } from './DrizzleDatabaseAdapter'
export { createDrizzleConnectivityCheck } from './DrizzleConnectivityCheck'
export type { DrizzleQueryBuilder } from './DrizzleQueryBuilder'
