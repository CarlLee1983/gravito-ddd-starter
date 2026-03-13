import React from 'react'
import { Link } from '@inertiajs/react'

interface Props {
  children: React.ReactNode
  title: string
  subtitle?: string
  bottomLink?: {
    text: string
    href: string
    linkText: string
  }
}

export default function GuestLayout({ children, title, subtitle, bottomLink }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50 animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-50 animate-pulse delay-700"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2 mb-8 group">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
              G
            </div>
            <span className="text-2xl font-black tracking-tighter text-slate-900">Gravito</span>
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{title}</h1>
          {subtitle && <p className="text-slate-500 font-medium">{subtitle}</p>}
        </div>

        <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/60 border border-slate-100 p-8 md:p-10">
          {children}

          {bottomLink && (
            <div className="mt-8 pt-6 border-t border-slate-50 text-center">
              <p className="text-slate-500 text-sm font-medium">
                {bottomLink.text}{' '}
                <Link
                  href={bottomLink.href}
                  className="text-blue-600 hover:text-blue-700 font-bold transition-colors"
                >
                  {bottomLink.linkText}
                </Link>
              </p>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-slate-400 text-xs font-medium uppercase tracking-widest">
          © 2026 Gravito Framework DDD
        </p>
      </div>
    </div>
  )
}
