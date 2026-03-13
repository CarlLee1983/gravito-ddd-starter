import { useState } from 'react'
import { router } from '@inertiajs/react'
import GuestLayout from '../../Layouts/GuestLayout'
import { useAuth } from '../../hooks/useAuth'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // 基本驗證
      if (!email || !password) {
        setError('郵件和密碼必填')
        setLoading(false)
        return
      }

      // 呼叫登入
      await login(email, password)

      // 登入成功，跳轉到儀表板
      router.visit('/dashboard')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '登入失敗，請重試'
      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <GuestLayout
      title="登入"
      subtitle="輸入您的認證資訊"
      bottomLink={{
        text: '還沒有帳號？',
        href: '/register',
        linkText: '立即註冊',
      }}
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="mb-6">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            郵件地址
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            密碼
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '登入中...' : '登入'}
        </button>
      </form>
    </GuestLayout>
  )
}
