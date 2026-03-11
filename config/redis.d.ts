/**
 * Redis configuration for @gravito/plasma (OrbitPlasma).
 * Used by cache (Stasis redis store), session, queue, etc.
 */
declare const _default: {
    readonly default: "default";
    readonly connections: {
        readonly default: {
            readonly host: string;
            readonly port: number;
            readonly password: string | undefined;
        };
    };
};
export default _default;
//# sourceMappingURL=redis.d.ts.map