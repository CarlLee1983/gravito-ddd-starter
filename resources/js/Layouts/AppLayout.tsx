import React from 'react'
import { Link, router } from '@inertiajs/react'
import { LayoutDashboard, Users, Activity, Github, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

interface Props {
  children: React.ReactNode
  title: string
}

export default function AppLayout({ children, title }: Props) {
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
      router.visit('/')
    } catch (error) {
      console.error('登出失敗:', error)
    }
  }

  const userInitials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || 'U'

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center font-bold">G</div>
          <span className="text-xl font-bold tracking-tight">Gravito DDD</span>
        </div>

        <nav className="mt-4 px-4 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors transition-all duration-200"
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/users"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Users size={20} />
            <span>Users</span>
          </Link>

          <Link
            href="/health-dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Activity size={20} />
            <span>Health Check</span>
          </Link>
        </nav>

        <div className="absolute bottom-8 left-0 w-full px-8">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 transition-colors text-left text-slate-300 hover:text-white"
          >
            <LogOut size={20} />
            <span>登出</span>
          </button>
          <p className="text-slate-500 text-sm mt-4">© 2026 Gravito Framework</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
          <div className="flex items-center gap-4">
            <a href="https://github.com/gravito-framework" target="_blank" rel="noreferrer" className="text-gray-500 hover:text-gray-800">
              <Github size={20} />
            </a>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">{user?.name || '使用者'}</p>
                <p className="text-xs text-gray-500">{user?.email || ''}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-sm">
                {userInitials}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
