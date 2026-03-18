import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, ChevronLeft, ChevronRight, X, ImageOff, Upload, Link2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Product {
  id:string; name:string; slug:string; description:string; short_description:string;
  price:number; compare_at_price:number|null; images:string[];
  category_id:string|null; category_name?:string; stock:number; sku:string;
  is_featured:boolean; is_active:boolean;
}
interface Category { id:string; name:string; }

const INR=(n:number)=>`₹${n.toLocaleString('en-IN')}`;
const slugify=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const PAGE=20;
const EMPTY={name:'',slug:'',description:'',short_description:'',price:'',compare_at_price:'',
  imageUrls:'',category_id:'',stock:'0',sku:'',is_featured:false,is_active:true};

export default function AdminProducts() {
  const [products,setProducts]=useState<Product[]>([]);
  const [categories,setCategories]=useState<Category[]>([]);
  const [total,setTotal]=useState(0);
  const [page,setPage]=useState(0);
  const [search,setSearch]=useState('');
  const [showForm,setShowForm]=useState(false);
  const [editing,setEditing]=useState<Product|null>(null);
  const [form,setForm]=useState(EMPTY);
  const [saving,setSaving]=useState(false);
  const [loading,setLoading]=useState(true);
  const [deleteId,setDeleteId]=useState<string|null>(null);
  // Image upload state
  const [uploadingImgs,setUploadingImgs]=useState(false);
  const [imgTab,setImgTab]=useState<'url'|'upload'>('url');

  const load=useCallback(async()=>{
    setLoading(true);
    let q=supabase.from('products').select('*,categories(name)',{count:'exact'})
      .order('created_at',{ascending:false}).range(page*PAGE,(page+1)*PAGE-1);
    if(search.trim())q=q.ilike('name',`%${search.trim()}%`);
    const {data,count}=await q;
    setProducts((data??[]).map((p:any)=>({...p,category_name:p.categories?.name??'—'})));
    setTotal(count??0);setLoading(false);
  },[page,search]);

  useEffect(()=>{load();},[load]);
  useEffect(()=>{supabase.from('categories').select('id,name').order('name').then(({data})=>setCategories(data??[]));},[]);

  function openCreate(){setEditing(null);setForm(EMPTY);setImgTab('url');setShowForm(true);}
  function openEdit(p:Product){
    setEditing(p);
    setForm({name:p.name,slug:p.slug,description:p.description??'',short_description:p.short_description??'',
      price:String(p.price),compare_at_price:p.compare_at_price?String(p.compare_at_price):'',
      imageUrls:(p.images??[]).join('\n'),category_id:p.category_id??'',
      stock:String(p.stock),sku:p.sku??'',is_featured:p.is_featured,is_active:p.is_active});
    setImgTab('url');setShowForm(true);
  }

  // Upload images to Supabase Storage
  async function handleImageUpload(files: FileList) {
    setUploadingImgs(true);
    const uploaded:string[]=[];
    for(const file of Array.from(files)){
      if(!file.type.startsWith('image/')){toast.error(`${file.name} is not an image`);continue;}
      if(file.size>5*1024*1024){toast.error(`${file.name} exceeds 5MB limit`);continue;}
      const ext=file.name.split('.').pop();
      const path=`products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const {data,error}=await supabase.storage.from('product-images').upload(path,file,{contentType:file.type});
      if(error){toast.error(`Upload failed: ${file.name}`);continue;}
      const {data:{publicUrl}}=supabase.storage.from('product-images').getPublicUrl(path);
      uploaded.push(publicUrl);
    }
    if(uploaded.length){
      const existing=form.imageUrls.trim();
      setForm(f=>({...f,imageUrls:(existing?existing+'\n':'')+uploaded.join('\n')}));
      toast.success(`${uploaded.length} image${uploaded.length>1?'s':''} uploaded`);
    }
    setUploadingImgs(false);
  }

  async function save(){
    if(!form.name||!form.price){toast.error('Name and price required');return;}
    setSaving(true);
    const images=form.imageUrls.split('\n').map(s=>s.trim()).filter(Boolean);
    const payload={
      name:form.name.trim(),slug:form.slug.trim()||slugify(form.name),
      description:form.description.trim(),short_description:form.short_description.trim(),
      price:parseFloat(form.price),
      compare_at_price:form.compare_at_price?parseFloat(form.compare_at_price):null,
      images,category_id:form.category_id||null,
      stock:parseInt(form.stock)||0,sku:form.sku.trim(),
      is_featured:form.is_featured,is_active:form.is_active,
    };
    const {error}=editing
      ?await supabase.from('products').update(payload).eq('id',editing.id)
      :await supabase.from('products').insert(payload);
    if(error)toast.error(error.message);
    else{toast.success(editing?'Product updated':'Product created');setShowForm(false);load();}
    setSaving(false);
  }

  async function toggleActive(id:string,cur:boolean){
    await supabase.from('products').update({is_active:!cur}).eq('id',id);
    setProducts(prev=>prev.map(p=>p.id===id?{...p,is_active:!cur}:p));
  }
  async function confirmDelete(){
    if(!deleteId)return;
    const {error}=await supabase.from('products').delete().eq('id',deleteId);
    if(error){toast.error(error.message);return;}
    toast.success('Deleted');setDeleteId(null);load();
  }

  const pages=Math.ceil(total/PAGE);
  const formImages=form.imageUrls.split('\n').map(s=>s.trim()).filter(Boolean);

  return(
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-zinc-900">Products</h1><p className="text-sm text-zinc-500">{total} total</p></div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
          <Plus className="h-4 w-4"/>Add Product
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200/80 p-4">
        <div className="relative"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"/>
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}} placeholder="Search products…"
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all"/>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-zinc-100 bg-zinc-50/50">
              {['Product','Category','Price','Stock','Status','Active',''].map(h=>(
                <th key={h} className={`px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider ${h==='Price'||h==='Stock'||h===''?'text-right':'text-left'}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-zinc-50">
              {loading?[...Array(5)].map((_,i)=><tr key={i}>{[...Array(7)].map((_,j)=><td key={j} className="px-4 py-4"><div className="h-4 rounded-lg bg-zinc-100 animate-pulse"/></td>)}</tr>)
              :products.map(p=>(
                <tr key={p.id} className="hover:bg-zinc-50/70 transition-colors group">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      {p.images?.[0]
                        ?<img src={p.images[0]} alt={p.name} className="h-10 w-10 rounded-xl object-cover border border-zinc-100"/>
                        :<div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center"><ImageOff className="h-4 w-4 text-zinc-300"/></div>}
                      <div>
                        <p className="font-semibold text-zinc-800 text-xs max-w-[200px] truncate">{p.name}</p>
                        <p className="text-[10px] text-zinc-400 font-mono">{p.sku||'—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-zinc-500">{p.category_name}</td>
                  <td className="px-4 py-3.5 text-right">
                    <p className="font-bold text-zinc-800 text-xs">{INR(p.price)}</p>
                    {p.compare_at_price&&<p className="text-[10px] text-zinc-400 line-through">{INR(p.compare_at_price)}</p>}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className={`font-bold text-xs ${p.stock===0?'text-red-500':p.stock<=5?'text-amber-500':'text-zinc-700'}`}>{p.stock}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    {p.stock===0?<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">Out of stock</span>
                    :p.stock<=5?<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">Low stock</span>
                    :<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">In stock</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <button onClick={()=>toggleActive(p.id,p.is_active)}
                      className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${p.is_active?'bg-emerald-500':'bg-zinc-300'}`}>
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${p.is_active?'translate-x-4':'translate-x-0.5'}`}/>
                    </button>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={()=>openEdit(p)} className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-all"><Edit2 className="h-3.5 w-3.5"/></button>
                      <button onClick={()=>setDeleteId(p.id)} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 className="h-3.5 w-3.5"/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading&&products.length===0&&<tr><td colSpan={7} className="px-4 py-12 text-center text-zinc-400 text-sm">No products found</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 bg-zinc-50/30">
          <p className="text-xs text-zinc-500">Showing {Math.min(page*PAGE+1,total)}–{Math.min((page+1)*PAGE,total)} of {total}</p>
          <div className="flex gap-1">
            <button disabled={page===0} onClick={()=>setPage(p=>p-1)} className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-100 disabled:opacity-40 transition-all"><ChevronLeft className="h-4 w-4"/></button>
            <button disabled={page>=pages-1} onClick={()=>setPage(p=>p+1)} className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-100 disabled:opacity-40 transition-all"><ChevronRight className="h-4 w-4"/></button>
          </div>
        </div>
      </div>

      {/* Form drawer */}
      {showForm&&(
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={()=>setShowForm(false)}/>
          <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-zinc-900">{editing?'Edit Product':'Add New Product'}</h2>
              <button onClick={()=>setShowForm(false)} className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-500"><X className="h-4 w-4"/></button>
            </div>
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">

              {/* Basic fields */}
              {[{label:'Product Name *',key:'name',ph:'Electric Coconut Scraper'},{label:'Slug',key:'slug',ph:'auto-generated'},{label:'SKU',key:'sku',ph:'WW-001'}].map(({label,key,ph})=>(
                <div key={key}>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">{label}</label>
                  <input value={(form as any)[key]}
                    onChange={e=>setForm(f=>({...f,[key]:e.target.value,...(key==='name'&&!editing?{slug:slugify(e.target.value)}:{})}))}
                    placeholder={ph}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all"/>
                </div>
              ))}

              <div className="grid grid-cols-2 gap-4">
                {[['Price (₹) *','price','1999'],['Compare-at (₹)','compare_at_price','2999']].map(([label,key,ph])=>(
                  <div key={key}>
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">{label}</label>
                    <input type="number" value={(form as any)[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} placeholder={ph}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all"/>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Category</label>
                  <select value={form.category_id} onChange={e=>setForm(f=>({...f,category_id:e.target.value}))}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400 transition-all">
                    <option value="">None</option>
                    {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Stock</label>
                  <input type="number" value={form.stock} onChange={e=>setForm(f=>({...f,stock:e.target.value}))} min={0}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400 transition-all"/>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Short Description</label>
                <input value={form.short_description} onChange={e=>setForm(f=>({...f,short_description:e.target.value}))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400 transition-all"/>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Description</label>
                <textarea rows={3} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400 transition-all resize-none"/>
              </div>

              {/* ── Images section ──────────────────────────── */}
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 block">Product Images</label>

                {/* Tabs */}
                <div className="flex gap-1.5 mb-3">
                  <button type="button" onClick={()=>setImgTab('url')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${imgTab==='url'?'bg-zinc-900 text-white':'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
                    <Link2 className="h-3 w-3"/>URL Links
                  </button>
                  <button type="button" onClick={()=>setImgTab('upload')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${imgTab==='upload'?'bg-zinc-900 text-white':'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
                    <Upload className="h-3 w-3"/>Upload Files
                  </button>
                </div>

                {imgTab==='url' ? (
                  <div>
                    <textarea rows={3} value={form.imageUrls} onChange={e=>setForm(f=>({...f,imageUrls:e.target.value}))}
                      placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-xs font-mono outline-none focus:border-yellow-400 transition-all resize-none"/>
                    <p className="text-[10px] text-zinc-400 mt-1">One URL per line. Supports Unsplash, Cloudinary, etc.</p>
                  </div>
                ) : (
                  <div>
                    <label className={`flex flex-col items-center justify-center gap-2.5 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${uploadingImgs?'border-yellow-300 bg-yellow-50':'border-zinc-300 hover:border-yellow-400 hover:bg-yellow-50/30'}`}>
                      <input type="file" multiple accept="image/*" className="hidden"
                        onChange={e=>e.target.files&&handleImageUpload(e.target.files)}
                        disabled={uploadingImgs}/>
                      {uploadingImgs ? (
                        <><span className="h-6 w-6 rounded-full border-2 border-yellow-400/30 border-t-yellow-400 animate-spin"/>
                          <p className="text-xs font-semibold text-zinc-600">Uploading…</p></>
                      ) : (
                        <><Upload className="h-6 w-6 text-zinc-400"/>
                          <p className="text-xs font-semibold text-zinc-600">Click to upload images</p>
                          <p className="text-[10px] text-zinc-400">PNG, JPG, WEBP · Max 5MB each</p></>
                      )}
                    </label>
                    <p className="text-[10px] text-zinc-400 mt-1.5">
                      Images are stored in <strong>Supabase Storage</strong> — not in the database. No DB size impact!
                      Create a bucket called <code className="bg-zinc-100 px-1 rounded">product-images</code> (Public) in Supabase.
                    </p>
                  </div>
                )}

                {/* Preview current images */}
                {formImages.length > 0 && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {formImages.map((url,i)=>(
                      <div key={i} className="relative group">
                        <img src={url} alt={`img-${i}`} className="h-14 w-14 rounded-xl object-cover border border-zinc-200"/>
                        <button type="button"
                          onClick={()=>{const imgs=form.imageUrls.split('\n').filter((_,idx)=>idx!==i);setForm(f=>({...f,imageUrls:imgs.join('\n');}));}}
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-5">
                {([['is_featured','Featured'],['is_active','Active']] as const).map(([key,label])=>(
                  <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                    <button type="button" onClick={()=>setForm(f=>({...f,[key]:!f[key]}))}
                      className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${form[key]?'bg-yellow-400':'bg-zinc-300'}`}>
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form[key]?'translate-x-4':'translate-x-0.5'}`}/>
                    </button>
                    <span className="text-sm text-zinc-700 font-medium">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex gap-3 sticky bottom-0">
              <button onClick={()=>setShowForm(false)} className="flex-1 py-2.5 text-sm font-semibold text-zinc-600 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-700 disabled:opacity-50 rounded-xl transition-colors">
                {saving?'Saving…':editing?'Update Product':'Create Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-zinc-900 mb-2">Delete Product?</h3>
            <p className="text-sm text-zinc-500 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={()=>setDeleteId(null)} className="flex-1 py-2.5 text-sm font-semibold border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-2.5 text-sm font-semibold bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
