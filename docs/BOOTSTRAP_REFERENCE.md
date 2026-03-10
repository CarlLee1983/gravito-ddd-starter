# Bootstrap Reference Guide

## Overview

The bootstrap process initializes the Gravito DDD application with a clear, predictable sequence. This guide explains the architecture and execution flow.

## Architecture

### File Structure

```
src/
├── bootstrap.ts      ← DDD 啟動流程（核心邏輯）
├── app.ts            ← 應用包裝函式
├── index.ts          ← HTTP 伺服器啟動
└── routes.ts         ← 路由註冊
```

### Responsibility Separation

| File | Responsibility |
|------|-----------------|
| `bootstrap.ts` | DDD startup sequence (framework initialization) |
| `app.ts` | Application wrapper (calls bootstrap) |
| `index.ts` | HTTP server startup (displays welcome message) |
| `routes.ts` | Route registration (modules + API endpoints) |

## Startup Flow

### Step-by-Step Execution

```
1. src/index.ts starts
   ↓
2. Calls createApp() from src/app.ts
   ↓
3. app.ts calls bootstrap(port) from src/bootstrap.ts
   ↓
4. bootstrap() executes 6 phases:

   Phase 1: Build configuration (buildConfig)
            └─ Loads environment variables
            └─ Creates app config object

   Phase 2: Initialize Gravito core (defineConfig)
            └─ Sets up framework configuration
            └─ Creates PlanetCore instance

   Phase 3: Register ServiceProviders
            └─ Health module (no dependencies)
            └─ User module (core dependencies)
            └─ Future modules in dependency order

   Phase 4: Bootstrap providers (core.bootstrap)
            └─ Executes ServiceProvider.boot() methods
            └─ Initializes database, cache, etc.

   Phase 5: Register routes (registerRoutes)
            └─ Registers all module routes
            └─ Registers API endpoints

   Phase 6: Error handlers (registerGlobalErrorHandlers)
            └─ Configures exception handling

   ↓ Returns PlanetCore instance

5. index.ts starts HTTP server (core.liftoff)
   ↓
6. Displays welcome message with endpoints
   ↓
7. Server running and ready for requests
```

## Code Overview

### bootstrap.ts (DDD Initialization)

```typescript
export async function bootstrap(port = 3000): Promise<PlanetCore> {
  // Phase 1: Configuration
  const configObj = buildConfig(port)

  // Phase 2: Core initialization
  const config = defineConfig({ config: configObj })
  const core = new PlanetCore(config)

  // Phase 3: Register ServiceProviders (order matters!)
  core.register(createGravitoServiceProvider(new HealthServiceProvider()))
  core.register(createGravitoServiceProvider(new UserServiceProvider()))

  // Phase 4: Bootstrap all providers
  await core.bootstrap()

  // Phase 5: Register routes
  await registerRoutes(core)

  // Phase 6: Error handlers
  core.registerGlobalErrorHandlers()

  return core
}
```

**Key Design Principles**:
1. **Framework-agnostic**: Only Gravito-specific code here
2. **Modular**: Each phase has a clear responsibility
3. **Ordered**: ServiceProvider order respects dependencies
4. **Documentable**: Clear comments for each phase

### app.ts (Application Wrapper)

```typescript
export async function createApp() {
  const port = (process.env.PORT as unknown as number) || 3000
  const core = await bootstrap(port)
  return core
}
```

**Purpose**:
- Bridges src/index.ts and bootstrap.ts
- Handles port configuration
- Abstraction layer for testing

### index.ts (Server Startup)

```typescript
async function start() {
  // Initialize app
  const core = await createApp()
  const configObj = core.config.all()

  // Start HTTP server
  const port = (configObj.PORT as number) || 3000
  const server = core.liftoff(port)

  // Display welcome message
  console.log(`...startup message...`)

  return server
}
```

**Responsibilities**:
- Calls createApp()
- Starts HTTP server
- Displays user-friendly startup information
- Handles startup errors

## Adding New Modules

### When to Register

In **bootstrap.ts**, after existing modules but before `core.bootstrap()`:

```typescript
// GOOD: Register in order of dependencies
core.register(createGravitoServiceProvider(new HealthServiceProvider()))
core.register(createGravitoServiceProvider(new UserServiceProvider()))
core.register(createGravitoServiceProvider(new OrderServiceProvider())) // New!
core.register(createGravitoServiceProvider(new PaymentServiceProvider())) // New!

await core.bootstrap()
```

### Dependency Order Rules

```
No dependencies          → Register FIRST
├─ Health
├─ Config
└─ Database

Single-module deps       → Register SECOND
├─ User (depends on Health)
├─ Product (depends on Health)
└─ Order (depends on Health)

Multi-module deps        → Register LAST
├─ Payment (depends on User, Order)
└─ Audit (depends on Payment)
```

### Example: Adding Payment Module

**Step 1: Create module**
```bash
bun scripts/generate-module.ts Payment --redis --cache --db
```

**Step 2: Update bootstrap.ts**
```typescript
import { PaymentServiceProvider } from './Modules/Payment/Infrastructure/Providers/PaymentServiceProvider'

export async function bootstrap(port = 3000): Promise<PlanetCore> {
  // ... existing code ...

  // Register Payment (after User since it depends on it)
  core.register(createGravitoServiceProvider(new PaymentServiceProvider()))

  // ... rest of bootstrap ...
}
```

