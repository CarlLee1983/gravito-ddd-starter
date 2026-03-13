/**
 * @file DrizzleQueryBuilder.ts
 * @description Drizzle 查詢建構器實作
 *
 * 在 DDD 架構中的角色：
 * - 基礎設施層 (Infrastructure Layer)：實作 IQueryBuilder 介面，將 Drizzle ORM 的 API 適配為系統統一的查詢介面。
 * - 職責：封裝 Drizzle 的條件構建邏輯，確保應用層能以技術無關的方式執行資料過濾、分頁與排序。
 *
 * @internal 此實現是基礎設施層細節
 */

import type { IQueryBuilder } from '@/Shared/Infrastructure/Ports/Database/IDatabaseAccess'
import type { ILogger } from '@/Shared/Infrastructure/Ports/Services/ILogger'
import { and, eq, ne, gt, lt, gte, lte, like, inArray, between, asc, desc, countDistinct } from 'drizzle-orm'
import { getDrizzleInstance } from './config'

/**
 * Drizzle 查詢建構器實作類別
 *
 * 將 Drizzle ORM 的 SQL 式查詢 API 轉換為標準的 IQueryBuilder 契約。
 */
export class DrizzleQueryBuilder implements IQueryBuilder {
  /** 儲存 Drizzle 條件表達式陣列 */
  private whereConditions: any[] = []
  /** 排序配置 */
  private orderByConfig: { column: string; direction: 'ASC' | 'DESC' } | null = null
  /** 限制筆數 */
  private limitValue: number | null = null
  /** 位移筆數 */
  private offsetValue: number | null = null

  /**
   * 建構子
   * @param db - Drizzle 資料庫實例
   * @param tableName - 資料表名稱
   * @param tableSchema - Drizzle 資料表 Schema 定義
   * @param logger - 日誌服務（可選）
   */
  constructor(
    private db: ReturnType<typeof getDrizzleInstance>,
    private tableName: string,
    private tableSchema: any,
    private logger?: ILogger
  ) {}

  /**
   * 添加 WHERE 查詢條件
   *
   * @param column - 欄位名稱 (須存在於 schema 中)
   * @param operator - 比較運算子
   * @param value - 比較值
   * @returns 回傳此實例以支援鏈式調用
   * @throws 當欄位名稱在表中不存在時拋出錯誤
   */
  where(column: string, operator: string, value: unknown): IQueryBuilder {
    const col = this.tableSchema[column]

    if (!col) {
      throw new Error(`Column "${column}" not found in table "${this.tableName}"`)
    }

    switch (operator) {
      case '=':
        this.whereConditions.push(eq(col, value))
        break
      case '!=':
      case '<>':
        this.whereConditions.push(ne(col, value))
        break
      case '>':
        this.whereConditions.push(gt(col, value))
        break
      case '<':
        this.whereConditions.push(lt(col, value))
        break
      case '>=':
        this.whereConditions.push(gte(col, value))
        break
      case '<=':
        this.whereConditions.push(lte(col, value))
        break
      case 'like':
        this.whereConditions.push(like(col, value as string))
        break
      case 'in':
        this.whereConditions.push(inArray(col, value as any[]))
        break
      default:
        throw new Error(`Unsupported operator: ${operator}`)
    }

    return this
  }

  /**
   * 取得符合條件的第一筆記錄
   *
   * @returns 回傳第一筆記錄物件，若找不到則回傳 null
   * @throws 拋出資料庫查詢錯誤
   */
  async first(): Promise<Record<string, unknown> | null> {
    try {
      let query: any = (this.db as any).select().from(this.tableSchema)

      if (this.whereConditions.length > 0) {
        query = query.where(and(...this.whereConditions))
      }

      query = query.limit(1)

      const results = await query

      return results[0] || null
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      err.message = `DrizzleQueryBuilder.first() failed: ${err.message}`
      this.logger?.error(`Error in first()`, err)
      throw err
    }
  }

