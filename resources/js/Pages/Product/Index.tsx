import { useState } from 'react'
import { Link } from '@inertiajs/react'
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  ChevronDown, 
  Star, 
  Plus, 
  Heart,
  ArrowRight,
  Zap,
  Tag
} from 'lucide-react'
import WelcomeLayout from '../../Layouts/AppLayout' // We can use AppLayout or a separate GuestStorefrontLayout

// Mock Data
const products = [
  { id: 1, name: 'Gravito Pro Wireless Mouse', price: '$89.99', category: '配件', image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=300&auto=format&fit=crop', rating: 4.8, reviews: 124, tag: 'New' },
  { id: 2, name: 'Mechanical Keyboard v2', price: '$149.00', category: '配件', image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?q=80&w=300&auto=format&fit=crop', rating: 4.9, reviews: 89, tag: 'Best Seller' },
  { id: 3, name: 'USB-C Docking Station', price: '$49.99', category: '辦公用具', image: 'https://images.unsplash.com/photo-1586210579191-33b45e38fa2c?q=80&w=300&auto=format&fit=crop', rating: 4.5, reviews: 56 },
  { id: 4, name: 'UltraWide 34 Monitor', price: '$499.00', category: '顯示器', image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=300&auto=format&fit=crop', rating: 4.7, reviews: 210 },
  { id: 5, name: 'Ergonomic Desk Chair', price: '$299.00', category: '傢俱', image: 'https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?q=80&w=300&auto=format&fit=crop', rating: 4.6, reviews: 42, tag: 'Limited' },
  { id: 6, name: 'Noise Cancelling Headphones', price: '$199.99', category: '音頻', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=300&auto=format&fit=crop', rating: 4.8, reviews: 156 },
]

export default function ProductIndex() {
  const [selectedCategory, setSelectedCategory] = useState('全部')
  const categories = ['全部', '配件', '顯示器', '辦公用具', '傢俱', '音頻']

  return (
    <WelcomeLayout title="精選商品">
      {/* Hero Storefront Banner */}
      <div className="relative mb-12 rounded-[2.5rem] overflow-hidden bg-slate-900 min-h-[320px] flex items-center group">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/40 to-transparent z-10"></div>
        <img 
          src="https://images.unsplash.com/photo-1491933382434-500287f9b54b?q=80&w=1200&auto=format&fit=crop" 
          className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-1000"
          alt="Banner"
        />
        <div className="relative z-20 px-12 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500 rounded-full text-[10px] font-black text-white uppercase tracking-widest mb-6">
            <Zap size={12} fill="currentColor" />
            Seasonal Sale
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight leading-tight">
            提升您的 <br />
            <span className="text-blue-400">數位工作效率</span>
          </h2>
          <p className="text-slate-300 font-medium mb-8">
            挑選最適合您開發環境的頂尖硬體。限時優惠中，全館免運費。
          </p>
          <button className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-lg shadow-xl hover:bg-slate-50 transition-all hover:-translate-y-1 active:scale-95">
            探索新品
          </button>
        </div>
      </div>

      {/* Control Bar - Filter & Search */}
      <div className="sticky top-24 z-30 mb-8 glass rounded-2xl px-6 py-4 border-white/40 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl shadow-slate-200/40">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64 group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="搜尋商品..." 
              className="w-full pl-11 pr-4 py-2.5 bg-white/50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-medium"
            />
          </div>
          <button className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {products.map((product) => (
          <div key={product.id} className="group relative flex flex-col bg-white rounded-[2rem] border border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-500 hover:-translate-y-2">
            {/* Image Container */}
            <div className="aspect-[4/5] relative overflow-hidden bg-slate-50">
              <img 
                src={product.image} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                alt={product.name}
              />
              
              {/* Badge */}
              {product.tag && (
                <div className="absolute top-4 left-4 z-10">
                  <span className="px-3 py-1 bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-black rounded-lg uppercase tracking-widest border border-white/20">
                    {product.tag}
                  </span>
                </div>
              )}

              {/* Wishlist Button */}
              <button className="absolute top-4 right-4 z-10 p-2.5 bg-white/80 backdrop-blur-md text-slate-400 rounded-xl hover:text-red-500 hover:bg-white transition-all shadow-sm">
                <Heart size={18} />
              </button>

              {/* Add to Cart Overlay */}
              <div className="absolute inset-x-4 bottom-4 translate-y-20 group-hover:translate-y-0 transition-transform duration-500 z-10">
                <button className="w-full py-3 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                  <Plus size={18} /> 加入購物車
                </button>
              </div>
              
              {/* Hover Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </div>

            {/* Content Container */}
            <div className="p-6 flex flex-col flex-1">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{product.category}</span>
                <div className="flex items-center gap-1 text-amber-500">
                  <Star size={12} fill="currentColor" />
                  <span className="text-[11px] font-black text-slate-900">{product.rating}</span>
                </div>
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug mb-3 group-hover:text-blue-600 transition-colors">
                {product.name}
              </h3>
              
              <div className="mt-auto flex justify-between items-center">
                <span className="text-2xl font-black text-slate-900 tracking-tighter">{product.price}</span>
                <span className="text-[10px] font-bold text-slate-400">{product.reviews} 則評論</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination / Load More */}
      <div className="mt-16 flex justify-center">
        <button className="group px-8 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-lg transition-all hover:border-blue-600 hover:text-blue-600 flex items-center gap-2">
          載入更多商品 <ArrowRight className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Quick Shopping Bar (Floating Bottom) */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
        <div className="glass px-6 py-4 rounded-3xl border-white/40 shadow-2xl flex items-center gap-8 min-w-[320px]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white relative">
              <ShoppingBag size={20} />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 border-2 border-white rounded-full text-[10px] font-black flex items-center justify-center">
                3
              </span>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">購物車合計</p>
              <p className="text-sm font-black text-slate-900">$328.98</p>
            </div>
          </div>
          <Link 
            href="/cart"
            className="flex-1 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all text-center whitespace-nowrap"
          >
            去結帳
          </Link>
        </div>
      </div>
    </WelcomeLayout>
  )
}
