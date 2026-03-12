/**
 * Orbit 註冊表
 *
 * 📍 STATUS: Orbits 暫時禁用
 *
 * gravito-core 套件在 Bun 運行時環境中有模組結構問題，導致無法載入 Orbits。
 * 詳見: ORBIT_ENABLEMENT_STATUS.md
 *
 * TODO: 待上游 gravito-core 發佈修正版本後，重新啟用此功能。
 */

import type { GravitoOrbit } from '@gravito/core'

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
 * ⚠️ 當前全部禁用 - gravito-core 模組結構問題
 */
export function getOrbits(_options: OrbitRegistrationOptions): GravitoOrbit[] {
	// TODO: 重新啟用 Orbits
	// const { useDatabase } = options
	// import { OrbitAtlas } from '@gravito/atlas'
	// import { OrbitPlasma } from '@gravito/plasma'
	// import { OrbitStasis } from '@gravito/stasis'

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
