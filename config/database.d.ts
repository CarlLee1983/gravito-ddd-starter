/**
 * Database configuration for @gravito/atlas.
 * Used only when ENABLE_DB is not 'false'.
 */
declare const _default: {
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
};
export default _default;
//# sourceMappingURL=database.d.ts.map