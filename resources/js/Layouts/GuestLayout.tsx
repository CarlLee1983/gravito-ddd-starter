import React from 'react'
import { Link } from '@inertiajs/react'

interface GuestLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  bottomLink?: {
    text: string
    href: string
    linkText: string
  }
}

/**
 * Guest Layout（登入/註冊頁面用）
 *
 * 特點：
 * - 無側欄，居中卡片版面
 * - Logo 顯示
 * - 頁面內容插槽
 * - 底部導航連結
 * - 響應式設計
 */
export default function GuestLayout({
  children,
  title,
  subtitle,
  bottomLink,
}: GuestLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Logo / Branding */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gravito</h1>
          {title && <h2 className="text-2xl font-semibold text-gray-700">{title}</h2>}
          {subtitle && <p className="text-gray-600 mt-2">{subtitle}</p>}
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {children}
        </div>

        {/* Bottom Navigation Link */}
        {bottomLink && (
          <div className="text-center mt-6">
            <p className="text-gray-600">
              {bottomLink.text}{' '}
              <Link href={bottomLink.href} className="text-blue-600 hover:text-blue-800 font-semibold">
                {bottomLink.linkText}
              </Link>
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>&copy; 2026 Gravito. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
