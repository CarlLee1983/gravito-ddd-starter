import { X, Home, ArrowLeft } from 'lucide-react'
import { Link } from '@inertiajs/react'
import WelcomeLayout from '../../Layouts/AppLayout'

export default function PaymentFailed({ orderId, reason }: { orderId?: string; reason?: string }) {
  return (
    <WelcomeLayout title="支付失敗">
      <div className="max-w-md mx-auto py-12">
        {/* Error Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
            <X className="text-red-600" size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">支付失敗</h1>
          <p className="text-slate-600">無法處理您的支付請求</p>
        </div>

        {/* Error Info */}
        {orderId && (
          <div className="bg-slate-50 rounded-xl p-6 mb-6 border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">訂單編號</p>
            <p className="text-lg font-black text-slate-900 mb-4">{orderId}</p>
            {reason && (
              <>
                <p className="text-sm text-slate-600 mb-1">失敗原因</p>
                <p className="text-slate-700">{reason}</p>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 mb-8">
          <button className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all">
            重試支付
          </button>
          {orderId && (
            <Link
              href={`/orders/${orderId}`}
              className="w-full py-3 border border-slate-200 text-slate-900 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft size={18} /> 返回訂單
            </Link>
          )}
          <Link
            href="/"
            className="w-full py-3 text-slate-600 rounded-xl font-bold hover:text-slate-900 transition-all flex items-center justify-center gap-2"
          >
            <Home size={18} /> 返回首頁
          </Link>
        </div>

        {/* Help */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          如果問題持續，請聯絡客服支援。
        </div>
      </div>
    </WelcomeLayout>
  )
}
