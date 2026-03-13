import { Link } from '@inertiajs/react'
import { Rocket, ShieldCheck, Zap, Layers } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function Welcome() {
  const { isAuthenticated } = useAuth()

  const features = [
    {
      title: '安全登入',
      desc: 'JWT 驗證和會話管理，確保您的帳戶安全。',
      icon: ShieldCheck
    },
    {
      title: '快速註冊',
      desc: '簡單的註冊流程，立即開始使用平臺。',
      icon: Rocket
    },
    {
      title: '個人管理',
      desc: '管理您的個人資料和帳戶設定。',
      icon: Layers
    },
    {
      title: 'API 存取',
      desc: '利用強大的 API 構建您自己的應用。',
      icon: Zap
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navbar */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">Gravito</h1>
            </div>
            <div className="flex items-center gap-4">
              {!isAuthenticated && (
                <>
                  <Link
                    href="/login"
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
                  >
                    登入
                  </Link>
                  <Link
                    href="/register"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                  >
                    立即註冊
                  </Link>
                </>
              )}
              {isAuthenticated && (
                <Link
                  href="/dashboard"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  前往儀表板
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6">
            歡迎來到 <span className="text-blue-600">Gravito</span>
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
            使用 DDD 架構構建的現代化應用平臺。安全、可靠、易於擴展。
          </p>
          <div className="flex gap-4 justify-center">
            {!isAuthenticated && (
              <>
                <Link
                  href="/register"
                  className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg transition-colors"
                >
                  立即開始
                </Link>
                <Link
                  href="/login"
                  className="px-8 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 font-semibold text-lg transition-colors"
                >
                  已有帳號？登入
                </Link>
              </>
            )}
            {isAuthenticated && (
              <Link
                href="/dashboard"
                className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg transition-colors"
              >
                前往儀表板
              </Link>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md p-8 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <feature.icon className="text-blue-600" size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-16 pt-8 border-t border-gray-200">
          <p className="text-gray-600">
            &copy; 2026 Gravito. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
