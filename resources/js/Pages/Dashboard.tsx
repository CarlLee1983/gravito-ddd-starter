import { useEffect } from 'react'
import { router } from '@inertiajs/react'
import AppLayout from '../Layouts/AppLayout'
import { useAuth } from '../hooks/useAuth'
import { User, Mail, Calendar, Shield, Cpu, Zap, Activity } from 'lucide-react'

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) {
      router.visit('/login')
    }
  }, [isAuthenticated])

  if (!user) {
    return (
      <AppLayout title="載入中">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="控制面板概覽">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Welcome Card - Large Span */}
        <div className="md:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-500/20 flex flex-col justify-between overflow-hidden relative group">
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
              歡迎回來，{user.name}！
            </h2>
            <p className="text-blue-100 text-lg max-w-md leading-relaxed">
              您的 Gravito DDD 平臺運作正常。今天有 3 個新任務等待處理，系統核心組件已全部就緒。
            </p>
          </div>
          <div className="mt-8 relative z-10">
            <button className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-6 py-2.5 rounded-xl font-bold transition-all border border-white/10 text-sm">
              查看系統報告
            </button>
          </div>
          {/* Decorative elements */}
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
          <Zap className="absolute right-12 top-12 text-white/10 w-32 h-32 rotate-12" />
        </div>

        {/* Quick Stats - Bento Box 1 */}
        <div className="bento-card flex flex-col justify-between border-blue-100 bg-blue-50/30">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-blue-100 rounded-2xl text-blue-600">
              <Shield size={24} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 px-2 py-1 bg-blue-100/50 rounded-full">
              Security Active
            </span>
          </div>
          <div>
            <h4 className="text-slate-500 text-sm font-medium mb-1">帳戶安全等級</h4>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">高</span>
              <span className="text-green-500 text-xs font-bold">+2.4%</span>
            </div>
          </div>
        </div>

        {/* User Profile Info - Bento Box 2 */}
        <div className="bento-card md:row-span-2">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <User size={20} className="text-blue-600" />
            個人檔案
          </h3>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                {user.name[0]}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Mail size={16} />
                  <span>郵件</span>
                </div>
                <span className="text-xs font-medium text-slate-900 truncate ml-4">{user.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <Calendar size={16} />
                  <span>加入日期</span>
                </div>
                <span className="text-xs font-medium text-slate-900">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-TW') : 'N/A'}
                </span>
              </div>
            </div>
          </div>
          <button className="w-full mt-8 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            編輯個人資料
          </button>
        </div>

        {/* System Activity - Bento Box 3 */}
        <div className="bento-card border-indigo-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity size={18} className="text-indigo-600" />
              系統健康
            </h3>
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">API 延遲</span>
              <span className="font-bold text-slate-900">24ms</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-green-500 h-full w-[85%] rounded-full"></div>
            </div>
            <div className="flex justify-between text-xs pt-2">
              <span className="text-slate-500">記憶體佔用</span>
              <span className="font-bold text-slate-900">42%</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full w-[42%] rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Recent Tech - Bento Box 4 */}
        <div className="bento-card">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Cpu size={18} className="text-slate-600" />
            技術棧
          </h3>
          <div className="flex flex-wrap gap-2">
            {['Bun', 'TypeScript', 'DDD', 'React', 'Drizzle', 'Inertia'].map(tech => (
              <span key={tech} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold border border-slate-200 uppercase">
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Actions Section - Wide */}
        <div className="md:col-span-2 bento-card bg-slate-900 text-white border-none shadow-xl shadow-slate-900/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h3 className="text-xl font-bold mb-2 tracking-tight">快速操作</h3>
              <p className="text-slate-400 text-sm">部署新模組或管理現有資源。</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <button className="flex-1 md:flex-none px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20">
                新增模組
              </button>
              <button className="flex-1 md:flex-none px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-sm transition-all border border-slate-700">
                管理 API
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
