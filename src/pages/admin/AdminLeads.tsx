import { useEffect, useState, useCallback } from 'react';
import {
  Search, RefreshCw, Plus, X, MessageCircle, Phone, Mail,
  CheckCircle, ArrowUpRight, Filter, Trash2, Edit3, UserCheck,
  ShoppingCart, Flame, AlertCircle, Clock, ChevronLeft, ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { leadService, LeadItem } from '@/services/lead.service';

const STATUS_CONFIG: Record<string, { label: string; color: string; border: string; bg: string }> = {
  new_lead:    { label: 'New Lead',    color: 'text-amber-700',   border: 'border-amber-200',   bg: 'bg-amber-50' },
  contacted:   { label: 'Contacted',   color: 'text-blue-700',    border: 'border-blue-200',    bg: 'bg-blue-50' },
  interested:  { label: 'Interested',  color: 'text-purple-700',  border: 'border-purple-200',  bg: 'bg-purple-50' },
  in_cart:     { label: 'In Cart',     color: 'text-yellow-800',  border: 'border-yellow-300',  bg: 'bg-yellow-100' },
  closed_won:  { label: 'Closed Won',  color: 'text-emerald-700', border: 'border-emerald-200', bg: 'bg-emerald-50' },
  closed_lost: { label: 'Closed Lost', color: 'text-zinc-600',    border: 'border-zinc-200',    bg: 'bg-zinc-100' },
  refund:      { label: 'Refund',      color: 'text-red-700',     border: 'border-red-200',     bg: 'bg-red-50' },
};

const SOURCE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  whatsapp:    { label: 'WhatsApp',    icon: MessageCircle, color: 'text-emerald-700', bg: 'bg-emerald-50' },
  add_to_cart: { label: 'Add to Cart', icon: ShoppingCart,  color: 'text-amber-700',   bg: 'bg-amber-50' },
  signup:      { label: 'Sign Up',     icon: UserCheck,     color: 'text-blue-700',    bg: 'bg-blue-50' },
  manual:      { label: 'Manual/Phone',icon: Phone,         color: 'text-purple-700',  bg: 'bg-purple-50' },
  other:       { label: 'Other',       icon: Flame,         color: 'text-zinc-700',    bg: 'bg-zinc-100' },
};

