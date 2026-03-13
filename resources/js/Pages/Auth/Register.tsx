import { useState } from 'react'
import { router } from '@inertiajs/react'
import GuestLayout from '../../Layouts/GuestLayout'
import { useAuth } from '../../hooks/useAuth'

export default function Register() {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // 驗證輸入
      if (!name || !email || !password || !passwordConfirm) {
        setError('所有欄位都必填')
        setLoading(false)
        return
      }

      // 驗證郵件格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        setError('請輸入有效的郵件地址')
        setLoading(false)
        return
      }

      // 驗證密碼長度
      if (password.length < 8) {
        setError('密碼至少需要 8 個字元')
        setLoading(false)
        return
      }

      // 驗證密碼確認
      if (password !== passwordConfirm) {
        setError('密碼不相符')
        setLoading(false)
        return
      }

      // 呼叫註冊
      await register(name, email, password)

      // 註冊成功，跳轉到儀表板
      router.visit('/dashboard')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '註冊失敗，請重試'
      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <GuestLayout
      title="建立帳號"
      subtitle="立即開始使用 Gravito"
      bottomLink={{
        text: '已有帳號？',
        href: '/login',
        linkText: '立即登入',
      }}
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="mb-6">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            名稱
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="您的名稱"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
        </div>

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
            密碼（至少 8 個字元）
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

        <div className="mb-6">
          <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 mb-2">
            確認密碼
          </label>
          <input
            id="passwordConfirm"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
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
          {loading ? '建立帳號中...' : '建立帳號'}
        </button>
      </form>
    </GuestLayout>
  )
}
