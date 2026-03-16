/**
 * @file index.ts
 * @description Atlas ORM 適配器進入點
 *
 * 在 DDD 架構中的角色：
 * - 基礎設施層 (Infrastructure Layer)：封裝 Gravito Atlas ORM 的適配實現。
 * - 職責：隱藏具體 ORM 的底層細節，將其適配為系統定義的 IDatabaseAccess 介面，支援領域與持久化技術的解耦。
 *
 * @public - 匯出公開的工廠函數與相關型別
 * @internal - 實現細節對外隱藏
 *
 * **使用方式**：
 * ```typescript
 * import { createAtlasDatabaseAccess } from '@/Foundation/Infrastructure/Database/Adapters/Atlas'
 *
 * const db = createAtlasDatabaseAccess()
 * const users = await db.table('users').select()
 * ```
 *
 * **當切換到其他 ORM 時（如 Drizzle）：**
 * 1. 建立 `app/Foundation/Infrastructure/Database/Adapters/Drizzle/` 資料夾。
 * 2. 實現相同的公開介面 (IDatabaseAccess)。
 * 3. 在接線層 (`start/wiring/`) 中切換適配器建立邏輯。
 */

export { createAtlasDatabaseAccess, createGravitoDatabaseConnectivityCheck } from './GravitoDatabaseAdapter'
export type { AtlasQueryBuilder } from './AtlasQueryBuilder'
