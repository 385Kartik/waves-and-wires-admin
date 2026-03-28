import { useEffect, useState, useCallback } from 'react';
import { Search, RefreshCw, ChevronLeft, ChevronRight, X, Truck, CheckCircle, XCircle, Eye, Package, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Order {
  id:string; order_number:string; status:string; payment_status:string; payment_method:string;
  total:number; subtotal:number; shipping:number; discount:number; tax:number;
  created_at:string; tracking_number:string|null; shipping_address:any; coupon_code:string|null;
  shiprocket_order_id:string|null; awb_code:string|null; courier_name:string|null;
  customer_name?:string; customer_phone?:string; items?:any[];
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
  const [srPushing,setSrPushing]=useState(false);
  const [srTracking,setSrTracking]=useState<any>(null);
  const [srTrackLoading,setSrTrackLoading]=useState(false);

  const load=useCallback(async()=>{
    setLoading(true);
    let q=supabase.from('orders')
      .select('*, shipping_address',{count:'exact'})
      .order('created_at',{ascending:false}).range(page*PAGE,(page+1)*PAGE-1);
    if(status!=='all')q=q.eq('status',status);
    if(search.trim())q=q.ilike('order_number',`%${search.trim()}%`);
    const {data,count,error}=await q;
    if(error){toast.error(error.message);setLoading(false);return;}
    setOrders((data??[]).map((o:any)=>({...o,customer_name:o.shipping_address?.full_name??'Guest',customer_phone:o.shipping_address?.phone??''})));
    setTotal(count??0);setLoading(false);
  },[page,search,status]);

  useEffect(()=>{load();},[load]);

  const openDetail=async(o:Order)=>{
    const {data}=await supabase.from('order_items').select('*').eq('order_id',o.id);
    setSelected({...o,items:data??[]});
    setTrackInput(o.tracking_number??'');
    setSrTracking(null);
  };

  // SHIPROCKET SE ORDER CANCEL KARNE KA FUNCTION
  async function cancelInShiprocket(srId: string) {
    try {
      await fetch('/api/shiprocket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel_order', payload: { shiprocket_order_id: srId } }),
      });
    } catch (e) { console.error("SR Cancel Failed", e); }
  }

  const updateStatus=async(id:string, s:string, srId?: string | null)=>{
    setUpdatingId(id);
    try {
      if(s === 'cancelled' && srId) {
        await cancelInShiprocket(srId);
      }
      const {error}=await supabase.from('orders').update({status:s,updated_at:new Date().toISOString()}).eq('id',id);
      if(error) throw error;
      toast.success(`Status → ${s}`);
      load();
      if(selected?.id===id)setSelected(p=>p?{...p,status:s}:p);
    } catch(err:any){ toast.error(err.message); }
    finally{ setUpdatingId(null); }
  };

  const saveTracking=async()=>{
    if(!selected||!trackInput.trim())return;
    const {error}=await supabase.from('orders').update({tracking_number:trackInput,status:'shipped',updated_at:new Date().toISOString()}).eq('id',selected.id);
    if(error){toast.error(error.message);return;}
    toast.success('Tracking saved');
    setSelected(p=>p?{...p,tracking_number:trackInput,status:'shipped'}:p);
    load();
  };

  async function pushToShiprocket() {
    if(!selected)return;
    setSrPushing(true);
    try {
      const items=(selected.items??[]).map((item:any)=>({
        name:item.product_name, sku:item.product_sku||'SKU-001',
        units:item.quantity, selling_price:item.price,
      }));
      const payload={
        order_id: selected.order_number,
        order_date: new Date(selected.created_at).toISOString().split('T')[0],
        pickup_location: 'Primary',
        billing_customer_name: selected.shipping_address?.full_name||'',
        billing_address: selected.shipping_address?.address_line_1||'',
        billing_city: selected.shipping_address?.city||'',
        billing_pincode: selected.shipping_address?.postal_code||'',
        billing_state: selected.shipping_address?.state||'',
        billing_country: 'India',
        billing_email: 'support@wavesandwires.in',
        billing_phone: selected.shipping_address?.phone||'',
        shipping_is_billing: true,
        order_items: items,
        payment_method: selected.payment_method==='cod'?'COD':'Prepaid',
        sub_total: selected.subtotal,
        length: 20, breadth: 15, height: 10, weight: 0.5,
      };
      const res=await fetch('/api/shiprocket',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'create_order',payload}),
      });
      const data=await res.json();
      if(data.order_id){
        await supabase.from('orders').update({
          shiprocket_order_id: String(data.order_id),
          awb_code: data.awb_code||null,
          courier_name: data.courier_name||null,
          status:'confirmed',
        }).eq('id',selected.id);
        toast.success("Pushed to Shiprocket!");
        load();
        setSelected(p=>p?{...p, shiprocket_order_id: String(data.order_id), status:'confirmed'}:p);
      } else {
        toast.error(data.message || "Failed to push");
      }
    } catch(err:any){toast.error(err.message);}
    finally { setSrPushing(false); }
  }

  async function fetchSrTracking() {
    if(!selected?.awb_code)return;
    setSrTrackLoading(true);
    try {
      const res=await fetch('/api/shiprocket',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'track_awb',payload:{awb:selected.awb_code}}),
      });
      const data=await res.json();
      setSrTracking(data?.tracking_data??data??null);
    } catch(err:any){toast.error('Tracking fetch failed');}
    setSrTrackLoading(false);
  }

  useEffect(() => {
    if (selected?.awb_code) fetchSrTracking();
  }, [selected?.awb_code]);

  const pages=Math.ceil(total/PAGE);

  return(
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-zinc-900">Orders</h1><p className="text-sm text-zinc-500">{total} total</p></div>
        <button onClick={load} className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200 rounded-xl px-3.5 py-2 hover:bg-zinc-50 transition-all">
          <RefreshCw className="h-3.5 w-3.5"/>Refresh
        </button>
      </div>

      {/* Filter and Table... (Keeping standard for brevity, but use the latest UI) */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden">
        <table className="w-full text-sm">
           <thead><tr className="border-b border-zinc-100 bg-zinc-50/50">
              {['Order #','Customer','Status','Payment','Total','Date',''].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">{h}</th>
              ))}
            </tr></thead>
            <tbody>
               {orders.map(o=>(
                <tr key={o.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                  <td className="px-4 py-3 font-bold text-amber-600">#{o.order_number}</td>
                  <td className="px-4 py-3 text-xs font-semibold">{o.customer_name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${SS[o.status]}`}>{o.status}</span>
                  </td>
                  <td className="px-4 py-3">
                     <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PS[o.payment_status]}`}>{o.payment_status}</span>
                  </td>
                  <td className="px-4 py-3 font-bold">{INR(o.total)}</td>
                  <td className="px-4 py-3 text-zinc-400 text-[11px]">{format(new Date(o.created_at),'dd MMM, h:mm a')}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={()=>openDetail(o)} className="p-1.5 hover:bg-zinc-100 rounded-lg"><Eye className="h-4 w-4"/></button>
                  </td>
                </tr>
               ))}
            </tbody>
        </table>
      </div>

      {selected&&(
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={()=>setSelected(null)}/>
          <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold">Order Details #{selected.order_number}</h2>
              <button onClick={()=>setSelected(null)}><X className="h-4 w-4"/></button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Shiprocket Control */}
              <div className="border border-zinc-200 rounded-2xl overflow-hidden">
                <div className="bg-zinc-50 px-4 py-3 border-b flex justify-between items-center">
                  <span className="text-xs font-bold uppercase">Shiprocket Integration</span>
                  {selected.shiprocket_order_id && <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">ID: {selected.shiprocket_order_id}</span>}
                </div>
                <div className="p-4">
                  {selected.status !== 'cancelled' && !selected.shiprocket_order_id ? (
                    <button onClick={pushToShiprocket} disabled={srPushing} className="w-full bg-zinc-900 text-white py-2.5 rounded-xl text-sm font-bold flex justify-center gap-2">
                      {srPushing ? "Pushing..." : <><Truck className="h-4 w-4" /> Push to Shiprocket</>}
                    </button>
                  ) : selected.status === 'cancelled' ? (
                    <p className="text-center text-red-500 text-xs font-bold">Order is cancelled.</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-center text-xs text-zinc-500">Live Status: <span className="text-emerald-600 font-bold uppercase">{srTracking?.shipment_status || 'In Transit'}</span></p>
                      {selected.awb_code && <p className="text-center font-mono text-[10px]">AWB: {selected.awb_code}</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-zinc-400 uppercase">Manage Order</p>
                <div className="grid grid-cols-2 gap-2">
                  {selected.status !== 'cancelled' && selected.status !== 'delivered' && (
                    <button 
                      onClick={() => updateStatus(selected.id, 'cancelled', selected.shiprocket_order_id)}
                      className="flex items-center justify-center gap-2 bg-red-50 text-red-600 py-2.5 rounded-xl text-xs font-bold hover:bg-red-100"
                    >
                      <XCircle className="h-4 w-4" /> Cancel Order
                    </button>
                  )}
                  {selected.status === 'pending' && (
                    <button 
                      onClick={() => updateStatus(selected.id, 'confirmed')}
                      className="bg-blue-50 text-blue-700 py-2.5 rounded-xl text-xs font-bold"
                    >
                      Confirm Manually
                    </button>
                  )}
                  {selected.status === 'cancelled' && selected.payment_status === 'paid' && (
                    <button 
                      onClick={() => updateStatus(selected.id, 'refunded')}
                      className="bg-amber-50 text-amber-700 py-2.5 rounded-xl text-xs font-bold"
                    >
                      Grant Refund
                    </button>
                  )}
                </div>
              </div>

              {/* Status Message */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-center">
                <p className="text-[11px] font-semibold text-zinc-500 flex items-center justify-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  Statuses are automatically synced via Shiprocket Webhooks.
                </p>
              </div>
              
              {/* Address and Items... (keeping your existing item mapping here) */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}