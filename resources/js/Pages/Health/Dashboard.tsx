import AppLayout from '../../Layouts/AppLayout'
import { Database, Server, Cpu, CheckCircle2, XCircle } from 'lucide-react'

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
    { name: 'Primary Database', status: checks.database, icon: Database, desc: 'Atlas / Drizzle Connection' },
    { name: 'Redis Queue', status: checks.redis, icon: Server, desc: 'Domain Event Dispatcher' },
    { name: 'System Cache', status: checks.cache, icon: Cpu, desc: 'Performance Optimizer' },
  ]

  return (
    <AppLayout title="System Health Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Infrastructure Nodes</h3>
              <p className="text-slate-500 text-sm">Real-time status of connected services</p>
            </div>
            <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
              status === 'healthy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              System {status}
            </div>
          </div>

          <div className="space-y-4">
            {checkItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-400 shadow-sm border border-gray-100">
                    <item.icon size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.desc}</div>
                  </div>
                </div>
                {item.status !== false ? (
                  <CheckCircle2 className="text-green-500" size={24} />
                ) : (
                  <XCircle className="text-red-500" size={24} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl shadow-lg p-8 text-white relative overflow-hidden">
          <h3 className="text-lg font-bold mb-2">Last Update</h3>
          <div className="text-3xl font-mono mb-8">{new Date(timestamp).toLocaleTimeString()}</div>
          
          <div className="space-y-4 text-sm text-slate-400">
            <p><strong>Environment:</strong> development</p>
            <p><strong>Uptime:</strong> 99.9%</p>
            <p><strong>Version:</strong> v1.1.0</p>
          </div>

          <div className="mt-12 p-4 bg-slate-800 rounded-xl border border-slate-700">
            <div className="text-xs text-slate-500 mb-1 uppercase font-bold tracking-widest">Message</div>
            <p className="text-white italic">"{message}"</p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
