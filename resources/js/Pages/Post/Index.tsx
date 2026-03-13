import { useState } from 'react'
import { Search, Plus, Calendar, User, ArrowRight } from 'lucide-react'
import WelcomeLayout from '../../Layouts/AppLayout'

interface Post {
  id: string
  title: string
  content: string
  authorId: string
  createdAt: string
  isPublished: boolean
}

export default function PostIndex({ posts = [] }: { posts: Post[] }) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <WelcomeLayout title="文章管理">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-black text-slate-900">文章管理</h1>
          <button className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all">
            <Plus size={20} /> 撰寫文章
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-8 relative">
          <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="搜尋文章標題..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none"
          />
        </div>

        {/* Posts Grid */}
        {filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 text-lg">目前沒有文章</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <div key={post.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all group cursor-pointer">
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    {post.isPublished && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-lg">
                        已發佈
                      </span>
                    )}
                    {!post.isPublished && (
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg">
                        草稿
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-slate-600 text-sm mb-4 line-clamp-3">
                    {post.content}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      {new Date(post.createdAt).toLocaleDateString('zh-TW')}
                    </div>
                  </div>
                  <button className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-100 transition-all flex items-center justify-center gap-2">
                    閱讀更多 <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </WelcomeLayout>
  )
}
