import AppLayout from '../Layouts/AppLayout'
import { Rocket, ShieldCheck, Zap, Layers } from 'lucide-react'

export default function Welcome() {
  const features = [
    { title: 'DDD Architecture', desc: 'Strict separation of Domain, Application, and Infrastructure layers.', icon: Layers },
    { title: 'Event Driven', desc: 'Decoupled module communication via Redis-backed Domain Events.', icon: Zap },
    { title: 'Type Safe', desc: 'End-to-end type safety from Backend Repositories to Frontend Props.', icon: ShieldCheck },
    { title: 'Zero-Wiring', desc: 'Auto-scanned modules and assembly for rapid development.', icon: Rocket },
  ]

  return (
    <AppLayout title="Dashboard Overview">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 mb-8 overflow-hidden relative">
          <div className="relative z-10">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">
              Welcome to your <span className="text-brand">DDD Starter</span>
            </h2>
            <p className="text-xl text-slate-600 mb-8 max-w-2xl">
              A high-quality full-stack boilerplate built with Bun, Gravito Framework, and React. 
              Designed for scalability, testability, and developer happiness.
            </p>
            <div className="flex gap-4">
              <button className="px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors">
                View Documentation
              </button>
              <button className="px-6 py-3 bg-white border border-gray-200 text-slate-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                Quick Start Guide
              </button>
            </div>
          </div>
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-50"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <div key={i} className="p-8 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-brand mb-6 group-hover:bg-brand group-hover:text-white transition-colors">
                <f.icon size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-slate-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
