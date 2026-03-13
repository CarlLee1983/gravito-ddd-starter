/**
 * @file LoginDTO.ts
 * @description 登入請求 DTO
 */

/**
 * 登入請求 DTO
 *
 * 用於接收用戶提交的登入表單資料。
 */
export interface LoginDTO {
  /** 用戶電子郵件 */
  email: string

  /** 用戶密碼（原文） */
  password: string
}
