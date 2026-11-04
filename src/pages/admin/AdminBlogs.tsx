import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Sparkles, Plus, Search, RefreshCw, Eye, Edit2, Trash2,
  ExternalLink, Calendar, Check, X, Clock, Tag, Globe, CheckCircle2
} from 'lucide-react';
import { blogService, BlogItem } from '@/services/blog.service';
import { toast } from 'sonner';

const CATEGORIES = [
  'Kitchen Tips',
  'Buying Guide',
  'Recipes',
  'Product Spotlight',
  'Health & Wellness',
  'Maintenance',
];

const CATEGORY_COLORS: Record<string, string> = {
  'Kitchen Tips':       'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Buying Guide':       'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Recipes':            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Product Spotlight':  'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Health & Wellness':  'bg-rose-500/10 text-rose-400 border-rose-500/20',
  'Maintenance':        'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

export default function AdminBlogs() {
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Edit / Create modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [currentBlog, setCurrentBlog] = useState<Partial<BlogItem> | null>(null);
  const [saving, setSaving] = useState(false);

  const loadBlogs = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await blogService.getBlogs({
        search: search.trim() || undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        page,
        limit: 25,
      });
      if (res?.data?.blogs) {
        setBlogs(res.data.blogs);
        setTotal(res.data.total || 0);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load blogs');
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, page]);

  useEffect(() => {
    loadBlogs();
  }, [loadBlogs]);

  // Trigger on-demand AI blog generation
  async function handleGenerateAiBlog() {
    setGenerating(true);
    const toastId = toast.loading('Generating AI blog with OpenAI & DALL-E (takes ~15-20s)...');
    try {
      const res: any = await blogService.generateAiBlog();
      if (res?.success) {
        toast.success(`🎉 Published: "${res.data?.title}"`, { id: toastId });
        loadBlogs();
      } else {
        toast.error(res?.message || 'Failed to generate blog', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || 'Error running AI generation', { id: toastId });
    } finally {
      setGenerating(false);
    }
  }

  // Toggle publish status
  async function handleTogglePublish(blog: BlogItem) {
    try {
      const updated = await blogService.updateBlog(blog._id, { is_published: !blog.is_published });
      setBlogs((prev) =>
        prev.map((b) => (b._id === blog._id ? { ...b, is_published: !b.is_published } : b))
      );
      toast.success(blog.is_published ? 'Article unpublished (draft)' : 'Article published live');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  }

  // Delete blog
  async function handleDelete(id: string) {
    if (!window.confirm('Are you sure you want to delete this article?')) return;
    try {
      await blogService.deleteBlog(id);
      setBlogs((prev) => prev.filter((b) => b._id !== id));
      setTotal((t) => Math.max(0, t - 1));
      toast.success('Article deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  }

  // Save blog (Create or Update)
  async function handleSaveBlog(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBlog?.title || !currentBlog?.content) {
      toast.error('Title and content are required');
      return;
    }
    setSaving(true);
    try {
      if (currentBlog._id) {
        await blogService.updateBlog(currentBlog._id, currentBlog);
        toast.success('Article updated successfully');
      } else {
        await blogService.createBlog(currentBlog);
        toast.success('Article created successfully');
      }
      setEditModalOpen(false);
      setCurrentBlog(null);
      loadBlogs();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save blog');
    } finally {
      setSaving(false);
    }
  }

  const publishedCount = blogs.filter((b) => b.is_published).length;
  const totalViews = blogs.reduce((sum, b) => sum + (b.views || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="h-8 w-8 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-yellow-400" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Automated Blogs & SEO</h1>
            <span className="text-xs bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-2 py-0.5 rounded-full font-bold">
              {total} Posts
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Automated content generation pipeline powered by OpenAI (GPT-4o & DALL-E)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={loadBlogs}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800/80 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCurrentBlog({
                title: '',
                category: 'Kitchen Tips',
                excerpt: '',
                content: '',
                image_url: '',
                tags: ['Waves and Wires', 'Kitchen Appliances'],
                is_published: true,
              });
              setEditModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Article</span>
          </button>

          <button
            type="button"
            onClick={handleGenerateAiBlog}
            disabled={generating}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-black text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-yellow-500/20 active:scale-98 transition-all disabled:opacity-60 cursor-pointer"
          >
            <Sparkles className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'Writing Article...' : 'Generate AI Blog Now'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/80 p-5">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-2">
            <span>Total Articles</span>
            <BookOpen className="h-4 w-4 text-zinc-500" />
          </div>
          <p className="text-2xl font-black text-white">{total}</p>
          <p className="text-[11px] text-zinc-500 mt-1">Generated and drafted posts</p>
        </div>

        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/80 p-5">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-2">
            <span>Published Live</span>
            <Globe className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{publishedCount}</p>
          <p className="text-[11px] text-zinc-500 mt-1">Live on wavesandwires.in/blog</p>
        </div>

        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800/80 p-5">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium mb-2">
            <span>Total Views</span>
            <Eye className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400">{totalViews.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-zinc-500 mt-1">Organic reader impressions</p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-transparent border border-yellow-500/20 p-5">
          <div className="flex items-center justify-between text-yellow-400 text-xs font-medium mb-2">
            <span>Automated Schedule</span>
            <Sparkles className="h-4 w-4 text-yellow-400" />
          </div>
          <p className="text-sm font-black text-white flex items-center gap-1.5 mt-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            10:30 AM & 10:30 PM IST
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">Runs 2x daily in background</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-900/60 border border-zinc-800/80 p-3.5 rounded-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by title, tag, or topic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-yellow-400/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-yellow-400/50 cursor-pointer"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Blog Articles Table */}
      <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center">
            <div className="h-8 w-8 rounded-full border-2 border-yellow-400/20 border-t-yellow-400 animate-spin mx-auto mb-3" />
            <p className="text-xs text-zinc-400">Loading articles...</p>
          </div>
        ) : blogs.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <BookOpen className="h-10 w-10 text-zinc-600 mx-auto" />
            <p className="text-sm font-bold text-white">No articles generated yet</p>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Click "Generate AI Blog Now" above to create your first automated SEO blog post!
            </p>
            <button
              onClick={handleGenerateAiBlog}
              disabled={generating}
              className="mt-2 px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-black inline-flex items-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" /> Generate First Blog
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/60 text-zinc-400 uppercase text-[10px] tracking-wider font-bold border-b border-zinc-800">
                <tr>
                  <th className="py-3.5 px-4">Article</th>
                  <th className="py-3.5 px-3">Category</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3">Views</th>
                  <th className="py-3.5 px-3">Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {blogs.map((b) => (
                  <tr key={b._id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-16 rounded-xl bg-zinc-800 overflow-hidden shrink-0 border border-zinc-700/60">
                          {b.image_url ? (
                            <img src={b.image_url} alt={b.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-zinc-500 text-[10px] font-bold">W&W</div>
                          )}
                        </div>
                        <div className="min-w-0 max-w-md">
                          <p className="font-bold text-white text-xs sm:text-sm truncate hover:text-yellow-400 transition-colors">
                            {b.title}
                          </p>
                          <p className="text-[11px] text-zinc-400 truncate mt-0.5">{b.excerpt || b.slug}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-zinc-500 font-mono">/blog/{b.slug}</span>
                            <span className="text-zinc-600">•</span>
                            <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" /> {b.reading_time || 3} min
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${CATEGORY_COLORS[b.category] || 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>
                        {b.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(b)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full cursor-pointer transition-all ${
                          b.is_published
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
                        }`}
                      >
                        {b.is_published ? '● Published' : '○ Draft'}
                      </button>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="font-mono text-zinc-300 font-bold">{b.views || 0}</span>
                    </td>

                    <td className="py-3.5 px-3 text-zinc-400 text-[11px] whitespace-nowrap">
                      {new Date(b.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`https://wavesandwires.in/blog/${b.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                          title="View on Live Store"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            setCurrentBlog(b);
                            setEditModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                          title="Edit Article"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(b._id)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                          title="Delete Article"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit / Create Article Modal */}
      {editModalOpen && currentBlog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-8">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-base font-black text-white">
                {currentBlog._id ? 'Edit Article' : 'Write New Article'}
              </h3>
              <button
                type="button"
                onClick={() => { setEditModalOpen(false); setCurrentBlog(null); }}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBlog} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={currentBlog.title || ''}
                  onChange={(e) => setCurrentBlog({ ...currentBlog, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:outline-none focus:border-yellow-400/50"
                  placeholder="e.g. Why Every Indian Kitchen Needs an Electric Coconut Scraper"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Category</label>
                  <select
                    value={currentBlog.category || 'Kitchen Tips'}
                    onChange={(e) => setCurrentBlog({ ...currentBlog, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-yellow-400/50 cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">Cover Image URL</label>
                  <input
                    type="text"
                    value={currentBlog.image_url || ''}
                    onChange={(e) => setCurrentBlog({ ...currentBlog, image_url: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-yellow-400/50"
                    placeholder="https://... or /uploads/blogs/..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Excerpt (SEO Description)</label>
                <textarea
                  rows={2}
                  value={currentBlog.excerpt || ''}
                  onChange={(e) => setCurrentBlog({ ...currentBlog, excerpt: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-yellow-400/50"
                  placeholder="Short summary displayed on cards and Google search..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Content (HTML or Markdown) *</label>
                <textarea
                  rows={10}
                  required
                  value={currentBlog.content || ''}
                  onChange={(e) => setCurrentBlog({ ...currentBlog, content: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:border-yellow-400/50 leading-relaxed"
                  placeholder="Article body in HTML..."
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-300">
                  <input
                    type="checkbox"
                    checked={Boolean(currentBlog.is_published)}
                    onChange={(e) => setCurrentBlog({ ...currentBlog, is_published: e.target.checked })}
                    className="rounded border-zinc-700 bg-zinc-950 text-yellow-400 focus:ring-0"
                  />
                  <span>Publish immediately to store</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => { setEditModalOpen(false); setCurrentBlog(null); }}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-black uppercase tracking-wider disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