export default function AdminLeads() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalLead, setEditModalLead] = useState<LeadItem | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'manual',
    quantity: 1,
    product_name: 'Electric Coconut Scraper',
    status: 'new_lead',
    notes: '',
  });

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsRes, statsRes]: any = await Promise.all([
        leadService.getLeads({
          search,
          status: statusFilter,
          source: sourceFilter,
          page,
          limit: 30,
        }),
        leadService.getLeadStats(),
      ]);

      if (leadsRes?.data) {
        setLeads(leadsRes.data.leads || []);
        setTotalLeads(leadsRes.data.total || 0);
        setTotalPages(leadsRes.data.totalPages || 1);
      }
      if (statsRes?.data) {
        setStats(statsRes.data);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sourceFilter, page]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  async function handleStatusChange(id: string, newStatus: string) {
    try {
      await leadService.updateLead(id, { status: newStatus as any });
      setLeads((prev) =>
        prev.map((l) => (l._id === id ? { ...l, status: newStatus as any } : l))
      );
      toast.success(`Status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      leadService.getLeadStats().then((res: any) => {
        if (res?.data) setStats(res.data);
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  }

  async function handleDeleteLead(id: string) {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await leadService.deleteLead(id);
      setLeads((prev) => prev.filter((l) => l._id !== id));
      toast.success('Lead deleted');
      leadService.getLeadStats().then((res: any) => {
        if (res?.data) setStats(res.data);
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete lead');
    }
  }

  async function handleCreateLead(e: React.FormEvent) {
    e.preventDefault();
    try {
      await leadService.createLead(formData);
      toast.success('Lead created successfully');
      setAddModalOpen(false);
      setFormData({
        name: '',
        phone: '',
        email: '',
        source: 'manual',
        quantity: 1,
        product_name: 'Electric Coconut Scraper',
        status: 'new_lead',
        notes: '',
      });
      loadLeads();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create lead');
    }
  }

  async function handleUpdateLead(e: React.FormEvent) {
    e.preventDefault();
    if (!editModalLead) return;
    try {
      await leadService.updateLead(editModalLead._id, {
        name: editModalLead.name,
        phone: editModalLead.phone,
        email: editModalLead.email,
        quantity: editModalLead.quantity,
        status: editModalLead.status,
        notes: editModalLead.notes,
        product_name: editModalLead.product_name,
      });
      toast.success('Lead updated successfully');
      setEditModalLead(null);
      loadLeads();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update lead');
    }
  }

  function openWhatsAppChat(lead: LeadItem) {
    const cleanDigits = lead.phone.replace(/\D/g, '').slice(-10);
    const text = encodeURIComponent(
      `Hello ${lead.name || 'there'}! This is Waves & Wires Technologies. We saw you were interested in our Electric Coconut Scraper (${lead.quantity || 1} Unit). How can we assist you today?`
    );
    window.open(`https://wa.me/91${cleanDigits}?text=${text}`, '_blank');
  }

  return (
    <div className="p-5 sm:p-6 space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2.5">
            <span>CRM &amp; Leads Management</span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
              {totalLeads} Total Leads
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Real-time leads captured from WhatsApp chats, Add to Cart clicks, and Signups
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadLeads()}
            className="px-3.5 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* ── KPI Metric Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Leads</span>
            <Flame className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-zinc-900">{stats?.total ?? totalLeads}</p>
          <p className="text-[10px] text-zinc-400 font-medium">All recorded inquiries</p>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">New Leads</span>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900">{stats?.new_lead ?? 0}</p>
          <p className="text-[10px] text-amber-700/80 font-medium">Needs callback/contact</p>
        </div>

        <div className="p-4 rounded-2xl bg-yellow-50/60 border border-yellow-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-yellow-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">In Cart</span>
            <ShoppingCart className="h-4 w-4 text-yellow-600" />
          </div>
          <p className="text-2xl font-black text-yellow-900">{stats?.in_cart ?? 0}</p>
          <p className="text-[10px] text-yellow-800/80 font-medium">Pending checkout in cart</p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Closed Won</span>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-900">{stats?.closed_won ?? 0}</p>
          <p className="text-[10px] text-emerald-700/80 font-medium">Orders placed / Converted</p>
        </div>

        <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-purple-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pipeline Units</span>
            <ShoppingCart className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-purple-900">{stats?.total_quantity ?? 0}</p>
          <p className="text-[10px] text-purple-700/80 font-medium">Total scrapers interested</p>
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
              placeholder="Search by customer name, phone, email, or notes…"
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all text-zinc-800"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-semibold bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-zinc-700 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="new_lead">New Lead</option>
              <option value="contacted">Contacted</option>
              <option value="interested">Interested</option>
              <option value="in_cart">In Cart</option>
              <option value="closed_won">Closed Won</option>
              <option value="closed_lost">Closed Lost</option>
              <option value="refund">Refund</option>
            </select>

            {/* Source Select */}
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-semibold bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-zinc-700 cursor-pointer"
            >
              <option value="all">All Sources</option>
              <option value="whatsapp">WhatsApp Inquiries</option>
              <option value="add_to_cart">Add to Cart</option>
              <option value="signup">Sign Ups</option>
              <option value="manual">Manual / Offline</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-zinc-100 text-xs">
          <span className="text-[11px] font-bold text-zinc-400 mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Quick Filter:
          </span>
          {['all', 'new_lead', 'in_cart', 'interested', 'closed_won', 'refund'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80'
              }`}
            >
              {st === 'all' ? 'All Leads' : STATUS_CONFIG[st]?.label || st}
            </button>
          ))}
        </div>
      </div>

      {/* ── Leads Table ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[850px]">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/75 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5">Phone &amp; Direct Chat</th>
                <th className="px-4 py-3.5">Source</th>
                <th className="px-4 py-3.5 text-center">Quantity</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Notes</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-zinc-100 rounded-md" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400 mb-3">
                      <UserCheck className="h-6 w-6" />
                    </div>
                    <p className="font-bold text-zinc-800 text-sm">No leads found</p>
                    <p className="text-xs text-zinc-400 mt-0.5">Try adjusting your search or filters.</p>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const src = SOURCE_CONFIG[lead.source] || SOURCE_CONFIG.other;
                  const SrcIcon = src.icon;
                  const st = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new_lead;
                  const cleanPhone = lead.phone.replace(/\D/g, '').slice(-10);

                  return (
                    <tr key={lead._id} className="hover:bg-zinc-50/70 transition-colors">
                      {/* Customer Name & Email */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {(lead.name || 'C').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-zinc-900 text-xs truncate">{lead.name}</p>
                            <p className="text-[11px] text-zinc-400 truncate">
                              {lead.email && !lead.email.endsWith('@ww.internal') ? lead.email : 'No email'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Phone & Direct Chat */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-zinc-800">{lead.phone}</span>
                          {/* Direct WhatsApp launcher */}
                          <button
                            type="button"
                            onClick={() => openWhatsAppChat(lead)}
                            title="Chat on WhatsApp"
                            className="h-7 w-7 rounded-lg bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <MessageCircle className="h-3.5 w-3.5 fill-current" />
                          </button>
                          {/* Direct Call */}
                          <a
                            href={`tel:${lead.phone}`}
                            title="Call customer"
                            className="h-7 w-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${src.bg} ${src.color}`}
                        >
                          <SrcIcon className="h-3 w-3" />
                          <span>{src.label}</span>
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-zinc-100 text-zinc-900 font-black text-xs">
                          {lead.quantity || 1} {lead.quantity === 2 ? 'Units (Combo)' : 'Unit'}
                        </span>
                      </td>

                      {/* Status Dropdown */}
                      <td className="px-4 py-3.5">
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border outline-none cursor-pointer ${st.bg} ${st.color} ${st.border}`}
                        >
                          <option value="new_lead">New Lead</option>
                          <option value="contacted">Contacted</option>
                          <option value="interested">Interested</option>
                          <option value="in_cart">In Cart</option>
                          <option value="closed_won">Closed Won</option>
                          <option value="closed_lost">Closed Lost</option>
                          <option value="refund">Refund</option>
                        </select>
                      </td>

                      {/* Notes */}
                      <td className="px-4 py-3.5 max-w-[200px]">
                        <p
                          className="text-xs text-zinc-600 truncate cursor-pointer hover:text-zinc-900"
                          title={lead.notes || 'Click to edit notes'}
                          onClick={() => setEditModalLead(lead)}
                        >
                          {lead.notes || <span className="text-zinc-300 italic">No notes</span>}
                        </p>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 text-xs text-zinc-400 whitespace-nowrap">
                        {lead.created_at ? format(new Date(lead.created_at), 'dd MMM, hh:mm a') : '—'}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditModalLead(lead)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
                            title="Edit Lead"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLead(lead._id)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete Lead"
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 bg-zinc-50/50">
            <p className="text-xs text-zinc-500">
              Page <span className="font-bold text-zinc-800">{page}</span> of {totalPages}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 disabled:opacity-40 hover:bg-zinc-100 transition-all cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-zinc-200 text-zinc-600 disabled:opacity-40 hover:bg-zinc-100 transition-all cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Add Lead ────────────────────────────────────────────────── */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="font-bold text-base text-zinc-900">Add New CRM Lead</h3>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full px-3.5 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full px-3.5 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ramesh@gmail.com"
                  className="w-full px-3.5 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Source</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs font-semibold bg-zinc-50 border border-zinc-200 rounded-xl outline-none"
                  >
                    <option value="manual">Manual / Phone Inquiry</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="add_to_cart">Add to Cart</option>
                    <option value="signup">Sign Up</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs font-semibold bg-zinc-50 border border-zinc-200 rounded-xl outline-none"
                  >
                    <option value="new_lead">New Lead</option>
                    <option value="contacted">Contacted</option>
                    <option value="interested">Interested</option>
                    <option value="in_cart">In Cart</option>
                    <option value="closed_won">Closed Won</option>
                    <option value="closed_lost">Closed Lost</option>
                    <option value="refund">Refund</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Product</label>
                <input
                  type="text"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Notes / Remarks</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Inquired about delivery to Pune, said will call tomorrow"
                  className="w-full px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400 focus:bg-white resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-sm transition-all cursor-pointer"
              >
                Create Lead
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Edit Lead ───────────────────────────────────────────────── */}
      {editModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="font-bold text-base text-zinc-900">Edit Lead Details</h3>
              <button
                type="button"
                onClick={() => setEditModalLead(null)}
                className="p-1.5 rounded-full hover:bg-zinc-100 text-zinc-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateLead} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={editModalLead.name}
                  onChange={(e) => setEditModalLead({ ...editModalLead, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={editModalLead.phone}
                    onChange={(e) => setEditModalLead({ ...editModalLead, phone: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={editModalLead.quantity}
                    onChange={(e) =>
                      setEditModalLead({ ...editModalLead, quantity: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Status</label>
                <select
                  value={editModalLead.status}
                  onChange={(e) => setEditModalLead({ ...editModalLead, status: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs font-semibold bg-zinc-50 border border-zinc-200 rounded-xl outline-none"
                >
                  <option value="new_lead">New Lead</option>
                  <option value="contacted">Contacted</option>
                  <option value="interested">Interested</option>
                  <option value="in_cart">In Cart</option>
                  <option value="closed_won">Closed Won</option>
                  <option value="closed_lost">Closed Lost</option>
                  <option value="refund">Refund</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Notes / Follow-up Details</label>
                <textarea
                  rows={3}
                  value={editModalLead.notes || ''}
                  onChange={(e) => setEditModalLead({ ...editModalLead, notes: e.target.value })}
                  placeholder="Add notes about customer conversation, delivery preference, etc."
                  className="w-full px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-amber-400 focus:bg-white resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => openWhatsAppChat(editModalLead)}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4 fill-current" />
                  <span>Open WhatsApp</span>
                </button>

                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
