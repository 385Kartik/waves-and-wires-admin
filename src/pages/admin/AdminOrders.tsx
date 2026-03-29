import { useEffect, useState, useCallback } from 'react';
import {
  Search, RefreshCw, ChevronLeft, ChevronRight, X, Truck,
  CheckCircle, XCircle, Eye, Package, AlertCircle, Link2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast }    from 'sonner';
import { format }   from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OrderItem {
  id: string; product_name: string; product_sku: string | null;
  product_image: string | null; quantity: number; price: number; total: number;
}

interface Order {
  id: string; order_number: string; status: string;
  payment_status: string; payment_method: string;
  total: number; subtotal: number; shipping: number;
  discount: number; tax: number; coupon_code: string | null;
  created_at: string; tracking_number: string | null;
  shipping_address: any;
  shiprocket_order_id:    string | null;
  shiprocket_shipment_id: string | null;
  awb_code:               string | null;
  courier_name:           string | null;
  customer_name?:         string;
  customer_phone?:        string;
  items?:                 OrderItem[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE     = 15;
const STATUSES = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] as const;

const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-amber-50   text-amber-700   border-amber-200',
  confirmed:  'bg-blue-50    text-blue-700    border-blue-200',
  processing: 'bg-violet-50  text-violet-700  border-violet-200',
  shipped:    'bg-indigo-50  text-indigo-700  border-indigo-200',
  delivered:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled:  'bg-red-50     text-red-700     border-red-200',
  refunded:   'bg-zinc-100   text-zinc-600    border-zinc-200',
};

const PAYMENT_COLORS: Record<string, string> = {
  pending:  'bg-amber-50  text-amber-700',
  paid:     'bg-emerald-50 text-emerald-700',
  failed:   'bg-red-50    text-red-700',
  refunded: 'bg-zinc-100  text-zinc-600',
};

