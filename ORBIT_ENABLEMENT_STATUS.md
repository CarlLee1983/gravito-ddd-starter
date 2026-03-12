# Orbit Enablement Status

**Date**: 2026-03-12
**Status**: 🟡 In Progress - Module Structure Fix Required

## Summary

Redis and Cache Orbits (OrbitPlasma, OrbitStasis) cannot be enabled in gravito-ddd due to module resolution issues in gravito-core packages.

## Root Cause Analysis

### Issue 1: Package.json Export Mismatch (FIXED ✓)

**@gravito/core** declared non-existent `.cjs` exports:
```json
"exports": {
  "require": "./dist/index.cjs",  // ❌ File doesn't exist
  "default": "./dist/index.cjs"   // ❌ File doesn't exist
}
```

The build script (build.ts line 46-48) intentionally **skips CJS build** for Bun-only projects, but package.json still declared `.cjs` files.

**Fix Applied**: Updated package.json to remove non-existent `.cjs` exports:
```json
"exports": {
  "bun": "./src/index.ts",
  "types": "./dist/index.d.ts",
  "default": "./dist/index.js"
}
```

Files Modified:
- ✅ `/Users/carl/Dev/Carl/gravito-core/packages/core/package.json`
- ✅ `/Users/carl/Dev/Carl/gravito-core/packages/stasis/package.json`
- ✅ `/Users/carl/Dev/Carl/gravito-core/packages/plasma/package.json`

### Issue 2: CommonJS Build Output (FIXED ✓)

**stasis** and **plasma** were building `.cjs` files with transpiled CommonJS that had `module.exports` statements at the beginning of the file, followed by implementation code. This broke Bun's module loader.

**Fix Applied**: Disabled CJS builds entirely - converted to ESM-only:

Stasis changes (`build.ts`):
- ✅ Removed CJS build task (line 48-66)
- ✅ Removed post-build CJS export fix function (no longer needed)

Plasma changes (`build.ts`):
- ✅ Changed build command from `--format esm,cjs` to `--format esm`
- ✅ Removed post-build .cjs export fix

Files Modified:
- ✅ `/Users/carl/Dev/Carl/gravito-core/packages/stasis/build.ts`
- ✅ `/Users/carl/Dev/Carl/gravito-core/packages/plasma/build.ts`

Rebuilt packages:
- ✅ `@gravito/stasis@3.2.0` - ESM only
- ✅ `@gravito/plasma@2.0.0` - ESM only

## Remaining Issue: Module Internal Dependencies

Even with the above fixes, gravito-ddd still cannot import OrbitStasis/OrbitPlasma because:

1. **Published npm versions** are cached with old .cjs files
2. **Local development** requires workspace monorepo setup (not currently configured)
3. **Package dependencies** have internal workspace references that fail with file:// paths

### Error Observed

```
TypeError: Expected CommonJS module to have a function wrapper
at node_modules/@gravito/stasis/dist/index.cjs:808
```

The `.cjs` file still exists in node_modules because it was published to npm with the old build.

## Path Forward

### Option A: Publish Individual Package Updates (Recommended)

由於 gravito-core 中的模組各自發佈，需要分別更新版本:

**Step 1: 為各套件發佈新版本**
```bash
# 在 gravito-core 目錄中
cd /Users/carl/Dev/Carl/gravito-core/packages/core
npm version patch  # 2.0.1 → 2.0.2
npm publish

cd /Users/carl/Dev/Carl/gravito-core/packages/stasis
npm version patch  # 3.2.0 → 3.2.1
npm publish

cd /Users/carl/Dev/Carl/gravito-core/packages/plasma
npm version patch  # 2.0.0 → 2.0.1
npm publish
```

**Affected Packages**:
- @gravito/core (v2.0.1 → v2.0.2)
- @gravito/stasis (v3.2.0 → v3.2.1)
- @gravito/plasma (v2.0.0 → v2.0.1)

**Step 2: 在 gravito-ddd 中更新依賴**
```bash
bun install  # 自動取得新版本
```

