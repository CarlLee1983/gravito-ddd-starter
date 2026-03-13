import AppLayout from '../../Layouts/AppLayout'
import { 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShoppingCart, 
  Eye, 
  CreditCard, 
  PackageCheck,
  Filter,
  Download,
  Calendar
} from 'lucide-react'

export default function Analytics() {
  // Mock Data for KPIs
  const kpis = [
    { label: '總銷售額', value: '$128,430', change: '+12.5%', trend: 'up', icon: DollarSign, color: 'blue' },
    { label: '總訂單數', value: '1,240', change: '+18.2%', trend: 'up', icon: ShoppingBag, color: 'indigo' },
    { label: '平均客單價', value: '$103.5', change: '-2.4%', trend: 'down', icon: CreditCard, color: 'emerald' },
    { label: '轉換率', value: '3.2%', change: '+0.8%', trend: 'up', icon: TrendingUp, color: 'amber' },
  ]

  const topProducts = [
    { name: 'Gravito Pro Wireless Mouse', sales: 432, revenue: '$21,168', growth: '+15%' },
    { name: 'Mechanical Keyboard v2', sales: 312, revenue: '$46,488', growth: '+8%' },
    { name: 'USB-C Docking Station', sales: 256, revenue: '$12,544', growth: '+22%' },
    { name: 'UltraWide 34 Monitor', sales: 124, revenue: '$61,876', growth: '+4%' },
  ]

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
  }

  return (
    <AppLayout title="購物站數據分析">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">E-Commerce Insights</h2>
          <p className="text-slate-900 font-medium">即時掌握銷售表現與顧客行為</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all">
            <Calendar size={16} />
            過去 30 天
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10">
            <Download size={16} />
            匯出報告
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* KPI Cards */}
        {kpis.map((kpi, i) => (
          <div key={i} className="bento-card group hover:scale-[1.02] transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${colorMap[kpi.color]}`}>
                <kpi.icon size={22} />
              </div>
              <div className={`flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg ${
                kpi.trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {kpi.trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {kpi.change}
              </div>
            </div>
            <h4 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{kpi.label}</h4>
            <div className="text-2xl font-black text-slate-900 tracking-tight">{kpi.value}</div>
          </div>
        ))}

        {/* Sales Trend Chart Mockup */}
        <div className="md:col-span-3 bento-card relative overflow-hidden flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-8 relative z-10">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-600" />
              營收增長趨勢
            </h3>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> 本月營收
              </span>
            </div>
          </div>
          
          <div className="flex-1 relative mt-4">
            {/* SVG Mock Chart */}
            <svg className="w-full h-64 overflow-visible" viewBox="0 0 1000 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path 
                d="M0,150 Q50,140 100,160 T200,120 T300,130 T400,90 T500,100 T600,60 T700,70 T800,40 T900,50 T1000,20 L1000,200 L0,200 Z" 
                fill="url(#gradient)" 
              />
              <path 
                d="M0,150 Q50,140 100,160 T200,120 T300,130 T400,90 T500,100 T600,60 T700,70 T800,40 T900,50 T1000,20" 
                fill="none" 
                stroke="#3b82f6" 
                strokeWidth="3" 
                strokeLinecap="round"
                className="animate-in fade-in slide-in-from-left-4 duration-1000"
              />
            </svg>
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-6">
              <span>Week 1</span>
              <span>Week 2</span>
              <span>Week 3</span>
              <span>Week 4</span>
            </div>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="bento-card border-indigo-100">
          <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Filter size={18} className="text-indigo-600" />
            轉化漏斗
          </h3>
          <div className="space-y-6">
            {[
              { label: '商品瀏覽', value: '12,400', perc: '100%', icon: Eye, color: 'slate' },
              { label: '加入購物車', value: '2,480', perc: '20%', icon: ShoppingCart, color: 'blue' },
              { label: '啟動結帳', value: '868', perc: '7%', icon: PackageCheck, color: 'indigo' },
              { label: '完成訂單', value: '396', perc: '3.2%', icon: CreditCard, color: 'emerald' },
            ].map((step, i) => (
              <div key={i} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <step.icon size={14} className="text-slate-400" />
                    <span className="text-[11px] font-bold text-slate-700">{step.label}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">{step.perc}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      step.color === 'slate' ? 'bg-slate-300' : 
                      step.color === 'blue' ? 'bg-blue-500' : 
                      step.color === 'indigo' ? 'bg-indigo-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: step.perc }}
                  ></div>
                </div>
                <div className="text-[10px] text-slate-400 font-bold mt-1 text-right">{step.value} 次</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products Table */}
        <div className="md:col-span-2 bento-card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">熱銷商品排行</h3>
            <button className="text-xs font-bold text-blue-600 hover:underline">查看全部</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">商品名稱</th>
                  <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">銷量</th>
                  <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">營收</th>
                  <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">增長</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topProducts.map((product, i) => (
                  <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 font-bold text-slate-900 text-sm">{product.name}</td>
                    <td className="py-4 text-right font-bold text-slate-600 text-sm">{product.sales}</td>
                    <td className="py-4 text-right font-black text-slate-900 text-sm">{product.revenue}</td>
                    <td className="py-4 text-right">
                      <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                        {product.growth}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Real-time Order Feed */}
        <div className="md:col-span-2 bento-card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Users size={20} className="text-blue-600" />
              即時銷售動態
            </h3>
            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full animate-pulse">Live Now</span>
          </div>
          <div className="space-y-4">
            {[
              { user: 'Chen Wei-Lun', status: '已下單', time: '2 分鐘前', amount: '$1,280' },
              { user: 'Sarah Johnson', status: '待付款', time: '5 分鐘前', amount: '$432' },
              { user: 'Li Xiao-Ming', status: '已完成', time: '12 分鐘前', amount: '$8,900' },
              { user: 'Emily Davis', status: '已下單', time: '18 分鐘前', amount: '$256' },
            ].map((order, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl group hover:border-blue-200 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 font-bold border border-slate-200">
                    {order.user[0]}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{order.user}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{order.time}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-slate-900 text-sm">{order.amount}</div>
                  <div className="text-[10px] font-black text-blue-600">{order.status}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            查看所有交易記錄
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
