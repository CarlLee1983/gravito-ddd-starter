/**
 * @file SessionServiceProvider.ts
 * @description Session 模組服務提供者
 *
 * 管理 Session 模組的依賴注入與生命週期。
 */

import { ModuleServiceProvider, type IContainer } from '@/Foundation/Infrastructure/Ports/Core/IServiceProvider'
import { MemorySessionRepository } from '../Persistence/MemorySessionRepository'
import { SessionTokenValidator } from '../Adapters/SessionTokenValidator'
import { ValidateSessionService } from '../../Application/Services/ValidateSessionService'
import { JoseTokenSigner } from '@/Foundation/Infrastructure/Adapters/Gravito/JoseTokenSigner'
import type { ISessionRepository } from '../../Domain/Repositories/ISessionRepository'
import type { IEventDispatcher } from '@/Foundation/Application/Ports/IEventDispatcher'
import type { ITokenSigner } from '@/Foundation/Infrastructure/Ports/Auth/ITokenSigner'

/**
 * Session 模組服務提供者
 *
 * 使用記憶體存儲，未來可替換為 Redis。
 *
 * 改進：
 * 1. 現在正確實現了 Port 介面，消除了 Shared 對 Session 的反向依賴
 * 2. 注入 ITokenSigner Port（JoseTokenSigner Adapter），Application 層不依賴 jose
 */
export class SessionServiceProvider extends ModuleServiceProvider {
  /**
   * 註冊所有依賴
   *
   * @param container - DI 容器
   * @returns void
   */
  override register(container: IContainer): void {
    // 1. 註冊 ITokenSigner Port（jose 實現）
    container.singleton('tokenSigner', () => {
      return new JoseTokenSigner()
    })

    // 2. 註冊 Session Repository（記憶體實現）
    container.singleton('sessionRepository', (c) => {
      let eventDispatcher: IEventDispatcher | undefined
      try {
        eventDispatcher = c.make('eventDispatcher') as IEventDispatcher
      } catch {
        // eventDispatcher 可能在路由裝配階段不可用，使用 undefined
        eventDispatcher = undefined
      }
      return new MemorySessionRepository(eventDispatcher)
    })

    // 3. 註冊 ValidateSessionService（供 Auth 模組使用）
    container.singleton('validateSessionService', (c) => {
      const tokenSigner = c.make('tokenSigner') as ITokenSigner
      const sessionRepository = c.make('sessionRepository') as ISessionRepository
      return new ValidateSessionService(tokenSigner, sessionRepository)
    })

    // 4. 實現 ITokenValidator Port（供 Shared 層使用）
    container.singleton('tokenValidator', (c) => {
      const validateSessionService = c.make('validateSessionService') as ValidateSessionService
      return new SessionTokenValidator(validateSessionService)
    })
  }
}
