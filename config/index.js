import appConfig from './app';
import cacheConfig from './cache';
import databaseConfig from './database';
import redisConfig from './redis';
export { default as app } from './app';
export { default as cache } from './cache';
export { default as database } from './database';
export { default as redis } from './redis';
export { getOrbits } from './orbits';
const useDatabase = process.env.ENABLE_DB !== 'false';
export function buildConfig(portOverride) {
    const port = portOverride ?? appConfig.port;
    return {
        ...appConfig,
        PORT: port,
        VIEW_DIR: appConfig.VIEW_DIR,
        ...(useDatabase && { database: databaseConfig }),
        cache: cacheConfig,
        redis: redisConfig,
    };
}
export { useDatabase };
