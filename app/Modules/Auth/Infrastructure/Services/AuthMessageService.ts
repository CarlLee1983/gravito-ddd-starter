/**
 * @file AuthMessageService.ts
 * @description 認證訊息服務實現
 *
 * 包裝 ITranslator，提供類型安全的認證訊息方法。
 * 好處：
 * - 編譯時檢查（無拼寫錯誤）
 * - 簡潔的方法名稱（authMessages.loginInvalidCredentials()）
 * - 集中管理翻譯鍵
 * - 易於測試和重構
 */

import type { IAuthMessages } from '@/Modules/Auth/Presentation/Ports/IAuthMessages'
import type { ITranslator } from '@/Foundation/Infrastructure/Ports/Services/ITranslator'

/**
 * 認證訊息服務類別
 */
export class AuthMessageService implements IAuthMessages {
  /**
   * 建立 AuthMessageService 實例
   *
   * @param translator - 翻譯器服務
   */
  constructor(private translator: ITranslator) {}

  /**
   * 取得電子郵件與密碼必填的驗證訊息
   *
   * @returns 翻譯後的字串
   */
  validationEmailPasswordRequired(): string {
    return this.translator.trans('auth.validation.email_and_password_required')
  }

  /**
   * 取得登入認證失敗的訊息
   *
   * @returns 翻譯後的字串
   */
  loginInvalidCredentials(): string {
    return this.translator.trans('auth.login.invalid_credentials')
  }

  /**
   * 取得登入失敗的通用訊息
   *
   * @returns 翻譯後的字串
   */
  loginFailed(): string {
    return this.translator.trans('auth.login.failed')
  }

  /**
   * 取得登出成功的訊息
   *
   * @returns 翻譯後的字串
   */
  logoutSuccess(): string {
    return this.translator.trans('auth.logout.success')
  }

  /**
   * 取得登出失敗的訊息
   *
   * @returns 翻譯後的字串
   */
  logoutFailed(): string {
    return this.translator.trans('auth.logout.failed')
  }

  /**
   * 取得登出時缺少 Token 的訊息
   *
   * @returns 翻譯後的字串
   */
  logoutTokenMissing(): string {
    return this.translator.trans('auth.logout.token_missing')
  }

  /**
   * 取得存取個人資料未授權的訊息
   *
   * @returns 翻譯後的字串
   */
  profileUnauthorized(): string {
    return this.translator.trans('auth.profile.unauthorized')
  }

  /**
   * 取得找不到個人資料的訊息
   *
   * @returns 翻譯後的字串
   */
  profileNotFound(): string {
    return this.translator.trans('auth.profile.not_found')
  }

  /**
   * 取得查詢個人資料失敗的訊息
   *
   * @returns 翻譯後的字串
   */
  profileQueryFailed(): string {
    return this.translator.trans('auth.profile.query_failed')
  }

  /**
   * 取得刷新 Token 失敗的訊息
   *
   * @returns 翻譯後的字串
   */
  refreshFailed(): string {
    return this.translator.trans('auth.refresh.failed')
  }

  /**
   * 取得刷新時缺少 Token 的訊息
   *
   * @returns 翻譯後的字串
   */
  refreshTokenMissing(): string {
    return this.translator.trans('auth.refresh.token_missing')
  }

  /**
   * 取得電子郵件重複的註冊訊息
   *
   * @returns 翻譯後的字串
   */
  registrationEmailDuplicate(): string {
    return this.translator.trans('auth.registration.email_duplicate')
  }

  /**
   * 取得註冊失敗的通用訊息
   *
   * @returns 翻譯後的字串
   */
  registrationFailed(): string {
    return this.translator.trans('auth.registration.failed')
  }
}
