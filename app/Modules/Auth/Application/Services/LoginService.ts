/**
 * @file LoginService.ts
 * @description 登入應用服務（從 Session/CreateSessionService 遷移）
 */

import type { ICredentialVerifier } from '@/Foundation/Infrastructure/Ports/Auth/ICredentialVerifier'
import type { ITokenSigner } from '@/Foundation/Infrastructure/Ports/Auth/ITokenSigner'
import type { ISessionRepository } from '@/Modules/Session/Domain/Repositories/ISessionRepository'
import { Session } from '@/Modules/Session/Domain/Aggregates/Session'
import { SessionId } from '@/Modules/Session/Domain/ValueObjects/SessionId'
import { InvalidCredentialsException } from '@/Modules/Session/Domain/Exceptions/InvalidCredentialsException'
import type { SessionDTO } from '../DTOs/SessionDTO'

/**
 * 登入應用服務
 *
 * 處理登入流程：驗證認證憑證 → 簽發 JWT → 建立 Session 實體 → 保存
 */
export class LoginService {
  constructor(
    private credentialVerifier: ICredentialVerifier,
    private tokenSigner: ITokenSigner,
    private sessionRepository: ISessionRepository
  ) {}

  /**
   * 執行登入流程
   *
   * @param email - 用戶電子郵件
   * @param password - 用戶密碼（原文）
   * @returns Promise<SessionDTO> Session 資訊及 JWT Token
   * @throws InvalidCredentialsException 如果認證失敗
   */
  async execute(email: string, password: string): Promise<SessionDTO> {
    // 步驟 1: 驗證認證憑證（透過 Port 介面，不直接依賴 User 模組）
    const credentialResult = await this.credentialVerifier.verifyByEmail(email, password)

    if (!credentialResult) {
      throw new InvalidCredentialsException()
    }

    const userId = credentialResult.userId

    // 步驟 2: 建立 Session ID
    const sessionId = SessionId.generate().value

    // 步驟 3: 簽發 JWT Token（透過 Port 介面，不知道底層使用 jose 或其他庫）
    const jwtToken = await this.tokenSigner.sign({
      sub: userId,
      jti: sessionId,
    })

    // 步驟 4: 從環境變數計算過期時間
    const expiresInSeconds = parseInt(process.env.JWT_EXPIRES_IN ?? '86400', 10)
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000)

    // 步驟 5: 建立 Session 聚合根
    const session = Session.create(
      sessionId,
      userId,
      jwtToken,
      expiresAt
    )

    // 步驟 6: 保存 Session
    await this.sessionRepository.save(session)

    // 步驟 7: 回傳 DTO
    return {
      accessToken: jwtToken,
      expiresAt: expiresAt.toISOString(),
      userId,
      tokenType: 'Bearer',
    }
  }
}
