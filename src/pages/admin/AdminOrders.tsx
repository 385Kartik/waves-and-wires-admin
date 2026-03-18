import { useEffect, useState, useCallback } from 'react';
import { Search, RefreshCw, ChevronLeft, ChevronRight, X, Truck, CheckCircle, XCircle, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Order {
  id:string; order_number:string; status:string; payment_status:string; payment_method:string;
  total:number; subtotal:number; shipping:number; discount:number; tax:number;
  created_at:string; tracking_number:string|null; shipping_address:any;
  coupon_code:string|null;
  customer_name?:string; customer_phone?:string;
  items?:any[];
}

const SS:Record<string,string>={
  pending:'bg-amber-50 text-amber-700 border-amber-200',confirmed:'bg-blue-50 text-blue-700 border-blue-200',
  processing:'bg-violet-50 text-violet-700 border-violet-200',shipped:'bg-indigo-50 text-indigo-700 border-indigo-200',
  delivered:'bg-emerald-50 text-emerald-700 border-emerald-200',cancelled:'bg-red-50 text-red-700 border-red-200',
  refunded:'bg-zinc-100 text-zinc-600 border-zinc-200',
};
const PS:Record<string,string>={pending:'bg-amber-50 text-amber-700',paid:'bg-emerald-50 text-emerald-700',failed:'bg-red-50 text-red-700',refunded:'bg-zinc-100 text-zinc-600'};
const STATUSES=['all','pending','confirmed','processing','shipped','delivered','cancelled','refunded'];
const INR=(n:number)=>`₹${n.toLocaleString('en-IN')}`;
const PAGE=15;

export default function AdminOrders() {
  const [orders,setOrders]=useState<Order[]>([]);
  const [total,setTotal]=useState(0);
  const [page,setPage]=useState(0);
  const [search,setSearch]=useState('');
  const [status,setStatus]=useState('all');
  const [selected,setSelected]=useState<Order|null>(null);
  const [loading,setLoading]=useState(true);
  const [updatingId,setUpdatingId]=useState<string|null>(null);
  const [trackInput,setTrackInput]=useState('');

  const load=useCallback(async()=>{
    setLoading(true);
    // FIX: don't join profiles here — profiles doesn't have email column
    // Get customer info from shipping_address instead
    let q=supabase.from('orders')
      .select('id,order_number,status,payment_status,payment_method,total,subtotal,shipping,discount,tax,created_at,tracking_number,shipping_address,coupon_code',{count:'exact'})
      .order('created_at',{ascending:false})
      .range(page*PAGE,(page+1)*PAGE-1);
    if(status!=='all')q=q.eq('status',status);
    if(search.trim())q=q.ilike('order_number',`%${search.trim()}%`);
    const {data,count,error}=await q;
    if(error){toast.error(error.message);setLoading(false);return;}
    setOrders((data??[]).map((o:any)=>({
      ...o,
      customer_name: o.shipping_address?.full_name ?? 'Guest',
      customer_phone: o.shipping_address?.phone ?? '',
    })));
    setTotal(count??0);
    setLoading(false);
  },[page,search,status]);

  useEffect(()=>{load();},[load]);

  const openDetail=async(o:Order)=>{
    const {data}=await supabase.from('order_items').select('*').eq('order_id',o.id);
    setSelected({...o,items:data??[]});
    setTrackInput(o.tracking_number??'');
  };

  const updateStatus=async(id:string,s:string)=>{
    setUpdatingId(id);
    const {error}=await supabase.from('orders').update({status:s,updated_at:new Date().toISOString()}).eq('id',id);
    if(error)toast.error(error.message);
    else{toast.success(`Status → ${s}`);load();if(selected?.id===id)setSelected(p=>p?{...p,status:s}:p);}
    setUpdatingId(null);
  };

  const saveTracking=async()=>{
    if(!selected||!trackInput.trim())return;
    const {error}=await supabase.from('orders').update({tracking_number:trackInput,status:'shipped',updated_at:new Date().toISOString()}).eq('id',selected.id);
    if(error){toast.error(error.message);return;}
    toast.success('Tracking saved & marked as shipped');
    setSelected(p=>p?{...p,tracking_number:trackInput,status:'shipped'}:p);
    load();
  };

  const pages=Math.ceil(total/PAGE);

  return(
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-zinc-900">Orders</h1><p className="text-sm text-zinc-500">{total} total</p></div>
        <button onClick={load} className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200 rounded-xl px-3.5 py-2 hover:bg-zinc-50 transition-all">
          <RefreshCw className="h-3.5 w-3.5"/>Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"/>
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}} placeholder="Search order number…"
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all"/>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUSES.map(s=>(
            <button key={s} onClick={()=>{setStatus(s);setPage(0);}}
              className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-all ${status===s?'bg-zinc-900 text-white shadow-sm':'bg-zinc-50 text-zinc-600 border border-zinc-200 hover:border-zinc-300'}`}>
              {s==='all'?'All':s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-zinc-100 bg-zinc-50/50">
              {['Order #','Customer','Status','Payment','Total','Date',''].map(h=>(
                <th key={h} className={`px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider ${h==='Total'||h==='Date'||h===''?'text-right':'text-left'}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-zinc-50">
              {loading?[...Array(6)].map((_,i)=>(
                <tr key={i}>{[...Array(7)].map((_,j)=><td key={j} className="px-4 py-4"><div className="h-4 rounded-lg bg-zinc-100 animate-pulse"/></td>)}</tr>
              )):orders.map(o=>(
                <tr key={o.id} className="hover:bg-zinc-50/70 transition-colors group">
                  <td className="px-4 py-3.5 font-bold text-amber-600 text-xs">#{o.order_number}</td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-zinc-800 text-xs">{o.customer_name}</p>
                    <p className="text-[11px] text-zinc-400">{o.customer_phone}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <select value={o.status} onChange={e=>updateStatus(o.id,e.target.value)} disabled={updatingId===o.id}
                      className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border capitalize cursor-pointer outline-none ${SS[o.status]??''}`}>
                      {STATUSES.filter(s=>s!=='all').map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3.5">
                    <div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${PS[o.payment_status]??''}`}>{o.payment_status}</span>
                      <p className="text-[9px] text-zinc-400 mt-0.5 capitalize">{o.payment_method==='cod'?'Cash on Delivery':'Online'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-zinc-800 text-xs">{INR(o.total)}</td>
                  <td className="px-4 py-3.5 text-right text-[11px] text-zinc-400">{format(new Date(o.created_at),'dd MMM, h:mm a')}</td>
                  <td className="px-4 py-3.5 text-right">
                    <button onClick={()=>openDetail(o)} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all opacity-0 group-hover:opacity-100">
                      <Eye className="h-4 w-4"/>
                    </button>
                  </td>
                </tr>
              ))}
              {!loading&&orders.length===0&&<tr><td colSpan={7} className="px-4 py-12 text-center text-zinc-400 text-sm">No orders found</td></tr>}
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

      {/* Detail Drawer */}
      {selected&&(
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={()=>setSelected(null)}/>
          <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-zinc-900">#{selected.order_number}</h2>
                <p className="text-xs text-zinc-400">{format(new Date(selected.created_at),'PPp')}</p>
              </div>
              <button onClick={()=>setSelected(null)} className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-500"><X className="h-4 w-4"/></button>
            </div>
            <div className="flex-1 p-6 space-y-5">
              <div className="flex gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full border capitalize ${SS[selected.status]??''}`}>{selected.status}</span>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${PS[selected.payment_status]??''}`}>
                  {selected.payment_status} — {selected.payment_method==='cod'?'COD':'Online'}
                </span>
              </div>
              <div className="bg-zinc-50 rounded-2xl p-4 grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-1">Customer</p><p className="font-semibold">{selected.customer_name}</p></div>
                <div><p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-1">Phone</p><p className="font-semibold">{selected.customer_phone||'—'}</p></div>
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">Shipping Address</p>
                <div className="bg-zinc-50 rounded-2xl p-4 text-sm text-zinc-600 leading-relaxed">
                  {selected.shipping_address?.address_line_1}{selected.shipping_address?.address_line_2?`, ${selected.shipping_address.address_line_2}`:''}<br/>
                  {selected.shipping_address?.city}, {selected.shipping_address?.state} — {selected.shipping_address?.postal_code}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">Items</p>
                <div className="border border-zinc-100 rounded-2xl overflow-hidden divide-y divide-zinc-50">
                  {selected.items?.map(item=>(
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-white">
                      {item.product_image&&<img src={item.product_image} className="h-11 w-11 rounded-xl object-cover"/>}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{item.product_name}</p>
                        <p className="text-xs text-zinc-400">{INR(item.price)} × {item.quantity}</p>
                      </div>
                      <p className="font-bold text-sm">{INR(item.total)}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-zinc-50 rounded-2xl p-4 space-y-2 text-sm">
                {[['Subtotal',INR(selected.subtotal)],selected.discount>0?['Discount',`−${INR(selected.discount)}`]:null,['Shipping',selected.shipping>0?INR(selected.shipping):'Free'],['Tax',INR(selected.tax)]].filter(Boolean).map(([k,v]:any)=>(
                  <div key={k} className="flex justify-between text-zinc-600"><span>{k}</span><span>{v}</span></div>
                ))}
                <div className="flex justify-between font-bold text-zinc-900 pt-2 border-t border-zinc-200 text-base"><span>Total</span><span>{INR(selected.total)}</span></div>
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-700 uppercase tracking-wider mb-2">Tracking Number</p>
                <div className="flex gap-2">
                  <input value={trackInput} onChange={e=>setTrackInput(e.target.value)} placeholder="Enter tracking number…"
                    className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all"/>
                  <button onClick={saveTracking} className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-semibold px-4 rounded-xl transition-colors">
                    <Truck className="h-3.5 w-3.5"/>Save
                  </button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {selected.status==='pending'&&<button onClick={()=>updateStatus(selected.id,'confirmed')} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"><CheckCircle className="h-3.5 w-3.5"/>Confirm</button>}
                {['pending','confirmed','processing'].includes(selected.status)&&<button onClick={()=>updateStatus(selected.id,'cancelled')} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"><XCircle className="h-3.5 w-3.5"/>Cancel</button>}
                {selected.status==='shipped'&&<button onClick={()=>updateStatus(selected.id,'delivered')} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors"><CheckCircle className="h-3.5 w-3.5"/>Delivered</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
