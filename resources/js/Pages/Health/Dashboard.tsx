import AppLayout from '../../Layouts/AppLayout'
import { Database, Server, Cpu, CheckCircle2, XCircle, Activity, Clock, ShieldCheck, Zap } from 'lucide-react'

interface SystemChecks {
  database: boolean
  redis?: boolean
  cache?: boolean
}

interface Props {
  status: string
  timestamp: string
  checks: SystemChecks
  message?: string
}

export default function Dashboard({ status, timestamp, checks, message }: Props) {
  const checkItems = [
    { name: '主要資料庫', status: checks.database, icon: Database, desc: 'Atlas / Drizzle 連線', color: 'blue' },
    { name: 'Redis 佇列', status: checks.redis, icon: Server, desc: '領域事件調度器', color: 'indigo' },
    { name: '系統快取', status: checks.cache, icon: Cpu, desc: '效能優化引擎', color: 'emerald' },
  ]

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  }

  return (
    <AppLayout title="系統健康儀表板">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Status Card */}
        <div className="md:col-span-2 bento-card flex flex-col justify-between overflow-hidden relative group">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-3 rounded-2xl ${status === 'healthy' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                <Activity size={24} className={status === 'healthy' ? 'animate-pulse' : ''} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">基礎設施節點</h3>
                <p className="text-slate-500 text-sm font-medium">連線服務的即時狀態監控</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {checkItems.map((item, i) => (
                <div key={i} className={`p-5 rounded-2xl border ${colorClasses[item.color]} flex flex-col gap-4 group/item hover:scale-[1.02] transition-transform duration-300`}>
                  <div className="flex justify-between items-start">
                    <item.icon size={20} />
                    {item.status !== false ? (
                      <CheckCircle2 className="text-green-500" size={18} />
                    ) : (
                      <XCircle className="text-red-500" size={18} />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{item.name}</div>
                    <div className="text-[10px] opacity-70 font-medium uppercase tracking-wider">{item.status !== false ? '運作正常' : '連線異常'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest">
              <Clock size={14} />
              最後檢查時間: {new Date(timestamp).toLocaleTimeString('zh-TW')}
            </div>
            <button className="text-blue-600 text-xs font-bold hover:underline">手動刷新</button>
          </div>
          
          {/* Decorative background icon */}
          <Activity className="absolute -right-8 -bottom-8 text-slate-50 w-48 h-48 -rotate-12 pointer-events-none" />
        </div>

        {/* System Info Sidebar Bento */}
        <div className="bento-card bg-slate-900 text-white border-none shadow-xl shadow-slate-900/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold tracking-tight">系統概況</h3>
              <ShieldCheck className="text-blue-500" size={24} />
            </div>
            
            <div className="space-y-5">
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-800 border border-slate-700">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">環境</span>
                <span className="text-sm font-bold text-blue-400">Development</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-800 border border-slate-700">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">可用性</span>
                <span className="text-sm font-bold text-green-400">99.9%</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-800 border border-slate-700">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">版本</span>
                <span className="text-sm font-bold text-slate-300">v1.1.0</span>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-amber-400" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">系統訊息</span>
            </div>
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
              <p className="text-sm text-blue-100 italic font-medium leading-relaxed">
                "{message || '一切運行正常，暫無警報訊息。'}"
              </p>
            </div>
          </div>
        </div>

        {/* Action Card - Wide */}
        <div className="md:col-span-3 bento-card bg-white border-blue-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Server size={24} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900 tracking-tight">日誌管理與監控</h4>
              <p className="text-slate-500 text-sm font-medium">查看詳細的系統日誌以進行故障排除和效能分析。</p>
            </div>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button className="flex-1 md:flex-none px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10">
              開啟日誌中心
            </button>
            <button className="flex-1 md:flex-none px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">
              配置警報
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
