import React from 'react'
import { Link, router, usePage } from '@inertiajs/react'
import { LayoutDashboard, Users, Activity, Github, LogOut, Menu, X, Bell, ShoppingBag, ShoppingCart } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

interface Props {
  children: React.ReactNode
  title: string
}

export default function AppLayout({ children, title }: Props) {
  const { user, logout } = useAuth()
  const { url } = usePage()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      router.visit('/')
    } catch (error) {
      console.error('登出失敗:', error)
    }
  }

  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase()
    : '?'

  const navigation = [
    { name: '控制面板', href: '/dashboard', icon: LayoutDashboard },
    { name: '商品列表', href: '/products', icon: ShoppingBag },
    { name: '我的購物車', href: '/cart', icon: ShoppingCart },
    { name: '數據分析', href: '/analytics', icon: Activity },
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <div className="h-full flex flex-col p-6">
          {/* Logo Section */}
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-blue-500/30">
              G
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight">Gravito</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold leading-none">Framework DDD</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {navigation.map((item) => {
              const isActive = url === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                    ${isActive 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'}
                  `}
                >
                  <item.icon size={20} className={isActive ? 'text-white' : 'group-hover:text-blue-400'} />
                  <span className="font-medium">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* User Section Bottom */}
          <div className="mt-auto pt-6 border-t border-slate-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 group"
            >
              <LogOut size={20} />
              <span className="font-medium">安全登出</span>
            </button>
            <p className="text-slate-600 text-[11px] mt-6 text-center">© 2026 Gravito Platform v1.1.0</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="md:pl-72 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 md:h-20 flex items-center justify-between px-4 md:px-8 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button className="hidden sm:flex p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-white"></span>
            </button>
            
            <a 
              href="https://github.com/gravito-framework" 
              target="_blank" 
              rel="noreferrer" 
              className="hidden sm:flex p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Github size={20} />
            </a>

            <div className="h-8 w-[1px] bg-slate-200 mx-2 hidden sm:block"></div>

            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 leading-none">{user?.name || '使用者'}</p>
                <p className="text-[11px] text-slate-500 font-medium mt-1">{user?.email || ''}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
                {userInitials}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
