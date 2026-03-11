/**
 * Config 架構入口
 *
 * 集中匯出各模組設定，供 bootstrap 組裝 defineConfig。
 * - app: 應用名稱、環境、port、VIEW_DIR、debug、url
 * - database: Atlas ORM（ENABLE_DB !== 'false' 時使用）
 * - cache: Stasis 快取（可選）
 */
export { default as app } from './app';
export { default as cache } from './cache';
export { default as database } from './database';
export { default as redis } from './redis';
export { getOrbits } from './orbits';
export type { AppConfig } from './types';
export type { OrbitRegistrationOptions } from './orbits';
/** 是否啟用資料庫（ENABLE_DB !== 'false'） */
declare const useDatabase: boolean;
/**
 * 組裝給 defineConfig 使用的 config 物件
 * @param portOverride - 覆寫 app.port（例如 CLI 傳入）
 */
export declare function buildConfig(portOverride?: number): {
    cache: {
        readonly default: string;
        readonly stores: {
            readonly memory: {
                readonly driver: "memory";
                readonly maxItems: 10000;
            };
            readonly file: {
                readonly driver: "file";
                readonly directory: string;
            };
            readonly redis: {
                readonly driver: "redis";
                readonly connection: string;
                readonly prefix: string;
            };
        };
    };
    redis: {
        readonly default: "default";
        readonly connections: {
            readonly default: {
                readonly host: string;
                readonly port: number;
                readonly password: string | undefined;
            };
        };
    };
    database?: {
        readonly default: string;
        readonly connections: {
            readonly sqlite: {
                readonly driver: "sqlite";
                readonly database: string;
            };
            readonly postgres: {
                readonly driver: "postgres";
                readonly host: string;
                readonly port: number;
                readonly database: string;
                readonly username: string;
                readonly password: string;
                readonly charset: "utf8";
                readonly search_path: "public";
                readonly sslmode: string;
            };
            readonly mysql: {
                readonly driver: "mysql";
                readonly host: string;
                readonly port: number;
                readonly database: string;
                readonly username: string;
                readonly password: string;
                readonly charset: "utf8mb4";
                readonly collation: "utf8mb4_unicode_ci";
                readonly useNativeDriver: false;
            };
        };
    } | undefined;
    PORT: number;
    VIEW_DIR: string;
    name: string;
    env: string;
    port: number;
    debug: boolean;
    url: string;
};
export { useDatabase };
//# sourceMappingURL=index.d.ts.map