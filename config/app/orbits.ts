/**
 * Orbit 註冊表
 *
 * 集中管理 Gravito Orbits，新增模組時只需：
 * 1. 在下方 import 該 Orbit
 * 2. 在 getOrbits() 的對應區塊加入實例（必要時用 options 做條件載入）
 *
 * 📍 STATUS: Orbits 暫時禁用 ⏳ (Bun ESM/CJS 相容性問題)
 *
 * Bun 的構建系統在生成 ESM 模組時會自動產生 CJS compatibility helpers。
 * 這些 helpers 與 ESM export 語句衝突，導致模組載入失敗。
 * 即使轉換為 ESM import 也無法規避（Bun 內部構建機制）。
 *
 * 解決方案：禁用 FFI，使用 JavaScript fallback 實現（性能影響極小）
 * TODO: 當 Bun 改進其 ESM 模組構建時重新啟用 Orbits
 *
 * 詳見: bun-compatibility-resolution.md
 */

import type { GravitoOrbit } from '@gravito/core'
// TODO: 待 Bun ESM 模組系統改進
// import { OrbitAtlas } from '@gravito/atlas'
// import { OrbitPlasma } from '@gravito/plasma'
// import { OrbitStasis } from '@gravito/stasis'

export type OrbitRegistrationOptions = {
	/** 是否啟用資料庫（OrbitAtlas） */
	useDatabase: boolean
	/** Redis 設定（OrbitPlasma） */
	redis: Record<string, unknown>
}

/**
 * 依目前設定組出要載入的 Orbits 清單。
 * 執行順序：Prism → Atlas(可選) → Plasma → Stasis → Signal → 其他
 *
 * ⏳ OrbitPlasma + OrbitStasis 暫時禁用（Bun FFI 相容性）
 * 應用程式可以透過自訂的 ServiceProvider 直接註冊 Redis/Cache 服務
 */
export function getOrbits(options: OrbitRegistrationOptions): GravitoOrbit[] {
	// FFI 相容性問題 - 所有 Orbits 暫時禁用
	// 應用程式應在 ServiceProvider 中手動註冊所需服務
	return []
}
