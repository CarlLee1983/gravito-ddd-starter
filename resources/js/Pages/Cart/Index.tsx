import { useState } from 'react'
import { Link } from '@inertiajs/react'
import { 
  Trash2, 
  Minus, 
  Plus, 
  ArrowLeft, 
  CreditCard, 
  ShieldCheck, 
  Truck, 
  ChevronRight,
  ShoppingBag
} from 'lucide-react'
import AppLayout from '../../Layouts/AppLayout'

// Mock Data
const initialCartItems = [
  { id: 1, name: 'Gravito Pro Wireless Mouse', price: 89.99, quantity: 1, image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=200&auto=format&fit=crop', category: '配件' },
  { id: 2, name: 'Mechanical Keyboard v2', price: 149.00, quantity: 1, image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?q=80&w=200&auto=format&fit=crop', category: '配件' },
]

export default function CartIndex() {
  const [items, setItems] = useState(initialCartItems)

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0)
  const shipping = 0
  const total = subtotal + shipping

  const updateQuantity = (id: number, delta: number) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    ))
  }

  const removeItem = (id: number) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  return (
    <AppLayout title="我的購物車">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Cart Items List */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between mb-2 px-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">項目 ({items.length})</h2>
            <Link href="/products" className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">
              <ArrowLeft size={14} /> 繼續選購
            </Link>
          </div>

          {items.length > 0 ? (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="bg-white rounded-[2rem] border border-slate-100 p-6 flex flex-col sm:flex-row items-center gap-6 group hover:border-blue-200 transition-all duration-300">
                  <div className="w-24 h-24 bg-slate-50 rounded-2xl overflow-hidden flex-shrink-0">
                    <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.name} />
                  </div>
                  
                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{item.category}</p>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight mb-2">{item.name}</h3>
                    <p className="text-xl font-black text-slate-900 tracking-tighter">${item.price}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center bg-slate-100 rounded-xl p-1">
                      <button 
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-2 hover:bg-white rounded-lg transition-colors text-slate-600"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-10 text-center font-black text-slate-900">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-2 hover:bg-white rounded-lg transition-colors text-slate-600"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-dashed border-slate-200 p-20 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                <ShoppingBag size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">購物車是空的</h3>
              <p className="text-slate-400 mb-8">看來您還沒有挑選任何商品。</p>
              <Link href="/products" className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20">
                去逛逛
              </Link>
            </div>
          )}

          {/* Payment Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100">
              <div className="p-2 bg-green-50 text-green-600 rounded-lg"><ShieldCheck size={20} /></div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">安全加密結帳</p>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Truck size={20} /></div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">全館免運費</p>
            </div>
            <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><CreditCard size={20} /></div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">支援多種支付</p>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="w-full lg:w-96 space-y-6">
          <div className="bento-card sticky top-24 border-blue-100">
            <h3 className="text-xl font-black text-slate-900 mb-6 tracking-tight">訂單摘要</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-slate-500 font-medium">
                <span>商品小計</span>
                <span className="text-slate-900 font-bold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500 font-medium">
                <span>運費估計</span>
                <span className="text-green-600 font-bold">{shipping === 0 ? '免費' : `$${shipping}`}</span>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-between items-baseline">
                <span className="text-slate-900 font-black">應付總計</span>
                <span className="text-3xl font-black text-blue-600 tracking-tighter">${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2">
                結帳付款 <ChevronRight size={20} />
              </button>
              <p className="text-[10px] text-center text-slate-400 font-medium px-4">
                按下結帳即代表您同意本站的服務條款與退貨政策。
              </p>
            </div>
          </div>

          <div className="bento-card bg-slate-50 border-none p-6">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">需要協助？</h4>
            <div className="space-y-4">
              <button className="w-full py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors">
                聯繫客服
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