const INR = (n: number) => `₹${n.toLocaleString('en-IN')}`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminOrders() {
  const [orders,         setOrders]         = useState<Order[]>([]);
  const [totalCount,     setTotalCount]     = useState(0);
  const [page,           setPage]           = useState(0);
  const [searchInput,    setSearchInput]    = useState('');
  const [searchQuery,    setSearchQuery]    = useState('');
  const [statusFilter,   setStatusFilter]   = useState<string>('all');
  const [selected,       setSelected]       = useState<Order | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [updatingId,     setUpdatingId]     = useState<string | null>(null);
  const [manualStatus,   setManualStatus]   = useState('');
  const [srPushing,      setSrPushing]      = useState(false);
  const [srSyncing,      setSrSyncing]      = useState(false);
  const [srTracking,     setSrTracking]     = useState<any>(null);
  const [srTrackLoading, setSrTrackLoading] = useState(false);

  // ── Data loading ──────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('orders')
      .select('*, shipping_address', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE, (page + 1) * PAGE - 1);

    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    if (searchQuery.trim())     q = q.ilike('order_number', `%${searchQuery.trim()}%`);

    const { data, count, error } = await q;
    if (error) { toast.error(error.message); setLoading(false); return; }

    setOrders((data ?? []).map((o: any) => ({
      ...o,
      customer_name:  o.shipping_address?.full_name ?? 'Guest',
      customer_phone: o.shipping_address?.phone     ?? '',
    })));
    setTotalCount(count ?? 0);
    setLoading(false);
  }, [page, searchQuery, statusFilter]);

  useEffect(() => { load(); }, [load]);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [searchQuery, statusFilter]);

  // ── Open detail panel ─────────────────────────────────────────────────────

  const openDetail = async (o: Order) => {
    const { data } = await supabase.from('order_items').select('*').eq('order_id', o.id);
    const fullOrder = { ...o, items: data ?? [] };
    setSelected(fullOrder);
    setManualStatus(o.status);
    setSrTracking(null);
    // Auto-fetch tracking if AWB exists
    if (o.awb_code) fetchSrTracking(o.awb_code);
  };

  // ── Shiprocket: Push order ────────────────────────────────────────────────

  async function pushToShiprocket() {
    if (!selected) return;
    setSrPushing(true);
    try {
      const payload = {
        order_id:       selected.order_number,
        order_date:     new Date(selected.created_at).toISOString().split('T')[0],
        pickup_location: 'Primary',
        billing_customer_name: selected.shipping_address?.full_name  ?? '',
        billing_last_name:     '',
        billing_address:       selected.shipping_address?.address_line_1 ?? '',
        billing_address_2:     selected.shipping_address?.address_line_2 ?? '',
        billing_city:          selected.shipping_address?.city        ?? '',
        billing_pincode:       selected.shipping_address?.postal_code ?? '',
        billing_state:         selected.shipping_address?.state       ?? '',
        billing_country:       'India',
        billing_email:         'support@wavesandwires.in',
        billing_phone:         selected.shipping_address?.phone       ?? '',
        shipping_is_billing:   true,
        order_items: (selected.items ?? []).map((item: OrderItem) => ({
          name:          item.product_name,
          sku:           item.product_sku  ?? 'SKU-001',
          units:         item.quantity,
          selling_price: item.price,
          discount: '', tax: '', hsn: '',
        })),
        payment_method: selected.payment_method === 'cod' ? 'COD' : 'Prepaid',
        sub_total:  selected.subtotal,
        length: 20, breadth: 15, height: 10, weight: 0.5,
      };

      const res    = await fetch('/api/shiprocket', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body:   JSON.stringify({ action: 'create_order', payload }),
      });
      const srData = await res.json();

      if (srData.order_id) {
        const update = {
          shiprocket_order_id:    String(srData.order_id),
          shiprocket_shipment_id: srData.shipment_id  ? String(srData.shipment_id) : null,
          awb_code:               srData.awb_code     ?? null,
          courier_name:           srData.courier_name ?? null,
          status:                 'confirmed',
        };
        await supabase.from('orders').update(update).eq('id', selected.id);
        setSelected(p => p ? { ...p, ...update } : p);
        toast.success('Pushed to Shiprocket & status → confirmed');
        load();
      } else {
        toast.error(srData.message ?? srData.error ?? 'Shiprocket push failed');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSrPushing(false);
    }
  }

  // ── Shiprocket: Sync AWB from SR ──────────────────────────────────────────

  async function syncFromShiprocket() {
    if (!selected?.shiprocket_order_id) return;
    setSrSyncing(true);
    try {
      const res  = await fetch('/api/shiprocket', {
        method:  'POST', headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action:  'get_order_details',
          payload: { shiprocket_order_id: selected.shiprocket_order_id },
        }),
      });
      const data = await res.json();

      // SR response structure vary kar sakta hai — multiple fallbacks
      const shipment  = data?.data?.shipments?.[0];
      const awb       = shipment?.awb                  ?? data?.awb_code    ?? null;
      const courier   = shipment?.courier?.name        ?? data?.courier_name ?? null;
      const shipmentId = shipment?.id ? String(shipment.id) : null;

      if (awb) {
        const update = {
          awb_code:               awb,
          courier_name:           courier,
          shiprocket_shipment_id: shipmentId ?? selected.shiprocket_shipment_id,
        };
        await supabase.from('orders').update(update).eq('id', selected.id);
        setSelected(p => p ? { ...p, ...update } : p);
        toast.success('AWB synced from Shiprocket!');
        load();
      } else {
        toast.info('No AWB assigned yet on Shiprocket. Try again after courier assignment.');
      }
    } catch (err: any) {
      toast.error('Sync failed: ' + err.message);
    } finally {
      setSrSyncing(false);
    }
  }

  // ── Shiprocket: Fetch live tracking ──────────────────────────────────────

  async function fetchSrTracking(awb?: string) {
    const awbCode = awb ?? selected?.awb_code;
    if (!awbCode) return;
    setSrTrackLoading(true);
    try {
      const res  = await fetch('/api/shiprocket', {
        method:  'POST', headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'track_awb', payload: { awb: awbCode } }),
      });
      const data = await res.json();
      setSrTracking(data?.tracking_data ?? data ?? null);
    } catch (err: any) {
      toast.error('Tracking fetch failed');
    } finally {
      setSrTrackLoading(false);
    }
  }

  // ── Status update (manual override) ──────────────────────────────────────

  const updateStatus = async (id: string, newStatus: string) => {
    if (!selected) return;
    setUpdatingId(id);
    try {
      // If cancelling and SR order exists → cancel in SR first
      if (newStatus === 'cancelled' && selected.shiprocket_order_id) {
        const srAction  = selected.awb_code ? 'cancel_shipment' : 'cancel_order';
        const srPayload = selected.awb_code
          ? { awb_code: selected.awb_code }
          : { shiprocket_order_id: selected.shiprocket_order_id };
        await fetch('/api/shiprocket', {
          method:  'POST', headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ action: srAction, payload: srPayload }),
        }).catch(e => console.error('[Admin SR Cancel]', e));
      }

      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Status updated → ${newStatus}`);
      setSelected(p => p ? { ...p, status: newStatus } : p);
      setManualStatus(newStatus);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const pages = Math.ceil(totalCount / PAGE);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Orders</h1>
          <p className="text-sm text-zinc-500">{totalCount} total</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200 rounded-xl px-3.5 py-2 hover:bg-zinc-50 transition-all">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setSearchQuery(searchInput)}
            placeholder="Search order #…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300"
          />
        </div>
        {searchInput !== searchQuery && (
          <button onClick={() => setSearchQuery(searchInput)}
            className="rounded-xl bg-zinc-900 text-white px-4 py-2 text-sm font-semibold">
            Search
          </button>
        )}
        {searchQuery && (
          <button onClick={() => { setSearchInput(''); setSearchQuery(''); }}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700">
            <X className="h-3.5 w-3.5" /> Clear
          </button>
        )}

        {/* Status tabs */}
        <div className="flex gap-1 flex-wrap">
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                statusFilter === s
                  ? 'bg-zinc-900 text-white'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-zinc-400">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="mx-auto h-8 w-8 text-zinc-300 mb-2" />
            <p className="text-sm text-zinc-400">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  {['Order #', 'Customer', 'Status', 'Payment', 'Method', 'Total', 'Date', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-amber-600 whitespace-nowrap">#{o.order_number}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-semibold text-zinc-800">{o.customer_name}</p>
                      <p className="text-[11px] text-zinc-400">{o.customer_phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase border ${STATUS_COLORS[o.status] ?? ''}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PAYMENT_COLORS[o.payment_status] ?? ''}`}>
                        {o.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500 uppercase">{o.payment_method}</td>
                    <td className="px-4 py-3 font-bold text-zinc-800">{INR(o.total)}</td>
                    <td className="px-4 py-3 text-zinc-400 text-[11px] whitespace-nowrap">
                      {format(new Date(o.created_at), 'dd MMM, h:mm a')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openDetail(o)}
                        className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors">
                        <Eye className="h-4 w-4 text-zinc-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100">
            <p className="text-xs text-zinc-400">
              Page {page + 1} of {pages} · {totalCount} orders
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 transition-all">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1}
                className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 transition-all">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── DETAIL PANEL ──────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)} />

          {/* Panel */}
          <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">

            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-zinc-900">#{selected.order_number}</h2>
                <p className="text-xs text-zinc-400">{format(new Date(selected.created_at), 'dd MMM yyyy, h:mm a')}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">

              {/* ── Shiprocket Integration ──────────────────────────── */}
              <section className="border border-zinc-200 rounded-2xl overflow-hidden">
                <div className="bg-zinc-50 px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700 uppercase tracking-wide">Shiprocket</span>
                  {selected.shiprocket_order_id && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                      SR #{selected.shiprocket_order_id}
                    </span>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  {selected.status === 'cancelled' ? (
                    <p className="text-center text-sm text-red-500 font-semibold py-1">Order cancelled — no SR actions available.</p>
                  ) : !selected.shiprocket_order_id ? (
                    /* Not pushed yet */
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-500">This order hasn't been pushed to Shiprocket yet.</p>
                      <button onClick={pushToShiprocket} disabled={srPushing}
                        className="w-full bg-zinc-900 text-white py-2.5 rounded-xl text-sm font-bold flex justify-center items-center gap-2 hover:bg-zinc-700 disabled:opacity-50 transition-all">
                        {srPushing
                          ? <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Pushing…</>
                          : <><Truck className="h-4 w-4" /> Push to Shiprocket</>}
                      </button>
                    </div>
                  ) : !selected.awb_code ? (
                    /* Pushed but no AWB */
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                        <p className="text-xs text-zinc-600">Order pushed. Awaiting courier assignment / AWB generation.</p>
                      </div>
                      <button onClick={syncFromShiprocket} disabled={srSyncing}
                        className="w-full border border-zinc-300 text-zinc-700 py-2 rounded-xl text-sm font-semibold flex justify-center items-center gap-2 hover:bg-zinc-50 disabled:opacity-50 transition-all">
                        {srSyncing
                          ? <><span className="h-3.5 w-3.5 rounded-full border-2 border-zinc-300 border-t-zinc-700 animate-spin" />Syncing…</>
                          : <><RefreshCw className="h-3.5 w-3.5" /> Sync AWB from Shiprocket</>}
                      </button>
                    </div>
                  ) : (
                    /* AWB available — show live tracking */
                    <div className="space-y-3">
                      <div className="bg-blue-50 rounded-xl p-3 space-y-1">
                        <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">AWB</p>
                        <p className="font-mono font-bold text-blue-900">{selected.awb_code}</p>
                        {selected.courier_name && <p className="text-xs text-blue-600">{selected.courier_name}</p>}
                      </div>
                      <button onClick={() => fetchSrTracking()} disabled={srTrackLoading}
                        className="w-full border border-zinc-300 text-zinc-700 py-2 rounded-xl text-sm font-semibold flex justify-center items-center gap-2 hover:bg-zinc-50 disabled:opacity-50 transition-all">
                        {srTrackLoading
                          ? <><span className="h-3.5 w-3.5 rounded-full border-2 border-zinc-300 border-t-zinc-700 animate-spin" />Loading…</>
                          : <><RefreshCw className="h-3.5 w-3.5" /> Refresh Live Tracking</>}
                      </button>
                      {srTracking && (
                        <div className="bg-zinc-50 rounded-xl p-3 space-y-1 text-xs">
                          <p className="font-bold text-zinc-800">
                            {srTracking.shipment_status ?? srTracking.current_status ?? 'In Transit'}
                          </p>
                          {srTracking.etd && <p className="text-zinc-500">ETA: {srTracking.etd}</p>}
                          {srTracking.awb_track_url && (
                            <a href={srTracking.awb_track_url} target="_blank" rel="noopener noreferrer"
                               className="flex items-center gap-1 text-blue-600 font-semibold hover:underline">
                              <Link2 className="h-3 w-3" /> Track on courier site
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* ── Manual Status Override ──────────────────────────── */}
              <section className="border border-zinc-200 rounded-2xl overflow-hidden">
                <div className="bg-zinc-50 px-4 py-3 border-b border-zinc-200">
                  <span className="text-xs font-bold text-zinc-700 uppercase tracking-wide">Manual Status Override</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex gap-2">
                    <select
                      value={manualStatus}
                      onChange={e => setManualStatus(e.target.value)}
                      className="flex-1 text-sm rounded-xl border border-zinc-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300 capitalize"
                    >
                      {STATUSES.filter(s => s !== 'all').map(s => (
                        <option key={s} value={s} className="capitalize">{s}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => updateStatus(selected.id, manualStatus)}
                      disabled={!!updatingId || manualStatus === selected.status}
                      className="rounded-xl bg-zinc-900 text-white px-4 py-2 text-sm font-bold hover:bg-zinc-700 disabled:opacity-40 transition-all"
                    >
                      {updatingId ? 'Saving…' : 'Update'}
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    Manual override — Shiprocket webhook may revert automatically.
                    {manualStatus === 'cancelled' && selected.shiprocket_order_id && (
                      <span className="text-red-500 font-semibold"> Will also cancel in SR.</span>
                    )}
                  </p>
                </div>
              </section>

              {/* ── Quick Actions ───────────────────────────────────── */}
              {(selected.status === 'cancelled' && selected.payment_status === 'paid') && (
                <section className="border border-zinc-200 rounded-2xl overflow-hidden">
                  <div className="bg-zinc-50 px-4 py-3 border-b border-zinc-200">
                    <span className="text-xs font-bold text-zinc-700 uppercase tracking-wide">Refund</span>
                  </div>
                  <div className="p-4">
                    <button
                      onClick={() => updateStatus(selected.id, 'refunded')}
                      disabled={!!updatingId}
                      className="w-full bg-amber-50 text-amber-700 border border-amber-200 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-100 disabled:opacity-50 transition-all"
                    >
                      Mark as Refunded
                    </button>
                    <p className="text-[11px] text-zinc-400 text-center mt-2">
                      Process the actual refund via Razorpay dashboard first.
                    </p>
                  </div>
                </section>
              )}

              {/* ── Customer & Address ──────────────────────────────── */}
              <section className="border border-zinc-200 rounded-2xl overflow-hidden">
                <div className="bg-zinc-50 px-4 py-3 border-b border-zinc-200">
                  <span className="text-xs font-bold text-zinc-700 uppercase tracking-wide">Customer</span>
                </div>
                <div className="p-4 space-y-1 text-sm">
                  <p className="font-semibold text-zinc-800">{selected.shipping_address?.full_name}</p>
                  <p className="text-zinc-500">{selected.shipping_address?.phone}</p>
                  <p className="text-zinc-500 text-xs mt-1">
                    {selected.shipping_address?.address_line_1}
                    {selected.shipping_address?.address_line_2 ? `, ${selected.shipping_address.address_line_2}` : ''}<br />
                    {selected.shipping_address?.city}, {selected.shipping_address?.state} — {selected.shipping_address?.postal_code}
                  </p>
                </div>
              </section>

              {/* ── Payment ─────────────────────────────────────────── */}
              <section className="border border-zinc-200 rounded-2xl overflow-hidden">
                <div className="bg-zinc-50 px-4 py-3 border-b border-zinc-200">
                  <span className="text-xs font-bold text-zinc-700 uppercase tracking-wide">Payment</span>
                </div>
                <div className="p-4 text-sm space-y-1.5">
                  <div className="flex justify-between text-zinc-600">
                    <span>Method</span>
                    <span className="font-semibold text-zinc-800 uppercase">{selected.payment_method}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>Status</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PAYMENT_COLORS[selected.payment_status] ?? ''}`}>
                      {selected.payment_status}
                    </span>
                  </div>
                  {selected.coupon_code && (
                    <div className="flex justify-between text-zinc-600">
                      <span>Coupon</span>
                      <span className="font-mono font-bold text-green-700">{selected.coupon_code}</span>
                    </div>
                  )}
                  <div className="border-t border-zinc-100 pt-1.5 space-y-1">
                    <div className="flex justify-between text-zinc-500 text-xs"><span>Subtotal</span><span>{INR(selected.subtotal)}</span></div>
                    {selected.discount > 0 && (
                      <div className="flex justify-between text-green-600 text-xs"><span>Discount</span><span>−{INR(selected.discount)}</span></div>
                    )}
                    <div className="flex justify-between text-zinc-500 text-xs">
                      <span>Shipping</span><span>{selected.shipping > 0 ? INR(selected.shipping) : 'Free'}</span>
                    </div>
                    <div className="flex justify-between text-zinc-500 text-xs"><span>Tax</span><span>{INR(selected.tax)}</span></div>
                    <div className="flex justify-between font-bold text-zinc-900 text-sm pt-1 border-t border-zinc-100">
                      <span>Total</span><span>{INR(selected.total)}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Items ───────────────────────────────────────────── */}
              <section className="border border-zinc-200 rounded-2xl overflow-hidden">
                <div className="bg-zinc-50 px-4 py-3 border-b border-zinc-200">
                  <span className="text-xs font-bold text-zinc-700 uppercase tracking-wide">
                    Items ({selected.items?.length ?? 0})
                  </span>
                </div>
                <div className="divide-y divide-zinc-50">
                  {(selected.items ?? []).map((item: OrderItem) => (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                      {item.product_image
                        ? <img src={item.product_image} alt={item.product_name}
                               className="h-10 w-10 rounded-xl object-cover border border-zinc-100 shrink-0" />
                        : <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0">
                            <Package className="h-4 w-4 text-zinc-400" />
                          </div>}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-800 truncate">{item.product_name}</p>
                        <p className="text-xs text-zinc-400">
                          SKU: {item.product_sku ?? '—'} · Qty: {item.quantity} × {INR(item.price)}
                        </p>
                      </div>
                      <p className="font-bold text-sm text-zinc-800 shrink-0">{INR(item.total)}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Webhook note */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-center">
                <p className="text-[11px] text-zinc-400 flex items-center justify-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  Statuses auto-update via Shiprocket webhook. Manual override available above.
                </p>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}