### Option B: Local Monorepo Setup

**Setup**:
1. Configure gravito-ddd as a workspace that includes gravito-core packages
2. Use `workspaces` in package.json
3. Or configure bun workspace with `bunfig.toml`

**Pros**: Immediate development feedback
**Cons**: Requires restructuring

### Option C: Use Runtime Service Registration

**Instead of Orbits**:
- Manually register Redis/Cache services in InfrastructureServiceProvider
- Skip Orbit initialization
- Trade-off: Less framework integration, more manual setup

## Files Changed in gravito-core

### build.ts Files

**stasis/build.ts** (Removed CJS build):
```bash
git diff /Users/carl/Dev/Carl/gravito-core/packages/stasis/build.ts
```

**plasma/build.ts** (Changed to ESM-only):
```bash
git diff /Users/carl/Dev/Carl/gravito-core/packages/plasma/build.ts
```

### package.json Files

**core/package.json** (Fixed exports):
```bash
git diff /Users/carl/Dev/Carl/gravito-core/packages/core/package.json
```

**stasis/package.json** (Simplified exports):
```bash
git diff /Users/carl/Dev/Carl/gravito-core/packages/stasis/package.json
```

**plasma/package.json** (Simplified exports):
```bash
git diff /Users/carl/Dev/Carl/gravito-core/packages/plasma/package.json
```

## Testing

### To Verify Fixes Locally

```bash
# Navigate to gravito-core
cd /Users/carl/Dev/Carl/gravito-core/packages/stasis

# Check that .cjs file doesn't exist
ls dist/*.cjs  # Should fail

# Check that ESM is built
ls dist/index.js  # Should succeed
```

### To Enable Orbits After Publishing

1. Update gravito-ddd's package.json dependencies to new versions
2. Run `bun install`
3. Uncomment imports in `config/app/orbits.ts`:

```typescript
import { OrbitPlasma } from '@gravito/plasma'
import { OrbitStasis } from '@gravito/stasis'

export function getOrbits(options: OrbitRegistrationOptions): GravitoOrbit[] {
  return [
    ...(useDatabase ? [OrbitAtlas as unknown as GravitoOrbit] : []),
    new OrbitPlasma({ ...redis, autoConnect: true }) as any,
    OrbitStasis,
  ]
}
```

4. Pass `orbits` parameter to `defineConfig()` in `app/bootstrap.ts`:

```typescript
const config = defineConfig({
  config: configObj,
  orbits: getOrbits({ useDatabase, redis: redisConfig }),
})
```

## Technical Details

### Why Bun Cares About This

Bun's module system is stricter than Node.js:
- It validates CommonJS module format at load time
- It expects proper function wrappers for `require()` calls
- It respects ESM-only projects better than CJS-heavy ones

### Why ESM-Only is Better for Bun

1. **Native support**: Bun's JavaScript engine (JavaScriptCore) handles ESM natively
2. **No transpilation issues**: Direct parsing of ESM modules
3. **Type safety**: TypeScript support is built-in
4. **Performance**: No CJS wrapper overhead

## Documentation

See also:
- [CLAUDE.md - Bun Runtime Features](./CLAUDE.md#bun-運行時特性gravito-core)
- [Architecture - Module System](./docs/02-Architecture/)
- [@gravito/core on GitHub](https://github.com/gravito-framework/gravito)

---

**Next Steps**:
1. ☐ Merge fixes into gravito-core main branch
2. ☐ Create PR with changes
3. ☐ Test with full workspace build
4. ☐ 為各套件分別發佈新版本:
   - ☐ npm publish @gravito/core@2.0.2
   - ☐ npm publish @gravito/stasis@3.2.1
   - ☐ npm publish @gravito/plasma@2.0.1
5. ☐ Update gravito-ddd dependencies (`bun install`)
6. ☐ Uncomment Orbit imports in `config/app/orbits.ts`
7. ☐ Enable orbits in `app/bootstrap.ts` `defineConfig()`
8. ☐ Test server startup with Redis/Cache probing
