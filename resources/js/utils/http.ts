/**
 * @file http.ts
 * @description HTTP 請求工具 - 自動添加 Authorization Header 和 401 處理
 *
 * 提供以下功能：
 * - 自動添加 Bearer Token
 * - 統一的錯誤處理
 * - 401 自動重定向
 * - 請求/響應攔截
 */

import { getToken, clearToken } from './tokenManager'

/**
 * HTTP 請求選項擴展
 */
export interface HttpRequestOptions extends RequestInit {
  skipAuth?: boolean // 跳過自動添加 Authorization
  skipErrorHandling?: boolean // 跳過統一錯誤處理
  onUnauthorized?: () => void // 401 回調
}

/**
 * 統一的 HTTP 響應類型
 */
export interface HttpResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  statusCode?: number
}

/**
 * 執行 HTTP 請求（自動添加 Authorization）
 *
 * @param url - 請求 URL
 * @param options - 請求選項
 * @returns 響應 JSON 數據
 *
 * @example
 * const user = await http.get('/api/users/123')
 * const result = await http.post('/api/orders', { userId: '123' })
 */
async function request<T = any>(
  url: string,
  options: HttpRequestOptions = {}
): Promise<HttpResponse<T>> {
  const {
    skipAuth = false,
    skipErrorHandling = false,
    onUnauthorized,
    headers: customHeaders = {},
    ...restOptions
  } = options

  // 構建 Headers
  const headers = new Headers(customHeaders as any)

  // 自動添加 Authorization
  if (!skipAuth) {
    const token = getToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  // 設置 Content-Type（如果沒有指定）
  if (!headers.has('Content-Type') && restOptions.body) {
    headers.set('Content-Type', 'application/json')
  }

  try {
    const response = await fetch(url, {
      ...restOptions,
      headers,
    })

    // 處理 401 Unauthorized
    if (response.status === 401) {
      clearToken()
      if (onUnauthorized) {
        onUnauthorized()
      } else {
        // 預設行為：重定向到登入頁
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
      }
      throw new Error('Unauthorized')
    }

    // 解析響應
    let data: any
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    // 檢查響應狀態
    if (!response.ok) {
      const error = new Error(data?.message || `HTTP ${response.status}`)
      Object.assign(error, {
        status: response.status,
        data,
      })
      throw error
    }

    return data
  } catch (error) {
    if (skipErrorHandling) {
      throw error
    }

    // 統一錯誤處理
    const message =
      error instanceof Error ? error.message : '網路請求失敗'

    console.error('[HTTP Error]', {
      url,
      message,
      error,
    })

    return {
      success: false,
      message,
    }
  }
}

/**
 * GET 請求
 */
export const http = {
  get<T = any>(url: string, options?: HttpRequestOptions) {
    return request<T>(url, {
      ...options,
      method: 'GET',
    })
  },

  /**
   * POST 請求
   */
  post<T = any>(url: string, body?: any, options?: HttpRequestOptions) {
    return request<T>(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  },

  /**
   * PUT 請求
   */
  put<T = any>(url: string, body?: any, options?: HttpRequestOptions) {
    return request<T>(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  },

  /**
   * PATCH 請求
   */
  patch<T = any>(url: string, body?: any, options?: HttpRequestOptions) {
    return request<T>(url, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    })
  },

  /**
   * DELETE 請求
   */
  delete<T = any>(url: string, options?: HttpRequestOptions) {
    return request<T>(url, {
      ...options,
      method: 'DELETE',
    })
  },

  /**
   * 原始請求方法（完全控制）
   */
  request,
}

export default http
