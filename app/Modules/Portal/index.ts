/**
 * @file index.ts
 * @description Portal 模組公開 API 導出與裝配定義。負責首頁、行銷頁面與跨模組資料聚合 (BFF)
 */

import type { IModuleDefinition } from '@/Foundation/Infrastructure/Wiring/ModuleDefinition'
import { PortalServiceProvider } from './Infrastructure/Providers/PortalServiceProvider'
import { wirePortalRoutes } from './Infrastructure/Wiring/wirePortalRoutes'

/**
 * Portal Module Definition
 * 負責首頁、行銷頁面與跨模組資料聚合 (BFF)
 */
export const PortalModule: IModuleDefinition = {
  name: 'Portal',
  provider: PortalServiceProvider,
  registerRoutes: wirePortalRoutes
}
