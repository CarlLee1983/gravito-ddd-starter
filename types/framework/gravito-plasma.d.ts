/**
 * Type declarations for @gravito/plasma (package does not ship .d.ts).
 * Used by GravitoRedisAdapter, InfrastructureServiceProvider, GravitoHealthAdapter.
 */
declare module '@gravito/plasma' {
  export interface RedisClientContract {
    get(key: string): Promise<string | null>
    set(key: string, value: string, options?: { ex?: number }): Promise<void>
    del(key: string): Promise<void>
    ping(): Promise<string>
    exists(key: string): Promise<number>
    rpush(key: string, value: string): Promise<number>
    lpop(key: string): Promise<string | null>
    lrange(key: string, start: number, stop: number): Promise<string[]>
    llen(key: string): Promise<number>
  }
}
