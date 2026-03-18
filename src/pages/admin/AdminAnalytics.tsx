import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';

const COLORS=['#f97316','#3b82f6','#10b981','#8b5cf6','#ec4899','#f59e0b'];
const INR=(n:number)=>`₹${n.toLocaleString('en-IN')}`;

export default function AdminAnalytics() {
  const [range,setRange]=useState('30');
  const [revData,setRevData]=useState<any[]>([]);
  const [topProds,setTopProds]=useState<any[]>([]);
  const [catData,setCatData]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    async function load(){
      setLoading(true);
      const days=parseInt(range);
      const since=subDays(new Date(),days).toISOString();
      const [revRes,topRes,catRes]=await Promise.all([
        supabase.from('admin_revenue_by_day').select('*'),
        supabase.from('admin_top_products').select('*'),
        supabase.from('order_items').select('total,products(categories(name))').gte('created_at',since),
      ]);
      const interval=eachDayOfInterval({start:subDays(new Date(),days-1),end:new Date()});
      const revMap:Record<string,any>={};
      (revRes.data??[]).forEach((d:any)=>{revMap[d.date]=d;});
      setRevData(interval.map(d=>{const k=format(d,'yyyy-MM-dd');return revMap[k]??{date:k,revenue:0,order_count:0};}));
      setTopProds(topRes.data??[]);
      const catMap:Record<string,number>={};
      (catRes.data??[]).forEach((item:any)=>{const cat=item.products?.categories?.name??'Uncategorised';catMap[cat]=(catMap[cat]??0)+Number(item.total);});
      setCatData(Object.entries(catMap).map(([name,value])=>({name,value})));
      setLoading(false);
    }
    load();
  },[range]);

  const totalRev=revData.reduce((s,d)=>s+d.revenue,0);
  const totalOrd=revData.reduce((s,d)=>s+d.order_count,0);
  const avgOrd=totalOrd>0?totalRev/totalOrd:0;

  return(
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold text-zinc-900">Analytics</h1><p className="text-sm text-zinc-500">Business overview</p></div>
        <div className="flex gap-1.5 bg-white border border-zinc-200 rounded-xl p-1">
          {[['7','7D'],['30','30D'],['90','90D']].map(([v,l])=>(
            <button key={v} onClick={()=>setRange(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${range===v?'bg-zinc-900 text-white shadow-sm':'text-zinc-500 hover:text-zinc-800'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[[`Revenue (${range}d)`,INR(totalRev),'Total paid orders'],[`Orders (${range}d)`,totalOrd.toString(),'Completed orders'],['Avg Order Value',INR(avgOrd),'Per paid order']].map(([label,value,sub])=>(
          <div key={label as string} className="bg-white rounded-2xl border border-zinc-200/80 p-5">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-black text-zinc-900 mt-2">{value}</p>
            <p className="text-[11px] text-zinc-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 p-6">
        <h2 className="text-sm font-bold text-zinc-900 mb-6">Revenue Over Time</h2>
        {loading?<div className="h-56 rounded-xl bg-zinc-100 animate-pulse"/>:(
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revData} margin={{top:0,right:0,left:-20,bottom:0}}>
              <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.12}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false}/>
              <XAxis dataKey="date" tick={{fontSize:11,fill:'#a1a1aa'}} tickLine={false} axisLine={false} tickFormatter={d=>format(new Date(d),'MMM d')}/>
              <YAxis tick={{fontSize:11,fill:'#a1a1aa'}} tickLine={false} axisLine={false} tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`}/>
              <Tooltip contentStyle={{background:'#18181b',border:'1px solid #27272a',borderRadius:12,fontSize:12,color:'#fff'}} formatter={(v:number)=>[INR(v),'Revenue']} labelFormatter={l=>format(new Date(l),'PPP')}/>
              <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} fill="url(#g)"/>
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top products */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6">
          <h2 className="text-sm font-bold text-zinc-900 mb-4">Top Products</h2>
          {loading?<div className="space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="h-10 rounded-xl bg-zinc-100 animate-pulse"/>)}</div>:(
            <div className="space-y-1">
              {topProds.slice(0,8).map((p,i)=>(
                <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-zinc-50 transition-colors">
                  <span className="text-xs font-black text-zinc-300 w-4 shrink-0">{i+1}</span>
                  {p.image?<img src={p.image} alt={p.name} className="h-9 w-9 rounded-xl object-cover border border-zinc-100 shrink-0"/>:<div className="h-9 w-9 rounded-xl bg-zinc-100 shrink-0"/>}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-zinc-400">{p.units_sold} units sold</p>
                  </div>
                  <p className="font-bold text-sm text-zinc-800 shrink-0">{INR(p.revenue)}</p>
                </div>
              ))}
              {topProds.length===0&&<p className="text-sm text-zinc-400 text-center py-6">No sales data yet</p>}
            </div>
          )}
        </div>

        {/* Category pie */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-6">
          <h2 className="text-sm font-bold text-zinc-900 mb-4">Revenue by Category</h2>
          {loading?<div className="h-48 rounded-xl bg-zinc-100 animate-pulse"/>:
            catData.length===0?<p className="text-sm text-zinc-400 text-center py-8">No sales data yet</p>:(
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={catData} cx="50%" cy="50%" outerRadius={85} innerRadius={40} dataKey="value" nameKey="name" paddingAngle={3}>
                    {catData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={{background:'#18181b',border:'1px solid #27272a',borderRadius:12,fontSize:12,color:'#fff'}} formatter={(v:number)=>INR(v)}/>
                </PieChart>
              </ResponsiveContainer>
            )}
          {catData.length>0&&(
            <div className="flex flex-wrap gap-3 mt-4 justify-center">
              {catData.map((d,i)=>(
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{background:COLORS[i%COLORS.length]}}/>
                  <span className="text-[11px] text-zinc-500">{d.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
