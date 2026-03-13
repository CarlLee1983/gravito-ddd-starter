/**
 * @file AuthServiceProvider.ts
 * @description Auth 模組服務提供者
 *
 * 在 DDD 架構中的角色：
 * - 基礎設施層 (Infrastructure Layer)：負責 Auth 模組的依賴注入與生命週期管理。
 * - 職責：配置與註冊該模組所需的應用服務、Port 實現、控制器等依賴。
 */

import { ModuleServiceProvider, type IContainer } from '@/Shared/Infrastructure/Ports/Core/IServiceProvider'
import { LoginService } from '../../Application/Services/LoginService'
import { RegisterService } from '../../Application/Services/RegisterService'
import { LogoutService } from '../../Application/Services/LogoutService'
import { AuthController } from '../../Presentation/Controllers/AuthController'
import type { ICredentialVerifier } from '@/Shared/Infrastructure/Ports/Auth/ICredentialVerifier'
import type { ITokenSigner } from '@/Shared/Infrastructure/Ports/Auth/ITokenSigner'
import type { IUserCreator } from '@/Shared/Infrastructure/Ports/Auth/IUserCreator'
import type { IUserProfileService } from '@/Shared/Infrastructure/Ports/Auth/IUserProfileService'
import type { IAuthMessages } from '@/Shared/Infrastructure/Ports/Messages/IAuthMessages'
import type { ISessionRepository } from '@/Modules/Session/Domain/Repositories/ISessionRepository'
import { ValidateSessionService } from '@/Modules/Session/Application/Services/ValidateSessionService'
import type { ITokenValidator } from '@/Shared/Infrastructure/Ports/Auth/ITokenValidator'
import type { ILogger } from '@/Shared/Infrastructure/Ports/Services/ILogger'

/**
 * Auth 模組服務提供者實作類別
 */
export class AuthServiceProvider extends ModuleServiceProvider {
  /**
   * 註冊所有依賴
   *
   * @param container - DI 容器
   */
  override register(container: IContainer): void {
    // 1. 應用服務 - LoginService
    container.singleton('loginService', (c) => {
      return new LoginService(
        c.make('credentialVerifier') as ICredentialVerifier,
        c.make('tokenSigner') as ITokenSigner,
        c.make('sessionRepository') as ISessionRepository
      )
    })

    // 2. 應用服務 - RegisterService
    container.singleton('registerService', (c) => {
      return new RegisterService(
        c.make('userCreator') as IUserCreator,
        c.make('loginService') as LoginService
      )
    })

    // 3. 應用服務 - LogoutService
    container.singleton('logoutService', (c) => {
      const tokenValidator = c.make('tokenValidator') as ITokenValidator
      const sessionRepository = c.make('sessionRepository') as ISessionRepository
      const validateSessionService = new ValidateSessionService(tokenValidator, sessionRepository)

      return new LogoutService(
        sessionRepository,
        validateSessionService
      )
    })

    // 4. 控制器 - AuthController
    container.singleton('authController', (c) => {
      return new AuthController(
        c.make('loginService') as LoginService,
        c.make('registerService') as RegisterService,
        c.make('logoutService') as LogoutService,
        c.make('userProfileService') as IUserProfileService,
        c.make('authMessages') as IAuthMessages
      )
    })
  }

  /**
   * 啟動時執行初始化邏輯
   *
   * @param core - Gravito 核心實例
   */
  override boot(core: any): void {
    if (process.env.NODE_ENV === 'development') {
      const logger = core.container.make('logger') as ILogger
      logger.debug('🔐 [Auth] Module loaded')
    }
  }
}
