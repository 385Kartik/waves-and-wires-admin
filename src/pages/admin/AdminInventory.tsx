import { useEffect, useState } from 'react';
import { Search, Edit2, Check, X, AlertTriangle, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Item { id:string; name:string; sku:string; stock:number; images:string[]; price:number; category_name?:string; }
const INR=(n:number)=>`₹${n.toLocaleString('en-IN')}`;

export default function AdminInventory() {
  const [items,setItems]=useState<Item[]>([]);
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState<'all'|'low'|'out'>('all');
  const [editing,setEditing]=useState<string|null>(null);
  const [editVal,setEditVal]=useState('');
  const [loading,setLoading]=useState(true);

  async function load(){
    setLoading(true);
    const {data}=await supabase.from('products').select('id,name,sku,stock,images,price,categories(name)').eq('is_active',true).order('stock',{ascending:true});
    setItems((data??[]).map((p:any)=>({...p,category_name:p.categories?.name??'—'})));
    setLoading(false);
  }

  useEffect(()=>{load();},[]);

  async function saveStock(id:string){
    const n=parseInt(editVal);
    if(isNaN(n)||n<0){toast.error('Invalid value');return;}
    const {error}=await supabase.from('products').update({stock:n}).eq('id',id);
    if(error){toast.error(error.message);return;}
    setItems(prev=>prev.map(p=>p.id===id?{...p,stock:n}:p));
    toast.success('Stock updated');setEditing(null);
  }

  const outCount=items.filter(p=>p.stock===0).length;
  const lowCount=items.filter(p=>p.stock>0&&p.stock<=10).length;

  const filtered=items
    .filter(p=>!search||p.name.toLowerCase().includes(search.toLowerCase())||p.sku.toLowerCase().includes(search.toLowerCase()))
    .filter(p=>filter==='out'?p.stock===0:filter==='low'?p.stock>0&&p.stock<=10:true);

  return(
    <div className="p-6 space-y-5">
      <div><h1 className="text-xl font-bold text-zinc-900">Inventory</h1><p className="text-sm text-zinc-500">Manage stock levels</p></div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {label:'All Products',value:items.length,key:'all',color:'border-zinc-200',active:'border-orange-400 bg-orange-50'},
          {label:'Low Stock (≤10)',value:lowCount,key:'low',color:'border-zinc-200',active:'border-amber-400 bg-amber-50',icon:AlertTriangle,iconColor:'text-amber-500'},
          {label:'Out of Stock',value:outCount,key:'out',color:'border-zinc-200',active:'border-red-400 bg-red-50',icon:Package,iconColor:'text-red-400'},
        ].map(({label,value,key,color,active,icon:Icon,iconColor})=>(
          <button key={key} onClick={()=>setFilter(key as any)}
            className={`bg-white rounded-2xl border-2 p-4 text-left transition-all ${filter===key?active:color+' hover:border-zinc-300'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 font-medium">{label}</p>
                <p className={`text-2xl font-black mt-1 ${key==='low'?'text-amber-600':key==='out'?'text-red-600':'text-zinc-900'}`}>{value}</p>
              </div>
              {Icon&&<Icon className={`h-6 w-6 ${iconColor}`}/>}
            </div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200/80 p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or SKU…"
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"/>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-zinc-100 bg-zinc-50/50">
              {['Product','SKU','Category','Price','Stock','Status','Edit Stock'].map(h=>(
                <th key={h} className={`px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider ${h==='Price'?'text-right':'text-left'}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-zinc-50">
              {loading?[...Array(5)].map((_,i)=><tr key={i}>{[...Array(7)].map((_,j)=><td key={j} className="px-4 py-4"><div className="h-4 rounded-lg bg-zinc-100 animate-pulse"/></td>)}</tr>)
              :filtered.map(p=>(
                <tr key={p.id} className="hover:bg-zinc-50/70 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      {p.images?.[0]?<img src={p.images[0]} alt={p.name} className="h-9 w-9 rounded-xl object-cover border border-zinc-100"/>:<div className="h-9 w-9 rounded-xl bg-zinc-100"/>}
                      <span className="font-semibold text-zinc-800 text-xs max-w-[180px] truncate">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[10px] font-mono text-zinc-400">{p.sku||'—'}</td>
                  <td className="px-4 py-3.5 text-xs text-zinc-500">{p.category_name}</td>
                  <td className="px-4 py-3.5 text-right font-semibold text-xs text-zinc-800">{INR(p.price)}</td>
                  <td className="px-4 py-3.5">
                    {editing===p.id?(
                      <div className="flex items-center gap-1">
                        <input type="number" min={0} value={editVal} onChange={e=>setEditVal(e.target.value)} autoFocus
                          className="w-20 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5 text-xs font-bold text-center outline-none focus:border-orange-400"/>
                        <button onClick={()=>saveStock(p.id)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"><Check className="h-3 w-3"/></button>
                        <button onClick={()=>setEditing(null)} className="p-1.5 rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition-colors"><X className="h-3 w-3"/></button>
                      </div>
                    ):(
                      <span className={`font-black text-base ${p.stock===0?'text-red-500':p.stock<=10?'text-amber-500':'text-zinc-800'}`}>{p.stock}</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {p.stock===0?<span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-200">Out of stock</span>
                    :p.stock<=10?<span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">Low stock</span>
                    :<span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">In stock</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    {editing!==p.id&&<button onClick={()=>{setEditing(p.id);setEditVal(String(p.stock));}} className="p-1.5 rounded-lg text-zinc-400 hover:text-orange-500 hover:bg-orange-50 transition-all"><Edit2 className="h-3.5 w-3.5"/></button>}
                  </td>
                </tr>
              ))}
              {!loading&&filtered.length===0&&<tr><td colSpan={7} className="px-4 py-12 text-center text-zinc-400 text-sm">No products match filter</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
