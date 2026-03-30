import { useEffect, useState } from 'react';
import { Plus, Tag, Edit2, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Coupon { id:string; code:string; description:string|null; discount_type:'percentage'|'fixed'; discount_value:number; min_order_value:number; max_discount:number|null; usage_limit:number|null; used_count:number; is_active:boolean; expires_at:string|null; created_at:string; }
const INR=(n:number)=>`₹${n.toLocaleString('en-IN')}`;
const EMPTY={code:'',description:'',discount_type:'percentage' as const,discount_value:10,min_order_value:0,max_discount:'',usage_limit:'',is_active:true,expires_at:''};

export default function AdminCoupons() {
  const [coupons,setCoupons]=useState<Coupon[]>([]);
  const [loading,setLoading]=useState(true);
  const [showForm,setShowForm]=useState(false);
  const [editing,setEditing]=useState<Coupon|null>(null);
  const [form,setForm]=useState(EMPTY);
  const [saving,setSaving]=useState(false);
  const [deleteId,setDeleteId]=useState<string|null>(null);

  async function load(){
    setLoading(true);
    const {data}=await supabase.from('coupons').select('*').order('created_at',{ascending:false});
    setCoupons(data??[]);setLoading(false);
  }
  useEffect(()=>{load();},[]);

  function openCreate(){setEditing(null);setForm(EMPTY);setShowForm(true);}
  function openEdit(c:Coupon){
    setEditing(c);
    setForm({code:c.code,description:c.description??'',discount_type:c.discount_type,discount_value:c.discount_value,min_order_value:c.min_order_value,max_discount:c.max_discount?String(c.max_discount):'',usage_limit:c.usage_limit?String(c.usage_limit):'',is_active:c.is_active,expires_at:c.expires_at?c.expires_at.slice(0,10):''});
    setShowForm(true);
  }

  async function save(){
    if(!form.code.trim()){toast.error('Code is required');return;}
    setSaving(true);
    const payload={code:form.code.toUpperCase().trim(),description:form.description||null,discount_type:form.discount_type,discount_value:Number(form.discount_value),min_order_value:Number(form.min_order_value)||0,max_discount:form.max_discount?Number(form.max_discount):null,usage_limit:form.usage_limit?Number(form.usage_limit):null,is_active:form.is_active,expires_at:form.expires_at||null};
    const {error}=editing?await supabase.from('coupons').update(payload).eq('id',editing.id):await supabase.from('coupons').insert(payload);
    if(error)toast.error(error.message);
    else{toast.success(editing?'Updated':'Created');setShowForm(false);load();}
    setSaving(false);
  }

  async function toggleActive(id:string,cur:boolean){
    await supabase.from('coupons').update({is_active:!cur}).eq('id',id);
    setCoupons(prev=>prev.map(c=>c.id===id?{...c,is_active:!cur}:c));
  }

  async function confirmDelete(){
    if(!deleteId)return;
    const {error}=await supabase.from('coupons').delete().eq('id',deleteId);
    if(error){toast.error(error.message);return;}
    toast.success('Deleted');setDeleteId(null);load();
  }

  const isExpired=(c:Coupon)=>!!c.expires_at&&new Date(c.expires_at)<new Date();

  return(
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-zinc-900">Coupons</h1><p className="text-sm text-zinc-500">{coupons.length} total</p></div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-orange-200">
          <Plus className="h-4 w-4"/>Create Coupon
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden">
        {loading?(
          <div className="p-4 space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="h-16 rounded-xl bg-zinc-100 animate-pulse"/>)}</div>
        ):coupons.length===0?(
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-zinc-100 flex items-center justify-center"><Tag className="h-6 w-6 text-zinc-300"/></div>
            <p className="font-semibold text-zinc-700">No coupons yet</p>
            <button onClick={openCreate} className="text-sm font-semibold text-orange-500 hover:text-orange-600">Create your first coupon →</button>
          </div>
        ):(
          <div className="divide-y divide-zinc-50">
            {coupons.map(c=>(
              <div key={c.id} className={`flex items-center gap-4 px-4 py-4 hover:bg-zinc-50/70 transition-colors ${isExpired(c)?'opacity-50':''}`}>
                <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                  <Tag className="h-4.5 w-4.5 text-orange-500"/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-zinc-900 font-mono text-sm">{c.code}</span>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      {c.discount_type==='percentage'?`${c.discount_value}% off`:INR(c.discount_value)+' off'}
                    </span>
                    {isExpired(c)&&<span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Expired</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-400 flex-wrap">
                    {c.min_order_value>0&&<span>Min: {INR(c.min_order_value)}</span>}
                    {c.max_discount&&<span>Max: {INR(c.max_discount)}</span>}
                    <span>Used: {c.used_count}/{c.usage_limit??'∞'}</span>
                    {c.expires_at&&<span>Exp: {format(new Date(c.expires_at),'dd MMM yyyy')}</span>}
                    {c.description&&<span className="text-zinc-300">·</span>}
                    {c.description&&<span className="truncate max-w-[200px]">{c.description}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={()=>toggleActive(c.id,c.is_active)}
                    className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${c.is_active?'bg-emerald-500':'bg-zinc-300'}`}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${c.is_active?'translate-x-4':'translate-x-0.5'}`}/>
                  </button>
                  <button onClick={()=>openEdit(c)} className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-blue-50 transition-all"><Edit2 className="h-3.5 w-3.5"/></button>
                  <button onClick={()=>setDeleteId(c.id)} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 className="h-3.5 w-3.5"/></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm&&(
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={()=>setShowForm(false)}/>
          <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 sticky top-0 bg-white z-10">
              <h2 className="font-bold text-zinc-900">{editing?'Edit Coupon':'Create Coupon'}</h2>
              <button onClick={()=>setShowForm(false)} className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-500"><X className="h-4 w-4"/></button>
            </div>
            <div className="flex-1 p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Coupon Code *</label>
                <input value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="SAVE20"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-mono font-bold outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all uppercase"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Description</label>
                <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="e.g. 20% off for new users"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Type</label>
                  <select value={form.discount_type} onChange={e=>setForm(f=>({...f,discount_type:e.target.value as any}))}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 transition-all">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Value</label>
                  <input type="number" value={form.discount_value} onChange={e=>setForm(f=>({...f,discount_value:parseFloat(e.target.value)}))}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[['Min Order (₹)','min_order_value'],['Max Discount (₹)','max_discount']].map(([label,key])=>(
                  <div key={key}>
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">{label}</label>
                    <input type="number" value={(form as any)[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"/>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Usage Limit</label>
                  <input type="number" value={form.usage_limit} onChange={e=>setForm(f=>({...f,usage_limit:e.target.value}))} placeholder="Unlimited"
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">Expires On</label>
                  <input type="date" value={form.expires_at} onChange={e=>setForm(f=>({...f,expires_at:e.target.value}))}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"/>
                </div>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <button type="button" onClick={()=>setForm(f=>({...f,is_active:!f.is_active}))}
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${form.is_active?'bg-emerald-500':'bg-zinc-300'}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.is_active?'translate-x-4':'translate-x-0.5'}`}/>
                </button>
                <span className="text-sm text-zinc-700 font-medium">Active</span>
              </label>
            </div>
            <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/50 flex gap-3 sticky bottom-0">
              <button onClick={()=>setShowForm(false)} className="flex-1 py-2.5 text-sm font-semibold text-zinc-600 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-xl transition-colors shadow-sm shadow-orange-200">
                {saving?'Saving…':editing?'Update':'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-zinc-900 mb-2">Delete Coupon?</h3>
            <p className="text-sm text-zinc-500 mb-5">This will permanently remove the coupon code.</p>
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
