import { useState } from 'react'
import { router } from '@inertiajs/react'
import GuestLayout from '../../Layouts/GuestLayout'
import { useAuth } from '../../hooks/useAuth'
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react'

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
      if (!email || !password) {
        setError('請填寫郵件和密碼')
        setLoading(false)
        return
      }

      await login(email, password)
      router.visit('/dashboard')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '登入失敗，請檢查您的憑據'
      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <GuestLayout
      title="登入帳號"
      subtitle="歡迎回來！請輸入您的認證資訊"
      bottomLink={{
        text: '還沒有帳號？',
        href: '/register',
        linkText: '立即註冊體驗',
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl animate-in fade-in zoom-in duration-300">
            <p className="text-red-700 text-sm font-bold flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
              {error}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-bold text-slate-700 ml-1 uppercase tracking-wider text-[10px]">
            郵件地址
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
              <Mail size={18} />
            </div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-slate-900 placeholder:text-slate-400"
              disabled={loading}
              autoComplete="email"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center ml-1">
            <label htmlFor="password" className="block text-sm font-bold text-slate-700 uppercase tracking-wider text-[10px]">
              密碼
            </label>
            <a href="#" className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider">忘記密碼？</a>
          </div>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
              <Lock size={18} />
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-slate-900 placeholder:text-slate-400"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full group relative bg-blue-600 text-white py-4 rounded-2xl hover:bg-blue-700 font-black text-lg shadow-xl shadow-blue-600/20 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 overflow-hidden"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                處理中...
              </>
            ) : (
              <>
                登入系統 <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
              </>
            )}
          </span>
          {/* Animated shimmer effect */}
          {!loading && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none"></div>
          )}
        </button>
      </form>
    </GuestLayout>
  )
}