**Step 3: Register routes in routes.ts**
```typescript
import { registerPayment } from './wiring'

export async function registerRoutes(core: PlanetCore) {
  // ... other routes ...
  registerPayment(core)
}
```

## Configuration Management

### Environment Variables

Bootstrap reads from `.env`:

```env
PORT=3000
APP_NAME=gravito-ddd-starter
APP_ENV=development
APP_DEBUG=true
APP_URL=http://localhost:3000
ENABLE_DB=true
CACHE_DRIVER=memory
```

### Configuration Loading

```typescript
// src/config/index.ts
export function buildConfig(port?: number) {
  return {
    app: {
      name: process.env.APP_NAME || 'gravito-ddd-starter',
      env: process.env.APP_ENV || 'development',
      debug: process.env.APP_DEBUG === 'true',
      port: port || (process.env.PORT as unknown as number) || 3000,
    },
    // ... more config
  }
}
```

## Testing Bootstrap

### Unit Test Example

```typescript
import { bootstrap } from '@/bootstrap'
import { PlanetCore } from '@gravito/core'

describe('Bootstrap', () => {
  it('should initialize PlanetCore', async () => {
    const core = await bootstrap(3001)

    expect(core).toBeInstanceOf(PlanetCore)
    expect(core.config).toBeDefined()
  })

  it('should register all ServiceProviders', async () => {
    const core = await bootstrap(3001)

    // Verify registered services
    const healthService = core.container.make('healthRepository')
    expect(healthService).toBeDefined()
  })

  it('should register all routes', async () => {
    const core = await bootstrap(3001)

    // Routes are registered and accessible
    expect(core.router).toBeDefined()
  })
})
```

### Integration Test Example

```typescript
import { createApp } from '@/app'

describe('Application Integration', () => {
  it('should start server', async () => {
    const core = await createApp()

    // Test API endpoints
    const response = await fetch('http://localhost:3000/health')
    expect(response.status).toBe(200)
  })

  it('should serve all modules', async () => {
    const core = await createApp()

    // Health module
    const healthRes = await fetch('http://localhost:3000/health')
    expect(healthRes.status).toBe(200)

    // User module
    const userRes = await fetch('http://localhost:3000/api/users')
    expect(userRes.status).toBe(200)
  })
})
```

## Error Handling

### Startup Errors

If bootstrap fails:

```typescript
const server = await start().catch((error) => {
  console.error('❌ Application startup failed:', error)
  process.exit(1)
})
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Port already in use | Another app on port 3000 | Change PORT env var |
| Database connection fails | DB not running | Check ENABLE_DB setting |
| Service not found | ServiceProvider not registered | Add to bootstrap.ts |
| Routes not working | registerRoutes not called | Check bootstrap.ts |

## Performance Considerations

### Bootstrap Time

- **Typical**: 100-500ms
- **With Database**: 500ms-2s
- **With Redis**: Add 100-200ms

### Optimization Tips

1. **Load only needed orbits** — Disable ENABLE_DB if not needed
2. **Lazy load modules** — Register services on-demand (future)
3. **Cache configuration** — Use environment variables, not file reads
4. **Parallel initialization** — Some services can initialize in parallel

## Comparison: gravito-ddd-starter vs cmg-station-ddd

### Similarity

| Aspect | Both |
|--------|------|
| Bootstrap function | Centralizes initialization |
| ServiceProvider registration | Uses Gravito adapter |
| Route registration | After bootstrap complete |
| Error handling | Global handlers |

### Difference

| Aspect | gravito-ddd-starter | cmg-station-ddd |
|--------|-------|--------|
| Orbits | Not implemented | Fully implemented (db, cache, redis, events) |
| ServiceProviders | 2 modules | 10+ modules |
| Configuration | Simple config | Complex config with orbits |
| Complexity | Starter-level | Production-level |

## Future Enhancements

### Planned Improvements

1. **Lazy Loading** — Load modules on-demand
2. **Orbit Configuration** — Support database, cache, events
3. **Health Checks** — Verify all services started correctly
4. **Metrics** — Track startup time by phase
5. **Plugins** — Allow plugins to hook into bootstrap phases

### Example: Future Orbit Support

```typescript
export async function bootstrap(port = 3000) {
  // ... current code ...

  // Future: Configure orbits
  const orbits = getOrbits({
    database: true,
    cache: true,
    redis: true,
    events: true,
  })

  const core = await PlanetCore.boot(
    defineConfig({
      config: configObj,
      orbits, // Will add extensive capabilities
    })
  )

  // ... rest of bootstrap ...
}
```

## Summary

The bootstrap process in gravito-ddd-starter:

✅ **Clear**: 6 well-defined phases
✅ **Modular**: Separated concerns (bootstrap.ts, app.ts, index.ts)
✅ **Extensible**: Easy to add new modules
✅ **Testable**: Each phase can be unit tested
✅ **Framework-agnostic**: Application logic separate from Gravito details
✅ **Production-ready**: Error handling, configuration management

Use this guide when:
- Adding new modules
- Debugging startup issues
- Optimizing application startup
- Testing the application
- Understanding the DDD architecture

## References

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Complete DDD architecture
- [MODULE_GENERATION_WITH_ADAPTERS.md](./MODULE_GENERATION_WITH_ADAPTERS.md) — Module generation
- [cmg-station-ddd/bootstrap.ts](../../../CMG/cmg-station-ddd/src/bootstrap.ts) — Production reference
