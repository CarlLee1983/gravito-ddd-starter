/**
 * @file CreateSessionService.ts
 * @description 建立 Session（登入）應用服務
 */

import type { ICredentialVerifier } from '@/Shared/Infrastructure/Ports/Auth/ICredentialVerifier'
import type { ITokenSigner } from '@/Shared/Infrastructure/Ports/Auth/ITokenSigner'
import type { ISessionRepository } from '../../Domain/Repositories/ISessionRepository'
import { Session } from '../../Domain/Aggregates/Session'
import { SessionId } from '../../Domain/ValueObjects/SessionId'
import { InvalidCredentialsException } from '../../Domain/Exceptions/InvalidCredentialsException'
import type { SessionDTO } from '../DTOs/SessionDTO'

/**
 * 建立 Session 應用服務
 *
 * 處理登入流程：驗證認證憑證 → 簽發 JWT → 建立 Session 實體 → 保存
 *
 * 改進：
 * 1. 現在依賴於 ICredentialVerifier Port，而非直接依賴 User Repository
 * 2. 依賴於 ITokenSigner Port，而非直接使用 jose 庫
 * 這樣 Session 模組與 User 模組、JWT 實現都完全解耦，各自可獨立演進。
 */
export class CreateSessionService {
  /**
   * 建構子
   *
   * @param credentialVerifier - 凭证验证器（Port 介面實現）
   * @param tokenSigner - Token 簽發器（Port 介面實現）
   * @param sessionRepository - Session Repository
   */
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
    // 步驟 1: 驗證凭证（透過 Port 介面，不直接依賴 User 模組）
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

    // 步驟 4: 從 Token 簽發器計算過期時間（根據環境變數 JWT_EXPIRES_IN）
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
