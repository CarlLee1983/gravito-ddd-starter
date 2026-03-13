import { useEffect } from 'react'
import { router } from '@inertiajs/react'
import AppLayout from '../Layouts/AppLayout'
import { useAuth } from '../hooks/useAuth'

export default function Dashboard() {
  const { user, isAuthenticated, logout } = useAuth()

  // 檢查認證狀態，未登入時重導
  useEffect(() => {
    if (!isAuthenticated) {
      router.visit('/login')
    }
  }, [isAuthenticated])

  const handleLogout = async () => {
    try {
      await logout()
      router.visit('/')
    } catch (error) {
      console.error('登出失敗:', error)
    }
  }

  if (!user) {
    return (
      <AppLayout title="載入中">
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-600">載入中...</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title={`歡迎，${user.name}`}>
      <div className="max-w-4xl mx-auto">
        {/* 歡迎訊息 */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            歡迎，{user.name}！
          </h2>
          <p className="text-gray-600 text-lg">
            您已成功登入 Gravito 平臺。管理您的帳戶和個人資訊。
          </p>
        </div>

        {/* 用戶資訊卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* 帳戶資訊 */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">帳戶資訊</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  用戶 ID
                </label>
                <p className="text-gray-900 font-mono bg-gray-50 p-3 rounded">
                  {user.id}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  名稱
                </label>
                <p className="text-gray-900">{user.name}</p>
              </div>
            </div>
          </div>

          {/* 聯絡資訊 */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">聯絡資訊</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  郵件地址
                </label>
                <p className="text-gray-900">{user.email}</p>
              </div>
              {user.createdAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    帳戶建立日期
                  </label>
                  <p className="text-gray-900">
                    {new Date(user.createdAt).toLocaleDateString('zh-TW')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 操作區域 */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">操作</h3>
          <div className="flex gap-4">
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-colors"
            >
              登出
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
