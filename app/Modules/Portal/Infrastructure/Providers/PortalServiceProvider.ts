/**
 * @file PortalServiceProvider.ts
 * @description Portal 模組服務提供者，負責註冊 Portal 模組內部的依賴項
 */

import { ModuleServiceProvider, type IContainer } from '@/Foundation/Infrastructure/Ports/Core/IServiceProvider'

export class PortalServiceProvider extends ModuleServiceProvider {
  /**
   * 註冊 Portal 模組的服務與依賴
   * @param _container 應用程式服務容器實例
   * @returns void
   */
  override register(_container: IContainer): void {
    // Portal 目前是純表現層聚合，暫無內部服務需要註冊
  }
}
