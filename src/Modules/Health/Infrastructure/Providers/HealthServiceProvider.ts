/**
 * HealthServiceProvider
 * 健康模組的服務提供者 (依賴注入)
 */

import { ServiceProvider, type Container, type PlanetCore } from '@gravito/core'
import { MemoryHealthCheckRepository } from '../Repositories/MemoryHealthCheckRepository'
import { PerformHealthCheckService } from '../../Application/Services/PerformHealthCheckService'

export class HealthServiceProvider extends ServiceProvider {
  /**
   * register: 註冊服務到容器
   * 在這裡定義所有的依賴注入和單例
   */
  register(container: Container): void {
    // 1. 註冊 Repository (單例)
    container.singleton('healthRepository', () => {
      return new MemoryHealthCheckRepository()
    })

    // 2. 註冊 Application Service (工廠)
    // 每次注入時都會創建新實例，確保有新的 Repository 引用
    container.factory('healthCheckService', (c: Container) => {
      const repository = c.make('healthRepository')
      return new PerformHealthCheckService(repository)
    })
  }

  /**
   * boot: 啟動時執行
   * 在這裡執行初始化邏輯
   */
  boot(core: PlanetCore): void {
    console.log('💚 [Health] Module loaded')

    // 初始化：執行第一次健康檢查
    const service = core.container.make('healthCheckService') as PerformHealthCheckService
    const db = core.get('db')
    const redis = core.get('redis')
    const cache = core.get('cache')

    service
      .execute(db, redis, cache)
      .catch((error) => {
        console.error('Initial health check failed:', error)
      })
  }
}
