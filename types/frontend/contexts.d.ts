/**
 * @file types/frontend/contexts.d.ts
 * @description React Context API 相關的共享類型定義
 *
 * 包含：
 * - 認證上下文
 * - 主題上下文
 * - 通知上下文
 */

import React from 'react'

// ============================================================================
// Auth Context
// ============================================================================

interface User {
  id: string
  email: string
  name: string
  role?: string[]
}

interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (data: RegisterData) => Promise<void>
}

interface RegisterData {
  email: string
  password: string
  name: string
  confirmPassword: string
}

// ============================================================================
// Theme Context
// ============================================================================

type ThemeMode = 'light' | 'dark' | 'auto'

interface ThemeContextValue {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  isDark: boolean
}

// ============================================================================
// Notification Context
// ============================================================================

type NotificationType = 'success' | 'error' | 'warning' | 'info'

interface Notification {
  id: string
  type: NotificationType
  message: string
  duration?: number
}

interface NotificationContextValue {
  notifications: Notification[]
  notify: (message: string, type?: NotificationType, duration?: number) => void
  dismiss: (id: string) => void
  dismissAll: () => void
}

// ============================================================================
// Loading Context
// ============================================================================

interface LoadingContextValue {
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  withLoading: <T,>(fn: () => Promise<T>) => Promise<T>
}

export {}
