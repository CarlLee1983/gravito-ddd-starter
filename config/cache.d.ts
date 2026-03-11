/**
 * Cache configuration for @gravito/stasis (optional).
 * Supported drivers: 'memory', 'file', 'redis'.
 */
declare const _default: {
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
export default _default;
//# sourceMappingURL=cache.d.ts.map