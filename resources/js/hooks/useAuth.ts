import { useContext } from 'react'
import { AuthContext, type AuthContextType } from '../contexts/AuthContext'

/**
 * 使用 Auth Context 的 hook
 *
 * @returns Auth Context 的值
 * @throws Error 如果在 AuthProvider 外使用
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
