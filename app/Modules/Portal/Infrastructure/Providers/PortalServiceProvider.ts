/**
 * @file PortalServiceProvider.ts
 * @description Portal 模組服務提供者
 */

import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/Ports/Core/IServiceProvider'

export class PortalServiceProvider extends ModuleServiceProvider {
  /**
   * 註冊服務
   */
  override register(_container: IContainer): void {
    // Portal 目前是純表現層聚合，暫無內部服務需要註冊
  }
}
