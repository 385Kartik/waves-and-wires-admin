import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, FolderOpen, ImageOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  is_active: boolean;
  sort_order: number;
  product_count?: number;
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const EMPTY = { name: '', slug: '', description: '', image: '', is_active: true, sort_order: 0 };

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    // Get product counts
    const ids = (data ?? []).map((c: any) => c.id);
    let countMap: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: counts } = await supabase
        .from('products')
        .select('category_id')
        .in('category_id', ids)
        .eq('is_active', true);
      (counts ?? []).forEach((p: any) => {
        countMap[p.category_id] = (countMap[p.category_id] ?? 0) + 1;
      });
    }

    setCategories((data ?? []).map((c: any) => ({ ...c, product_count: countMap[c.id] ?? 0 })));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  }

  function openEdit(c: Category) {
    setEditing(c);
    setForm({
      name: c.name, slug: c.slug,
      description: c.description ?? '',
      image: c.image ?? '',
      is_active: c.is_active,
      sort_order: c.sort_order,
    });
    setShowForm(true);
  }

  async function save() {
    if (!form.name.trim()) { toast.error('Category name is required'); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      description: form.description.trim() || null,
      image: form.image.trim() || null,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };
    const { error } = editing
      ? await supabase.from('categories').update(payload).eq('id', editing.id)
      : await supabase.from('categories').insert(payload);
    if (error) toast.error(error.message);
    else { toast.success(editing ? 'Category updated' : 'Category created'); setShowForm(false); load(); }
    setSaving(false);
  }

  async function toggleActive(id: string, cur: boolean) {
    await supabase.from('categories').update({ is_active: !cur }).eq('id', id);
    setCategories(prev => prev.map(c => c.id === id ? { ...c, is_active: !cur } : c));
  }

  async function confirmDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from('categories').delete().eq('id', deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success('Category deleted');
    setDeleteId(null);
    load();
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Categories</h1>
          <p className="text-sm text-zinc-500">{categories.length} total</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-orange-200">
          <Plus className="h-4 w-4" />Add Category
        </button>
      </div>

      {/* Category grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-36 rounded-2xl bg-zinc-200 animate-pulse" />)}
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200/80 py-16 flex flex-col items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-zinc-100 flex items-center justify-center">
            <FolderOpen className="h-7 w-7 text-zinc-300" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-zinc-800">No categories yet</p>
            <p className="text-sm text-zinc-400 mt-1">Create your first category to organise products</p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
            <Plus className="h-4 w-4" />Create Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(c => (
            <div key={c.id} className="group bg-white rounded-2xl border border-zinc-200/80 overflow-hidden hover:shadow-md hover:border-zinc-300 transition-all duration-200">
              {/* Image */}
              <div className="relative h-36 bg-zinc-50 overflow-hidden">
                {c.image ? (
                  <img src={c.image} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageOff className="h-8 w-8 text-zinc-200" />
                  </div>
                )}
                {/* Active toggle overlay */}
                <div className="absolute top-3 right-3">
                  <button onClick={() => toggleActive(c.id, c.is_active)}
                    className={`relative inline-flex h-5 w-9 rounded-full transition-colors shadow-sm ${c.is_active ? 'bg-emerald-500' : 'bg-zinc-400'}`}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${c.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-zinc-900 truncate">{c.name}</h3>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5">/{c.slug}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(c)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleteId(c.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {c.description && (
                  <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{c.description}</p>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-50">
                  <span className="text-xs font-semibold text-zinc-500">
                    {c.product_count} product{c.product_count !== 1 ? 's' : ''}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-500'}`}>
                    {c.is_active ? 'Active' : 'Hidden'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Drawer */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-zinc-900">{editing ? 'Edit Category' : 'Add Category'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-500"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex-1 p-6 space-y-4">
              {/* Image preview */}
              {form.image && (
                <div className="h-40 rounded-2xl overflow-hidden bg-zinc-50 border border-zinc-200">
                  <img src={form.image} alt="Preview" className="w-full h-full object-cover"
                    onError={e => (e.currentTarget.style.display = 'none')} />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Category Name *</label>
                <input value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value, ...(!editing ? { slug: slugify(e.target.value) } : {}) }))}
                  placeholder="e.g. Kitchen Appliances"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all" />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Slug</label>
                <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="kitchen-appliances"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all" />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Description</label>
                <textarea rows={3} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of this category…"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all resize-none" />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Image URL</label>
                <input value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
                  placeholder="https://images.unsplash.com/…"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all" />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Sort Order</label>
                <input type="number" value={form.sort_order}
                  onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all" />
                <p className="text-xs text-zinc-400 mt-1">Lower number = appears first in store</p>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <button type="button" onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${form.is_active ? 'bg-emerald-500' : 'bg-zinc-300'}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm text-zinc-700 font-medium">Active (visible in store)</span>
              </label>
            </div>

            <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex gap-3 sticky bottom-0">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 text-sm font-semibold text-zinc-600 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-xl transition-colors shadow-sm shadow-orange-200">
                {saving ? 'Saving…' : editing ? 'Update' : 'Create Category'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-zinc-900 mb-2">Delete Category?</h3>
            <p className="text-sm text-zinc-500 mb-5">Products in this category will become uncategorised. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 text-sm font-semibold border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
              <button onClick={confirmDelete}
                className="flex-1 py-2.5 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
