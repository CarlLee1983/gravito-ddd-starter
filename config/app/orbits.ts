/**
 * Orbit 註冊表
 *
 * 集中管理 Gravito Orbits，新增模組時只需：
 * 1. 在下方 import 該 Orbit
 * 2. 在 getOrbits() 的對應區塊加入實例（必要時用 options 做條件載入）
 *
 * 📍 STATUS: Orbits 暫時禁用 ⚠️
 *
 * @gravito/stasis 和 @gravito/plasma 模組依賴於 @gravito/core/ffi
 * ffi 模組生成 CJS compat code，Bun 無法正確解析 ESM export 語句
 * TODO: 等待 Bun 的 ESM 模組處理改進
 *
 * 詳見: ORBIT_ENABLEMENT_STATUS.md
 */

import type { GravitoOrbit } from '@gravito/core'
// TODO: 待 Bun 相容性完全解決
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
 * ⚠️ 當前全部禁用 - Bun ESM 模組解析問題
 */
export function getOrbits(_options: OrbitRegistrationOptions): GravitoOrbit[] {
	return [
		// --- 核心：視圖、SSG
		// OrbitPrism,

		// --- 資料：DB（可選）
		// ...(useDatabase ? [OrbitAtlas as unknown as GravitoOrbit] : []),

		// --- 資料：Redis + Cache
		// new OrbitPlasma({ ...redis, autoConnect: true }) as any,
		// OrbitStasis,

		// --- 應用：事件 / 郵件等
		// OrbitSignal,
	]
}
