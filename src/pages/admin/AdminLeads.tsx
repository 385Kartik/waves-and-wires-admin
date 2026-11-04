import { useEffect, useState, useCallback } from 'react';
import {
  Search, RefreshCw, Plus, X, MessageCircle, Phone, Mail,
  CheckCircle, Filter, Trash2, Edit3, UserCheck,
  ShoppingCart, Flame, AlertCircle, ChevronLeft, ChevronRight,
  RotateCw, UserPlus, Users, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { leadService, LeadItem } from '@/services/lead.service';
import { staffService, StaffItem, RoundRobinConfig } from '@/services/staff.service';

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
  const [staffFilter, setStaffFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);

  // Available staff for lead assignment
  const [availableStaff, setAvailableStaff] = useState<StaffItem[]>([]);

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalLead, setEditModalLead] = useState<LeadItem | null>(null);
  const [isRoundRobinModalOpen, setIsRoundRobinModalOpen] = useState(false);

  // Round Robin State
  const [rrConfig, setRrConfig] = useState<RoundRobinConfig>({
    is_enabled: true,
    target_roles: ['executive'],
    order_target_roles: ['manager', 'executive'],
    whatsapp_enabled: true,
    cart_enabled: true,
    signup_enabled: true,
    order_enabled: true,
  });
  const [rrParticipants, setRrParticipants] = useState<any[]>([]);
  const [savingRr, setSavingRr] = useState(false);
  const [reshuffling, setReshuffling] = useState(false);

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
    assigned_to: '',
  });

  // Load available staff
  const loadStaff = useCallback(async () => {
    try {
      const res: any = await staffService.getStaff();
      if (res?.data) setAvailableStaff(res.data);
    } catch {}
  }, []);

  // Load RR config
  const loadRrConfig = useCallback(async () => {
    try {
      const res: any = await staffService.getRoundRobinConfig();
      if (res?.data?.config) setRrConfig(res.data.config);
      if (res?.data?.participants) setRrParticipants(res.data.participants);
    } catch {}
  }, []);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsRes, statsRes]: any = await Promise.all([
        leadService.getLeads({
          search,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          source: sourceFilter !== 'all' ? sourceFilter : undefined,
          assigned_to: staffFilter !== 'all' ? staffFilter : undefined,
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
  }, [search, statusFilter, sourceFilter, staffFilter, page]);

  useEffect(() => {
    loadLeads();
    loadStaff();
    loadRrConfig();

    const interval = setInterval(() => {
      leadService.getLeads({
        search,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        source: sourceFilter !== 'all' ? sourceFilter : undefined,
        assigned_to: staffFilter !== 'all' ? staffFilter : undefined,
        page,
        limit: 50,
      }).then((res: any) => {
        if (res?.data?.leads) {
          setLeads(res.data.leads);
          setTotalPages(res.data.totalPages || 1);
        }
      }).catch(() => {});
      leadService.getLeadStats().then((res: any) => {
        if (res?.data) setStats(res.data);
      }).catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, [loadLeads, loadStaff, loadRrConfig, search, statusFilter, sourceFilter, staffFilter, page]);

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

  // 1-Click Assign Lead
  async function handleAssignLead(leadId: string, assignedTo: string | null) {
    try {
      const res: any = await leadService.assignLead(leadId, assignedTo);
      const updated = res?.data || res;
      setLeads((prev) =>
        prev.map((l) => (l._id === leadId ? { ...l, assigned_to: updated.assigned_to } : l))
      );
      const emp = availableStaff.find((s) => s._id === assignedTo);
      toast.success(assignedTo ? `Lead assigned to ${emp?.full_name || 'Staff'}` : 'Lead unassigned');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update lead assignment');
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
        assigned_to: '',
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
        assigned_to: (editModalLead.assigned_to?._id || editModalLead.assigned_to?.id || null) as any,
      });
      toast.success('Lead updated successfully');
      setEditModalLead(null);
      loadLeads();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update lead');
    }
  }

  // Save Round Robin Config
  const handleSaveRrConfig = async () => {
    setSavingRr(true);
    try {
      await staffService.updateRoundRobinConfig(rrConfig);
      toast.success('Lead Round Robin settings updated');
      setIsRoundRobinModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSavingRr(false);
    }
  };

  // Run Reshuffle
  const handleReshuffleNow = async () => {
    setReshuffling(true);
    try {
      const res: any = await staffService.reshuffleUnassigned();
      toast.success(res?.message || 'Unassigned leads distributed');
      loadLeads();
      loadRrConfig();
    } catch (err: any) {
      toast.error(err.message || 'Reshuffle failed');
    } finally {
      setReshuffling(false);
    }
  };

  function openWhatsAppChat(lead: LeadItem) {
    const raw = lead.phone.replace(/\D/g, '');
    const phone = raw.startsWith('91') && raw.length === 12 ? raw : raw.length === 10 ? `91${raw}` : raw;
    const msg = encodeURIComponent(
      `Hello ${lead.name || 'there'}! 👋\n\nThank you for reaching out to Waves & Wires regarding our Electric Coconut Scraper Model M01.\n\nHow can we help you complete your order today?`
    );
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
              CRM &amp; Leads Management
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              {stats?.total ?? totalLeads} Total Leads
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Real-time leads captured from WhatsApp chats, Add to Cart clicks, Signups, and Orders
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsRoundRobinModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <RotateCw className="h-3.5 w-3.5 text-amber-500" />
            <span>Round Robin Settings</span>
            <span className={`inline-block h-2 w-2 rounded-full ${rrConfig.is_enabled ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300'}`} />
          </button>

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
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 active:scale-[0.98] text-stone-950 text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
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
            {/* Staff Assignment Filter */}
            <select
              value={staffFilter}
              onChange={(e) => {
                setStaffFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-semibold bg-zinc-50 border border-zinc-200 rounded-xl outline-none text-zinc-700 cursor-pointer"
            >
              <option value="all">All Assigned Staff</option>
              <option value="unassigned">— Unassigned Only —</option>
              {availableStaff.map((s) => (
                <option key={s._id} value={s._id}>
                  👤 {s.full_name} ({s.role})
                </option>
              ))}
            </select>

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
          <table className="w-full text-left text-sm min-w-[950px]">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/75 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                <th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5">Phone &amp; Direct Chat</th>
                <th className="px-4 py-3.5">Source</th>
                <th className="px-4 py-3.5 text-center">Quantity</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Assigned To</th>
                <th className="px-4 py-3.5">Notes</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(9)].map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-zinc-100 rounded-md" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
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
                  const assignedEmp = lead.assigned_to;

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
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${src.bg} ${src.color}`}>
                          <SrcIcon className="h-3.5 w-3.5" />
                          <span>{src.label}</span>
                        </span>
                      </td>

                      {/* Quantity */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-zinc-100 text-zinc-800 font-bold text-xs">
                          {lead.quantity} {lead.quantity > 1 ? 'Units' : 'Unit'}
                        </span>
                      </td>

                      {/* Status Dropdown */}
                      <td className="px-4 py-3.5">
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg border outline-none cursor-pointer transition-colors ${st.bg} ${st.color} ${st.border}`}
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

                      {/* Assigned To Column */}
                      <td className="px-4 py-3.5">
                        <div className="relative inline-block text-left">
                          <select
                            value={assignedEmp?._id || assignedEmp?.id || ''}
                            onChange={(e) => handleAssignLead(lead._id, e.target.value || null)}
                            className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border outline-none cursor-pointer transition-all ${
                              assignedEmp
                                ? 'bg-amber-50/70 border-amber-200/80 text-amber-950 hover:bg-amber-100/80'
                                : 'bg-zinc-50 border-dashed border-zinc-300 text-zinc-500 hover:border-zinc-400'
                            }`}
                          >
                            <option value="">— Unassigned —</option>
                            {availableStaff.map((s) => (
                              <option key={s._id} value={s._id}>
                                👤 {s.full_name} ({s.role})
                              </option>
                            ))}
                          </select>
                          {assignedEmp?.designation && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[130px]">
                              {assignedEmp.designation}
                            </p>
                          )}
                        </div>
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
              Showing page <span className="font-bold text-zinc-800">{page}</span> of{' '}
              <span className="font-bold text-zinc-800">{totalPages}</span>
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5 inline mr-1" /> Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                Next <ChevronRight className="h-3.5 w-3.5 inline ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Add Lead ─────────────────────────────────────────────────── */}
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
                <label className="block text-xs font-bold text-zinc-700 mb-1">Assign to Employee</label>
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-semibold bg-zinc-50 border border-zinc-200 rounded-xl outline-none"
                >
                  <option value="">Auto-Assign via Round Robin</option>
                  {availableStaff.map((s) => (
                    <option key={s._id} value={s._id}>
                      👤 {s.full_name} ({s.role})
                    </option>
                  ))}
                </select>
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
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-sm shadow-sm transition-all cursor-pointer"
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

              <div className="grid grid-cols-2 gap-3">
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
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Assigned Employee</label>
                  <select
                    value={editModalLead.assigned_to?._id || editModalLead.assigned_to?.id || ''}
                    onChange={(e) => {
                      const empId = e.target.value;
                      const emp = availableStaff.find((s) => s._id === empId);
                      setEditModalLead({
                        ...editModalLead,
                        assigned_to: emp ? { _id: emp._id, full_name: emp.full_name, email: emp.email, role: emp.role } : null,
                      });
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold bg-zinc-50 border border-zinc-200 rounded-xl outline-none"
                  >
                    <option value="">— Unassigned —</option>
                    {availableStaff.map((s) => (
                      <option key={s._id} value={s._id}>
                        👤 {s.full_name} ({s.role})
                      </option>
                    ))}
                  </select>
                </div>
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
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Round Robin Settings (From CRM Page) ───────────── */}
      {isRoundRobinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white border border-zinc-200 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <RotateCw className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-zinc-900">Lead Round Robin Settings</h2>
                  <p className="text-xs text-zinc-500">Automated leads rotation across executives and managers</p>
                </div>
              </div>
              <button
                onClick={() => setIsRoundRobinModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Master Switch */}
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-zinc-900">Automated Round Robin Engine</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Automatically assign incoming leads from WhatsApp chats, Add-to-Cart events, and signups to active executives
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRrConfig({ ...rrConfig, is_enabled: !rrConfig.is_enabled })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    rrConfig.is_enabled ? 'bg-emerald-500' : 'bg-zinc-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      rrConfig.is_enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Participating Staff List */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-zinc-900">Current Rotation Pool ({rrParticipants.length} Staff)</p>
                  <button
                    type="button"
                    onClick={handleReshuffleNow}
                    disabled={reshuffling}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 text-[11px] font-bold transition-all cursor-pointer"
                  >
                    <RotateCw className={`h-3 w-3 ${reshuffling ? 'animate-spin' : ''}`} />
                    {reshuffling ? 'Reshuffling...' : 'Reshuffle Unassigned Now'}
                  </button>
                </div>

                <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 overflow-hidden">
                  {rrParticipants.map((p) => (
                    <div key={p._id} className="p-3 flex items-center justify-between text-xs bg-white hover:bg-zinc-50">
                      <div>
                        <p className="font-bold text-zinc-900">{p.name}</p>
                        <p className="text-[10px] text-zinc-400">
                          {p.role} • {p.lead_count} total leads • Last assigned: {p.last_lead_assigned ? new Date(p.last_lead_assigned).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        p.can_receive_leads ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {p.can_receive_leads ? 'In Pool' : 'Paused'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-zinc-100 shrink-0 bg-zinc-50/50">
              <button
                type="button"
                onClick={() => setIsRoundRobinModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100 transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveRrConfig}
                disabled={savingRr}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs shadow-sm active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                {savingRr ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
