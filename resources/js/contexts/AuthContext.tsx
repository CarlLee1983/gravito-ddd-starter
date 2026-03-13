import React, { createContext, useState, useEffect, ReactNode } from 'react'

/**
 * Cookie 工具函數
 */
function setCookie(name: string, value: string, days: number = 7) {
  const date = new Date()
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
  const expires = `expires=${date.toUTCString()}`
  document.cookie = `${name}=${value};${expires};path=/`
}

function getCookie(name: string): string | null {
  const nameEQ = `${name}=`
  const cookies = document.cookie.split(';')
  for (let cookie of cookies) {
    cookie = cookie.trim()
    if (cookie.indexOf(nameEQ) === 0) {
      return cookie.substring(nameEQ.length)
    }
  }
  return null
}

function removeCookie(name: string) {
  setCookie(name, '', -1)
}

/**
 * 用戶基本資訊型別
 */
export interface UserProfile {
  id: string
  name: string
  email: string
  createdAt?: string
}

/**
 * Auth Context 型別定義
 */
export interface AuthContextType {
  user: UserProfile | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

/**
 * 建立 Auth Context
 */
export const AuthContext = createContext<AuthContextType | undefined>(undefined)

/**
 * Auth Context 提供者元件
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  /**
   * 初始化：檢查 Cookie 中的 token 並恢復登入狀態
   */
  useEffect(() => {
    const initAuth = async () => {
      const token = getCookie('auth_token')
      if (token) {
        try {
          // 呼叫 /api/auth/me 恢復用戶狀態
          const response = await fetch('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (response.ok) {
            const data = await response.json()
            if (data.success && data.data) {
              setUser(data.data)
            } else {
              // 無效的 token，清除
              removeCookie('auth_token')
            }
          } else if (response.status === 401) {
            // Token 已過期或無效
            removeCookie('auth_token')
          }
        } catch (error) {
          console.error('Failed to restore auth state:', error)
          removeCookie('auth_token')
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  /**
   * 登入
   */
  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || '登入失敗')
      }

      // 保存 token 到 Cookie（自動在頁面請求中發送）
      setCookie('auth_token', data.data.accessToken, 7) // 7 天過期

      // 查詢當前用戶
      const meResponse = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${data.data.accessToken}`,
        },
      })

      if (meResponse.ok) {
        const meData = await meResponse.json()
        if (meData.success && meData.data) {
          setUser(meData.data)
        }
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * 註冊
   */
  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || '註冊失敗')
      }

      // 保存 token 到 Cookie（自動登入 + 自動在頁面請求中發送）
      setCookie('auth_token', data.data.accessToken, 7) // 7 天過期

      // 查詢當前用戶
      const meResponse = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${data.data.accessToken}`,
        },
      })

      if (meResponse.ok) {
        const meData = await meResponse.json()
        if (meData.success && meData.data) {
          setUser(meData.data)
        }
      }
    } catch (error) {
      throw error
    }
  }

  /**
   * 登出
   */
  const logout = async () => {
    try {
      const token = getCookie('auth_token')
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      }
    } finally {
      removeCookie('auth_token')
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
