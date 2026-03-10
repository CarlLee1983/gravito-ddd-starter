/**
 * Orbit 註冊表
 *
 * 集中管理 Gravito Orbits，新增模組時只需：
 * 1. 在下方 import 該 Orbit
 * 2. 在 getOrbits() 的對應區塊加入實例（必要時用 options 做條件載入）
 */

import type { GravitoOrbit } from '@gravito/core'
import { OrbitAtlas } from '@gravito/atlas'
import { OrbitPlasma } from '@gravito/plasma'
import { OrbitPrism } from '@gravito/prism'
import { OrbitSignal } from '@gravito/signal'
import { OrbitStasis } from '@gravito/stasis'
import type { RedisManagerConfig } from '@gravito/plasma'

export type OrbitRegistrationOptions = {
	/** 是否啟用資料庫（OrbitAtlas） */
	useDatabase: boolean
	/** Redis 設定（OrbitPlasma） */
	redis: RedisManagerConfig
}

/**
 * 依目前設定組出要載入的 Orbits 清單。
 * 執行順序：Prism → Atlas(可選) → Plasma → Stasis → Signal → 其他
 */
export function getOrbits(options: OrbitRegistrationOptions): GravitoOrbit[] {
	const { useDatabase, redis } = options

	return [
		// --- 核心：視圖、SSG
		OrbitPrism,

		// --- 資料：DB（可選）
		...(useDatabase ? [OrbitAtlas] : []),

		// --- 資料：Redis + Cache
		new OrbitPlasma({ ...redis, autoConnect: true }),
		OrbitStasis,

		// --- 應用：事件 / 郵件等
		OrbitSignal,

		// --- 之後新增的 Orbits 放這裡，例如：
		// OrbitHorizon,
		// new OrbitStream({ ...queueConfig }),
	]
}
