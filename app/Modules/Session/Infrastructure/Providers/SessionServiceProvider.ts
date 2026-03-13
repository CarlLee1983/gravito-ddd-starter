/**
 * @file SessionServiceProvider.ts
 * @description Session 模組服務提供者
 *
 * 管理 Session 模組的依賴注入與生命週期。
 */

import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/Ports/Core/IServiceProvider'
import { MemorySessionRepository } from '../Persistence/MemorySessionRepository'
import { SessionTokenValidator } from '../Adapters/SessionTokenValidator'
import { AuthMessageService } from '../Services/AuthMessageService'
import { CreateSessionService } from '../../Application/Services/CreateSessionService'
import { ValidateSessionService } from '../../Application/Services/ValidateSessionService'
import { RevokeSessionService } from '../../Application/Services/RevokeSessionService'
import { JoseTokenSigner } from '@/Shared/Infrastructure/Adapters/Gravito/JoseTokenSigner'
import type { ISessionRepository } from '../../Domain/Repositories/ISessionRepository'
import type { IEventDispatcher } from '@/Shared/Infrastructure/Ports/Messaging/IEventDispatcher'
import type { ICredentialVerifier } from '@/Shared/Infrastructure/Ports/Auth/ICredentialVerifier'
import type { ITokenSigner } from '@/Shared/Infrastructure/Ports/Auth/ITokenSigner'
import type { IAuthMessages } from '@/Shared/Infrastructure/Ports/Messages/IAuthMessages'
import type { ITranslator } from '@/Shared/Infrastructure/Ports/Services/ITranslator'

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
   */
  override register(container: IContainer): void {
    // 1. 註冊 ITokenSigner Port（jose 實現）
    container.singleton('tokenSigner', () => {
      return new JoseTokenSigner()
    })

    // 2. 註冊 Session Repository（記憶體實現）
    container.singleton('sessionRepository', (c) => {
      const eventDispatcher = c.make('eventDispatcher') as IEventDispatcher | undefined
      return new MemorySessionRepository(eventDispatcher)
    })

    // 3. 註冊 ValidateSessionService（現在依賴 ITokenSigner Port）
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

    // 5. 註冊 CreateSessionService（現在依賴 ICredentialVerifier 和 ITokenSigner Port）
    container.singleton('createSessionService', (c) => {
      const credentialVerifier = c.make('credentialVerifier') as ICredentialVerifier
      const tokenSigner = c.make('tokenSigner') as ITokenSigner
      const sessionRepository = c.make('sessionRepository') as ISessionRepository
      return new CreateSessionService(credentialVerifier, tokenSigner, sessionRepository)
    })

    // 6. 註冊 RevokeSessionService
    container.singleton('revokeSessionService', (c) => {
      const sessionRepository = c.make('sessionRepository') as ISessionRepository
      const validateSessionService = c.make('validateSessionService') as ValidateSessionService
      return new RevokeSessionService(sessionRepository, validateSessionService)
    })

    // 7. 註冊 AuthMessageService（訊息簡寫方案）
    container.singleton('authMessages', (c) => {
      const translator = c.make('translator') as ITranslator
      return new AuthMessageService(translator)
    })
  }
}
