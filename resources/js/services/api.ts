/**
 * @file api.ts
 * @description API 服務層 - 使用 http 工具進行 API 調用
 *
 * 這是與後端 API 互動的統一入口，自動處理：
 * - Authorization Header
 * - 401 未授權重定向
 * - 統一錯誤處理
 */

import { http, type HttpResponse } from '../utils'

/**
 * 用戶 API
 */
export const userApi = {
  /**
   * 取得當前用戶資訊
   */
  async getMe(): Promise<HttpResponse> {
    return http.get('/api/auth/me')
  },

  /**
   * 取得用戶清單
   */
  async getAll(): Promise<HttpResponse> {
    return http.get('/api/users')
  },

  /**
   * 取得用戶詳細資訊
   */
  async getById(id: string): Promise<HttpResponse> {
    return http.get(`/api/users/${id}`)
  },

  /**
   * 更新用戶資料
   */
  async update(id: string, data: any): Promise<HttpResponse> {
    return http.put(`/api/users/${id}`, data)
  },
}

/**
 * 購物車 API
 */
export const cartApi = {
  /**
   * 取得購物車
   */
  async get(): Promise<HttpResponse> {
    return http.get('/api/cart')
  },

  /**
   * 添加商品到購物車
   */
  async addItem(data: {
    productId: string
    quantity: number
  }): Promise<HttpResponse> {
    return http.post('/api/cart/items', data)
  },

  /**
   * 移除購物車項目
   */
  async removeItem(itemId: string): Promise<HttpResponse> {
    return http.delete(`/api/cart/items/${itemId}`)
  },

  /**
   * 結帳
   */
  async checkout(): Promise<HttpResponse> {
    return http.post('/api/cart/checkout')
  },
}

/**
 * 訂單 API
 */
export const orderApi = {
  /**
   * 取得訂單清單
   */
  async getAll(): Promise<HttpResponse> {
    return http.get('/api/orders')
  },

  /**
   * 取得訂單詳細資訊
   */
  async getById(id: string): Promise<HttpResponse> {
    return http.get(`/api/orders/${id}`)
  },

  /**
   * 取得訂單分析
   */
  async getAnalytics(): Promise<HttpResponse> {
    return http.get('/api/orders/analytics')
  },
}

/**
 * 產品 API
 */
export const productApi = {
  /**
   * 取得產品清單
   */
  async getAll(): Promise<HttpResponse> {
    return http.get('/api/products')
  },

  /**
   * 取得產品詳細資訊
   */
  async getById(id: string): Promise<HttpResponse> {
    return http.get(`/api/products/${id}`)
  },

  /**
   * 搜尋產品
   */
  async search(query: string): Promise<HttpResponse> {
    return http.get(`/api/products/search?q=${encodeURIComponent(query)}`)
  },
}

/**
 * 文章 API
 */
export const postApi = {
  /**
   * 取得文章清單
   */
  async getAll(): Promise<HttpResponse> {
    return http.get('/api/posts')
  },

  /**
   * 取得文章詳細資訊
   */
  async getById(id: string): Promise<HttpResponse> {
    return http.get(`/api/posts/${id}`)
  },

  /**
   * 建立文章
   */
  async create(data: {
    title: string
    content: string
  }): Promise<HttpResponse> {
    return http.post('/api/posts', data)
  },

  /**
   * 更新文章
   */
  async update(
    id: string,
    data: {
      title?: string
      content?: string
    }
  ): Promise<HttpResponse> {
    return http.put(`/api/posts/${id}`, data)
  },

  /**
   * 刪除文章
   */
  async delete(id: string): Promise<HttpResponse> {
    return http.delete(`/api/posts/${id}`)
  },
}

/**
 * 支付 API
 */
export const paymentApi = {
  /**
   * 初始化支付
   */
  async initiate(data: {
    orderId: string
    amount: number
    method: string
  }): Promise<HttpResponse> {
    return http.post('/api/payments', data)
  },

  /**
   * 取得支付狀態
   */
  async getStatus(orderId: string): Promise<HttpResponse> {
    return http.get(`/api/payments/${orderId}/status`)
  },
}
