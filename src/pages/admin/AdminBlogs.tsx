import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Sparkles, Plus, Search, RefreshCw, Eye, Edit2, Trash2,
  ExternalLink, Calendar, Check, X, Clock, Tag, Globe, CheckCircle2,
  AlertCircle, FileText
} from 'lucide-react';
import { blogService, BlogItem } from '@/services/blog.service';
import { toast } from 'sonner';
import { format } from 'date-fns';

const CATEGORIES = [
  'Kitchen Tips',
  'Buying Guide',
  'Recipes',
  'Product Spotlight',
  'Health & Wellness',
  'Maintenance',
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Kitchen Tips':       { bg: 'bg-amber-50',   text: 'text-amber-800',   border: 'border-amber-200' },
  'Buying Guide':       { bg: 'bg-blue-50',    text: 'text-blue-800',    border: 'border-blue-200' },
  'Recipes':            { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  'Product Spotlight':  { bg: 'bg-purple-50',  text: 'text-purple-800',  border: 'border-purple-200' },
  'Health & Wellness':  { bg: 'bg-rose-50',    text: 'text-rose-800',    border: 'border-rose-200' },
  'Maintenance':        { bg: 'bg-orange-50',  text: 'text-orange-800',  border: 'border-orange-200' },
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
        limit: 30,
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
    const toastId = toast.loading('Generating AI blog with GPT-4o & brand compliance (takes ~15-25s)...');
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
      await blogService.updateBlog(blog._id, { is_published: !blog.is_published });
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
      setTotal((prev) => Math.max(0, prev - 1));
      toast.success('Article deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete blog');
    }
  }

  // Save edit / create
  async function handleSaveBlog(e: React.FormEvent) {
    e.preventDefault();
    if (!currentBlog) return;
    setSaving(true);
    try {
      if (currentBlog._id) {
        // Update
        const res: any = await blogService.updateBlog(currentBlog._id, currentBlog);
        if (res?.success) {
          toast.success('Article updated successfully');
          setEditModalOpen(false);
          loadBlogs();
        }
      } else {
        // Create
        const res: any = await blogService.createBlog(currentBlog);
        if (res?.success) {
          toast.success('Article created successfully');
          setEditModalOpen(false);
          loadBlogs();
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save blog');
    } finally {
      setSaving(false);
    }
  }

  const publishedCount = blogs.filter((b) => b.is_published).length;
  const draftCount = blogs.filter((b) => !b.is_published).length;
  const totalViews = blogs.reduce((sum, b) => sum + (b.views || 0), 0);

  return (
    <div className="p-5 sm:p-6 space-y-6">
      
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2.5">
            <span>Automated Blogs &amp; SEO</span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
              {total} Posts
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            AI content generation pipeline powered by OpenAI (GPT-4o) • Scheduled 2x Daily
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={loadBlogs}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
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
            className="px-3.5 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Article</span>
          </button>

          <button
            type="button"
            onClick={handleGenerateAiBlog}
            disabled={generating}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-60"
          >
            <Sparkles className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'Generating AI Blog...' : '⚡ Generate AI Blog Now'}</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Articles</span>
            <BookOpen className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-zinc-900">{total}</p>
          <p className="text-[10px] text-zinc-400 font-medium">All generated &amp; written posts</p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Published Live</span>
            <Globe className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-900">{publishedCount}</p>
          <p className="text-[10px] text-emerald-700/80 font-medium">Live on wavesandwires.in/blog</p>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Drafts</span>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900">{draftCount}</p>
          <p className="text-[10px] text-amber-700/80 font-medium">Pending or unpublished</p>
        </div>

        <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Reads</span>
            <Eye className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-900">{totalViews.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-blue-700/80 font-medium">Organic reader impressions</p>
        </div>

        <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-purple-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Auto Schedule</span>
            <Sparkles className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-sm font-black text-purple-900 flex items-center gap-1.5 mt-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            10:30 AM &amp; 10:30 PM
          </p>
          <p className="text-[10px] text-purple-700/80 font-medium">Runs 2x daily (IST)</p>
        </div>
      </div>

      {/* ── Search & Filter Bar ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 space-y-3.5 shadow-2xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by title, category, or tag..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all text-zinc-800"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-semibold bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-zinc-700 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Blogs Table ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[850px]">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/75 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3.5">Article</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-center">Views</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-zinc-100 rounded-md" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : blogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400 mb-3">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <p className="font-bold text-zinc-800 text-sm">No articles found</p>
                    <p className="text-xs text-zinc-400 mt-0.5">Click "Generate AI Blog Now" to publish your next post.</p>
                  </td>
                </tr>
              ) : (
                blogs.map((b) => {
                  const catStyle = CATEGORY_COLORS[b.category] || { bg: 'bg-zinc-100', text: 'text-zinc-800', border: 'border-zinc-200' };
                  const formattedDate = b.created_at ? format(new Date(b.created_at), 'd MMM yyyy') : '—';

                  return (
                    <tr key={b._id} className="hover:bg-zinc-50/70 transition-colors">
                      {/* Thumbnail & Title */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-16 rounded-xl bg-zinc-100 overflow-hidden shrink-0 border border-zinc-200 shadow-2xs">
                            {b.image_url ? (
                              <img src={b.image_url} alt={b.title} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-zinc-400 text-[10px] font-bold">W&amp;W</div>
                            )}
                          </div>
                          <div className="min-w-0 max-w-md">
                            <p className="font-bold text-zinc-900 text-xs sm:text-sm truncate hover:text-amber-600 transition-colors">
                              {b.title}
                            </p>
                            {b.excerpt && (
                              <p className="text-[11px] text-zinc-500 truncate mt-0.5">{b.excerpt}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-zinc-400 font-mono">/blog/{b.slug}</span>
                              <span className="text-zinc-300">•</span>
                              <span className="text-[10px] text-zinc-400">{b.reading_time || 3} min</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                          {b.category}
                        </span>
                      </td>

                      {/* Status Toggle */}
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleTogglePublish(b)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                            b.is_published
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${b.is_published ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                          <span>{b.is_published ? 'Published' : 'Draft'}</span>
                        </button>
                      </td>

                      {/* Views */}
                      <td className="px-4 py-3.5 text-center font-bold text-xs text-zinc-700">
                        {(b.views || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 text-xs text-zinc-500">
                        {formattedDate}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`https://wavesandwires.in/blog/${b.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-amber-600 hover:bg-zinc-100 transition-colors"
                            title="View Live Article"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentBlog(b);
                              setEditModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                            title="Edit Article"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(b._id)}
                            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-red-600 hover:bg-zinc-100 transition-colors cursor-pointer"
                            title="Delete Article"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Edit / Create Blog Modal ────────────────────────────────────────── */}
      {editModalOpen && currentBlog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-zinc-200 w-full max-w-2xl p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h2 className="text-base font-black text-zinc-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-500" />
                <span>{currentBlog._id ? 'Edit Article' : 'Create New Article'}</span>
              </h2>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBlog} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Article Title *</label>
                <input
                  type="text"
                  required
                  value={currentBlog.title || ''}
                  onChange={(e) => setCurrentBlog({ ...currentBlog, title: e.target.value })}
                  placeholder="e.g. Essential Maintenance Guide for Waves & Wires Electric Coconut Scraper"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Category</label>
                  <select
                    value={currentBlog.category || 'Kitchen Tips'}
                    onChange={(e) => setCurrentBlog({ ...currentBlog, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 outline-none font-semibold cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Author</label>
                  <input
                    type="text"
                    value={currentBlog.author || 'Waves & Wires Editorial'}
                    onChange={(e) => setCurrentBlog({ ...currentBlog, author: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Meta Excerpt / Short Summary</label>
                <textarea
                  rows={2}
                  value={currentBlog.excerpt || ''}
                  onChange={(e) => setCurrentBlog({ ...currentBlog, excerpt: e.target.value })}
                  placeholder="Compelling 1-2 sentence preview for search results..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Image URL</label>
                <input
                  type="text"
                  value={currentBlog.image_url || ''}
                  onChange={(e) => setCurrentBlog({ ...currentBlog, image_url: e.target.value })}
                  placeholder="/uploads/blogs/image.png or https://..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 outline-none font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Content (Markdown or HTML) *</label>
                <textarea
                  rows={8}
                  required
                  value={currentBlog.markdown || currentBlog.content || ''}
                  onChange={(e) =>
                    setCurrentBlog({
                      ...currentBlog,
                      markdown: e.target.value,
                      content: e.target.value,
                    })
                  }
                  placeholder="## Heading\n\nArticle body..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-800 outline-none font-mono text-[11px] leading-relaxed resize-y"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={currentBlog.is_published ?? true}
                  onChange={(e) => setCurrentBlog({ ...currentBlog, is_published: e.target.checked })}
                  className="h-4 w-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                />
                <label htmlFor="is_published" className="font-bold text-zinc-800 cursor-pointer">
                  Publish live immediately on wavesandwires.in/blog
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-bold transition-all shadow-sm cursor-pointer disabled:opacity-60"
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