  /**
   * 取得符合條件的所有多筆記錄
   *
   * @returns 記錄物件陣列
   * @throws 拋出資料庫查詢錯誤
   */
  async select(): Promise<Record<string, unknown>[]> {
    try {
      let query: any = (this.db as any).select().from(this.tableSchema)

      if (this.whereConditions.length > 0) {
        query = query.where(and(...this.whereConditions))
      }

      if (this.orderByConfig) {
        const col = this.tableSchema[this.orderByConfig.column]
        query = query.orderBy(
          this.orderByConfig.direction === 'ASC' ? asc(col) : desc(col)
        )
      }

      if (this.offsetValue) {
        query = query.offset(this.offsetValue)
      }

      if (this.limitValue) {
        query = query.limit(this.limitValue)
      }

      return await query
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      err.message = `DrizzleQueryBuilder.select() failed: ${err.message}`
      this.logger?.error(`Error in select()`, err)
      throw err
    }
  }

  /**
   * 插入一筆新記錄
   *
   * @param data - 要插入的資料物件
   * @returns 非同步作業
   */
  async insert(data: Record<string, unknown>): Promise<void> {
    try {
      await this.db.insert(this.tableSchema).values(data)
    } catch (error) {
      this.logger?.error(`Error in insert()`, error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  /**
   * 更新符合條件的記錄
   *
   * @param data - 要更新的欄位與數值
   * @returns 非同步作業
   */
  async update(data: Record<string, unknown>): Promise<void> {
    try {
      let query: any = (this.db as any).update(this.tableSchema).set(data)

      if (this.whereConditions.length > 0) {
        query = query.where(and(...this.whereConditions))
      }

      await query
    } catch (error) {
      this.logger?.error(`Error in update()`, error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  /**
   * 刪除符合條件的記錄
   *
   * @returns 非同步作業
   */
  async delete(): Promise<void> {
    try {
      let query: any = (this.db as any).delete(this.tableSchema)

      if (this.whereConditions.length > 0) {
        query = query.where(and(...this.whereConditions))
      }

      await query
    } catch (error) {
      this.logger?.error(`Error in delete()`, error instanceof Error ? error : new Error(String(error)))
      throw error
    }
  }

  /**
   * 限制回傳的記錄數量
   *
   * @param value - 最大記錄筆數
   * @returns 回傳此實例以支援鏈式調用
   */
  limit(value: number): IQueryBuilder {
    this.limitValue = value
    return this
  }

  /**
   * 跳過指定數量的記錄（分頁偏移）
   *
   * @param value - 跳過的筆數
   * @returns 回傳此實例以支援鏈式調用
   */
  offset(value: number): IQueryBuilder {
    this.offsetValue = value
    return this
  }

  /**
   * 設定資料排序規則
   *
   * @param column - 排序欄位
   * @param direction - 排序方向 (ASC 或 DESC)
   * @returns 回傳此實例以支援鏈式調用
   */
  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): IQueryBuilder {
    const normalizedDirection = direction.toUpperCase() as 'ASC' | 'DESC'
    this.orderByConfig = { column, direction: normalizedDirection }
    return this
  }

  /**
   * 計算符合條件的記錄總筆數
   *
   * @returns 符合條件的總筆數 (預設使用 id 進行 count)
   * @throws 拋出資料庫查詢錯誤
   */
  async count(): Promise<number> {
    try {
      const col = this.tableSchema.id

      let query: any = (this.db as any)
        .select({ count: countDistinct(col) })
        .from(this.tableSchema)

      if (this.whereConditions.length > 0) {
        query = query.where(and(...this.whereConditions))
      }

      const result = await query

      return result[0]?.count || 0
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      err.message = `DrizzleQueryBuilder.count() failed: ${err.message}`
      this.logger?.error(`Error in count()`, err)
      throw err
    }
  }

  /**
   * 建立範圍查詢條件 (如時間區間)
   *
   * @param column - 欄位名稱
   * @param range - [開始, 結束]
   * @returns 回傳此實例以支援鏈式調用
   */
  whereBetween(column: string, range: [Date, Date]): IQueryBuilder {
    const col = this.tableSchema[column]

    if (!col) {
      throw new Error(`Column "${column}" not found in table "${this.tableName}"`)
    }

    this.whereConditions.push(between(col, range[0], range[1]))
    return this
  }
}
