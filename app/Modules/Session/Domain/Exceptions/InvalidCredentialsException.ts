/**
 * @file InvalidCredentialsException.ts
 * @description 無效的認證憑證異常
 *
 * 當電子郵件或密碼不匹配時拋出。
 */

/**
 * 無效的認證憑證異常
 *
 * 用於登入失敗的情況。
 */
export class InvalidCredentialsException extends Error {
  constructor(message: string = '無效的電子郵件或密碼') {
    super(message)
    this.name = 'InvalidCredentialsException'
  }
}
