import { Check, Home, Download } from 'lucide-react'
import { Link } from '@inertiajs/react'
import WelcomeLayout from '../../Layouts/AppLayout'

export default function PaymentSuccess({ orderId }: { orderId?: string }) {
  return (
    <WelcomeLayout title="支付成功">
      <div className="max-w-md mx-auto py-12">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <Check className="text-green-600" size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">支付成功！</h1>
          <p className="text-slate-600">您的訂單已成功支付</p>
        </div>

        {/* Order Info */}
        {orderId && (
          <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-200">
            <p className="text-sm text-slate-600 mb-1">訂單編號</p>
            <p className="text-lg font-black text-slate-900">{orderId}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 mb-8">
          <Link
            href={orderId ? `/orders/${orderId}` : '/orders'}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-center hover:bg-blue-700 transition-all block"
          >
            查看訂單詳情
          </Link>
          <button className="w-full py-3 border border-slate-200 text-slate-900 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
            <Download size={18} /> 下載收據
          </button>
          <Link
            href="/"
            className="w-full py-3 text-slate-600 rounded-xl font-bold hover:text-slate-900 transition-all flex items-center justify-center gap-2"
          >
            <Home size={18} /> 返回首頁
          </Link>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          感謝您的購買！您將很快收到確認信函。
        </div>
      </div>
    </WelcomeLayout>
  )
}
