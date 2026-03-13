import { Link } from '@inertiajs/react'
import { Rocket, ShieldCheck, Zap, Layers, ChevronRight, Github, ExternalLink, ArrowRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function Welcome() {
  const { isAuthenticated } = useAuth()

  const features = [
    {
      title: '安全性優先',
      desc: '基於 JWT 的強大驗證系統與會話管理，為您的資料提供企業級保護。',
      icon: ShieldCheck,
      color: 'blue'
    },
    {
      title: '極速效能',
      desc: '利用 Bun 執行環境與現代化編譯技術，實現毫秒級的響應速度。',
      icon: Zap,
      color: 'amber'
    },
    {
      title: '領域驅動設計 (DDD)',
      desc: '嚴格遵循 DDD 原則，確保業務邏輯與基礎設施完全解耦，易於擴展。',
      icon: Layers,
      color: 'indigo'
    },
    {
      title: '自動化佈署',
      desc: '完善的 CI/CD 流程支援，讓您的創意從開發到上線一氣呵成。',
      icon: Rocket,
      color: 'emerald'
    },
  ]

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  }

  return (
    <div className="min-h-screen bg-white selection:bg-blue-100 selection:text-blue-900 overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/50 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-indigo-100/50 rounded-full blur-[100px]"></div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center h-16 px-6 glass rounded-2xl border-white/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">G</div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Gravito</span>
          </div>
          
          <div className="flex items-center gap-4">
            {!isAuthenticated ? (
              <>
                <Link
                  href="/login"
                  className="hidden sm:block px-4 py-2 text-slate-600 hover:text-slate-900 font-bold text-sm transition-colors"
                >
                  登入
                </Link>
                <Link
                  href="/register"
                  className="px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold text-sm shadow-xl shadow-slate-900/10 transition-all active:scale-95"
                >
                  立即註冊
                </Link>
              </>
            ) : (
              <Link
                href="/dashboard"
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-sm shadow-xl shadow-blue-600/20 transition-all active:scale-95 flex items-center gap-2"
              >
                前往儀表板 <ChevronRight size={16} />
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Gravito DDD Framework v1.1.0 已發佈
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-8 tracking-tighter leading-tight animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            構建下一個世代的 <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600">
              企業級應用平臺
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
            基於領域驅動設計 (DDD) 架構，整合了現代化技術棧。
            讓開發者專注於業務價值，而非繁瑣的基礎設施。
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
            <Link
              href="/products"
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-bold text-lg shadow-2xl shadow-blue-600/30 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2"
            >
              瀏覽精選商品 <ChevronRight size={20} />
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl hover:bg-slate-50 font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              進入管理後臺 <ArrowRight size={18} />
            </Link>
          </div>

          {/* Abstract Dashboard Preview Placeholder */}
          <div className="mt-20 relative max-w-5xl mx-auto animate-in fade-in zoom-in duration-1000 delay-400">
            <div className="aspect-[16/9] bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl border border-slate-200 shadow-2xl overflow-hidden p-4">
              <div className="w-full h-full bg-white rounded-2xl border border-slate-100 shadow-sm flex overflow-hidden">
                <div className="w-48 bg-slate-50 border-r border-slate-100 p-4 space-y-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg"></div>
                  <div className="h-4 bg-slate-200 rounded w-full"></div>
                  <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                </div>
                <div className="flex-1 p-8 space-y-8">
                  <div className="flex justify-between">
                    <div className="h-8 bg-slate-200 rounded w-48"></div>
                    <div className="h-8 bg-slate-100 rounded w-12"></div>
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="h-32 bg-slate-50 rounded-2xl border border-slate-100"></div>
                    <div className="h-32 bg-slate-50 rounded-2xl border border-slate-100"></div>
                    <div className="h-32 bg-slate-50 rounded-2xl border border-slate-100"></div>
                  </div>
                </div>
              </div>
            </div>
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent pointer-events-none"></div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">
              為什麼選擇 Gravito?
            </h2>
            <p className="text-slate-500 font-medium">專為複雜業務場景設計的架構體系</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-8 bg-white rounded-3xl border border-slate-200 hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-300"
              >
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <div className={`p-4 rounded-2xl ${colorMap[feature.color]} group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon size={32} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">{feature.title}</h3>
                    <p className="text-slate-500 leading-relaxed font-medium">{feature.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto bg-slate-900 rounded-[3rem] p-8 md:p-16 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-20">
            <Zap className="text-blue-500 w-64 h-64 -mr-32 -mt-32 rotate-12" />
          </div>
          
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">
              準備好開啟您的現代化開發旅程了嗎？
            </h2>
            <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto font-medium">
              加入數百位開發者的行列，開始體驗 Gravito 帶來的效率革命。
            </p>
            <Link
              href="/register"
              className="inline-flex px-10 py-5 bg-white text-slate-900 rounded-2xl hover:bg-slate-100 font-black text-xl transition-all hover:-translate-y-1 active:scale-95"
            >
              免費註冊帳號
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50 grayscale">
            <div className="w-6 h-6 bg-slate-900 rounded flex items-center justify-center text-white font-bold text-[10px]">G</div>
            <span className="font-bold tracking-tight text-slate-900">Gravito</span>
          </div>
          <div className="flex gap-8">
            <a href="#" className="text-slate-400 hover:text-slate-900 transition-colors"><Github size={20} /></a>
          </div>
          <p className="text-slate-400 text-sm font-medium">
            &copy; 2026 Gravito Framework. Built with DDD Principles.
          </p>
        </div>
      </footer>
    </div>
  )
}
