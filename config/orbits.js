/**
 * Orbit 註冊表
 *
 * 集中管理 Gravito Orbits，新增模組時只需：
 * 1. 在下方 import 該 Orbit
 * 2. 在 getOrbits() 的對應區塊加入實例（必要時用 options 做條件載入）
 */
import { OrbitAtlas } from '@gravito/atlas';
/**
 * 依目前設定組出要載入的 Orbits 清單。
 * 執行順序：Prism → Atlas(可選) → Plasma → Stasis → Signal → 其他
 */
export function getOrbits(options) {
    const { useDatabase } = options;
    return [
        // --- 核心：視圖、SSG
        // OrbitPrism,
        // --- 資料：DB（可選）
        ...(useDatabase ? [OrbitAtlas] : []),
        // --- 資料：Redis + Cache
        // new OrbitPlasma({ ...redis, autoConnect: true }) as any,
        // OrbitStasis,
        // --- 應用：事件 / 郵件等
        // OrbitSignal,
    ];
}
//# sourceMappingURL=orbits.js.map