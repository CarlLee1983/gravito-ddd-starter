import { useState } from 'react'
import { router } from '@inertiajs/react'
import GuestLayout from '../../Layouts/GuestLayout'
import { useAuth } from '../../hooks/useAuth'
import { User, Mail, Lock, Loader2, ArrowRight } from 'lucide-react'

export default function Register() {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!name || !email || !password) {
        setError('請填寫所有必填欄位')
        setLoading(false)
        return
      }

      if (password !== passwordConfirmation) {
        setError('兩次輸入的密碼不一致')
        setLoading(false)
        return
      }

      await register(name, email, password)
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
      subtitle="立即加入 Gravito，開啟您的開發之旅"
      bottomLink={{
        text: '已經有帳號了？',
        href: '/login',
        linkText: '前往登入',
      }}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl animate-in fade-in zoom-in duration-300">
            <p className="text-red-700 text-sm font-bold flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
              {error}
            </p>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-bold text-slate-700 ml-1 uppercase tracking-wider text-[10px]">
            全名 / 名稱
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
              <User size={18} />
            </div>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-slate-900 placeholder:text-slate-400"
              disabled={loading}
            />
          </div>
        </div>

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
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-slate-900 placeholder:text-slate-400"
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-bold text-slate-700 ml-1 uppercase tracking-wider text-[10px]">
            設定密碼
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
              <Lock size={18} />
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 8 個字元"
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-slate-900 placeholder:text-slate-400"
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password_confirmation" className="block text-sm font-bold text-slate-700 ml-1 uppercase tracking-wider text-[10px]">
            確認密碼
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
              <Lock size={18} />
            </div>
            <input
              id="password_confirmation"
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              placeholder="再次輸入密碼"
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-slate-900 placeholder:text-slate-400"
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex items-start gap-3 ml-1 py-2">
          <input type="checkbox" id="terms" className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500" required />
          <label htmlFor="terms" className="text-xs text-slate-500 font-medium leading-relaxed">
            我同意 <a href="#" className="text-blue-600 font-bold hover:underline">服務條款</a> 與 <a href="#" className="text-blue-600 font-bold hover:underline">隱私權政策</a>。
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full group relative bg-slate-900 text-white py-4 rounded-2xl hover:bg-slate-800 font-black text-lg shadow-xl shadow-slate-900/10 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 overflow-hidden"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                帳號建立中...
              </>
            ) : (
              <>
                註冊帳號 <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
              </>
            )}
          </span>
        </button>
      </form>
    </GuestLayout>
  )
}
