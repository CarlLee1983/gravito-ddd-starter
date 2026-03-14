/**
 * @file RegisterService.ts
 * @description 註冊應用服務
 *
 * 處理用戶註冊流程：建立用戶 → 自動登入 → 回傳 Session
 */

import type { IUserCreator } from '@/Foundation/Infrastructure/Ports/Auth/IUserCreator'
import { LoginService } from './LoginService'
import type { SessionDTO } from '../DTOs/SessionDTO'

/**
 * 註冊應用服務
 *
 * 整合註冊和自動登入流程
 */
export class RegisterService {
  constructor(
    private userCreator: IUserCreator,
    private loginService: LoginService
  ) {}

  /**
   * 執行註冊並自動登入
   *
   * @param input - 註冊資訊
   * @returns Promise<SessionDTO> 註冊成功並自動登入的 Session 資訊
   * @throws Error 如果郵件已被使用或其他驗證失敗
   */
  async execute(input: {
    name: string
    email: string
    password: string
  }): Promise<SessionDTO> {
    // 步驟 1: 建立新用戶（依賴 IUserCreator Port，無需知道具體實現）
    const userResult = await this.userCreator.create(
      input.name,
      input.email,
      input.password
    )

    if (!userResult) {
      throw new Error('郵件已被使用或註冊失敗')
    }

    // 步驟 2: 自動登入（呼叫 LoginService）
    const sessionDTO = await this.loginService.execute(
      input.email,
      input.password
    )

    return sessionDTO
  }
}
