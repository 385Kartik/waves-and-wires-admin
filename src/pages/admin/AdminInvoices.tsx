import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Notebook, RefreshCw, Download, Search, X, Check, Copy,
  Eye, Printer, Filter, AlertCircle, User, Phone, ShoppingBag, ExternalLink,
  CheckCircle2, Clock, Ban, ArrowDownToLine
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/api/client';
import { useAuth } from '@/contexts/AuthContext';

// Helper: Format INR Currency
const formatINR = (val: number | string) => {
  const num = Number(val || 0);
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Copyable item with icon and label matching Numberwale design
function InfoItem({
  label,
  value,
  icon,
  copyable = true,
  prefix = '',
  className = '',
}: {
  label?: string;
  value: string;
  icon?: React.ReactNode;
  copyable?: boolean;
  prefix?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value || value === '—') return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`Copied ${label || 'value'} to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`text-left ${className}`}>
      {label && <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-0.5">{label}</label>}
      <div className="font-semibold text-xs flex items-center text-zinc-800 tracking-tight">
        {icon && <span className="mr-1.5 text-zinc-400">{icon}</span>}
        {prefix && <span className="mr-1 text-zinc-500 font-normal">{prefix}</span>}
        <span className="truncate max-w-[180px] font-mono">{value || '—'}</span>
        {copyable && value && value !== '—' && (
          <button
            type="button"
            onClick={handleCopy}
            className="ml-1.5 p-1 rounded hover:bg-zinc-200/70 transition-colors text-zinc-400 hover:text-zinc-700"
            title={`Copy ${label || value}`}
          >
            {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminInvoices() {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'invoices' | 'creditnotes'>('invoices');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [creditNotes, setCreditNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isExporting, setIsExporting] = useState(false);

  // Fetch Invoices
  const fetchInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: any = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter !== 'all') params.status = statusFilter;

      const res: any = await apiClient.get('/invoices', { params });
      if (res && res.data) {
        setInvoices(res.data);
      } else if (Array.isArray(res)) {
        setInvoices(res);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter]);

  // Fetch Credit Notes
  const fetchCreditNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: any = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter !== 'all') params.refund_status = statusFilter;

      const res: any = await apiClient.get('/credit-notes', { params });
      if (res && res.data) {
        setCreditNotes(res.data);
      } else if (Array.isArray(res)) {
        setCreditNotes(res);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load credit notes');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    if (activeTab === 'invoices') {
      fetchInvoices();
    } else {
      fetchCreditNotes();
    }
  }, [activeTab, fetchInvoices, fetchCreditNotes]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (activeTab === 'invoices') {
      await fetchInvoices();
    } else {
      await fetchCreditNotes();
    }
    setIsRefreshing(false);
    toast.success('Data refreshed successfully');
  };

  const handleViewInvoiceHtml = (invoice: any) => {
    const url = `/api/invoices/order/${invoice.order_number || invoice.order_id}/view`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleViewCreditNoteHtml = (cn: any) => {
    const url = `/api/credit-notes/order/${cn.order_number || cn.order_id}/view`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Export GST Data to CSV
  const handleExportGST = (type: 'invoices' | 'creditnotes' | 'combined') => {
    try {
      setIsExporting(true);
      let csvContent = 'data:text/csv;charset=utf-8,';

      if (type === 'invoices' || type === 'combined') {
        csvContent += 'TYPE,INVOICE_NUMBER,ORDER_NUMBER,DATE,CUSTOMER_NAME,PHONE,STATE,TAXABLE_SUBTOTAL,CGST_9%,SGST_9%,IGST_18%,TOTAL_GST,GRAND_TOTAL,PAYMENT_METHOD,PAYMENT_STATUS\n';
        invoices.forEach((inv) => {
          const f = inv.financials || {};
          const addr = inv.billing_address || {};
          const dateStr = inv.created_at ? new Date(inv.created_at).toISOString().split('T')[0] : '';
          const row = [
            'INVOICE',
            `"${inv.invoice_number}"`,
            `"${inv.order_number}"`,
            `"${dateStr}"`,
            `"${inv.customer_name || ''}"`,
            `"${inv.customer_phone || ''}"`,
            `"${addr.state || ''}"`,
            f.taxable_subtotal || 0,
            f.cgst_amount || 0,
            f.sgst_amount || 0,
            f.igst_amount || 0,
            f.tax_amount || 0,
            f.total || 0,
            `"${inv.payment?.method || ''}"`,
            `"${inv.payment?.status || ''}"`,
          ].join(',');
          csvContent += row + '\n';
        });
      }

      if (type === 'creditnotes' || type === 'combined') {
        if (type === 'creditnotes') {
          csvContent += 'TYPE,CREDIT_NOTE_NUMBER,INVOICE_NUMBER,ORDER_NUMBER,DATE,CUSTOMER_NAME,PHONE,REASON,TAXABLE_SUBTOTAL,REVERSED_GST,TOTAL_CREDIT_AMOUNT,REFUND_STATUS\n';
        }
        creditNotes.forEach((cn) => {
          const f = cn.financials || {};
          const dateStr = cn.issued_at ? new Date(cn.issued_at).toISOString().split('T')[0] : '';
          const row = [
            'CREDIT_NOTE',
            `"${cn.credit_note_number}"`,
            `"${cn.invoice_number || ''}"`,
            `"${cn.order_number || ''}"`,
            `"${dateStr}"`,
            `"${cn.customer_name || ''}"`,
            `"${cn.customer_phone || ''}"`,
            `"${cn.reason || ''}"`,
            f.taxable_subtotal || 0,
            f.tax_amount || 0,
            f.total_credit_amount || 0,
            `"${cn.refund_status || ''}"`,
          ].join(',');
          csvContent += row + '\n';
        });
      }

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `GST_Data_${type}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('GST data exported successfully as CSV');
    } catch (e: any) {
      toast.error('Failed to export GST data: ' + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Top Segmented Tabs matching Numberwale */}
      <div className="bg-zinc-100 p-1.5 rounded-2xl flex items-center gap-1.5 w-fit border border-zinc-200 shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab('invoices')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
            activeTab === 'invoices'
              ? 'bg-white text-zinc-900 shadow-md border border-zinc-200'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
          }`}
        >
          <FileText className="h-4 w-4 text-amber-500" />
          <span>Invoices</span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 ml-1">
            {invoices.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('creditnotes')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
            activeTab === 'creditnotes'
              ? 'bg-white text-zinc-900 shadow-md border border-zinc-200'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50'
          }`}
        >
          <Notebook className="h-4 w-4 text-red-500" />
          <span>Credit Notes</span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 ml-1">
            {creditNotes.length}
          </span>
        </button>
      </div>

      {/* Main Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
              {activeTab === 'invoices' ? 'Invoice Management' : 'Credit Note Management'}
            </h1>
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200">
              FY 26-27 Compliant
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            {activeTab === 'invoices'
              ? 'View, track, print and manage customer GST tax invoices'
              : 'Manage tax reversal credit notes, refund status, and cancellations'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`} />
            Refresh
          </button>

          {/* Export Dropdown */}
          <div className="relative group">
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white transition-all shadow-sm active:scale-95"
            >
              <Download className="h-3.5 w-3.5" />
              Export GST Data
            </button>
            <div className="absolute right-0 top-full mt-1.5 hidden group-hover:block z-30 w-52 bg-white rounded-2xl shadow-xl border border-zinc-200 p-2 text-xs">
              <button
                type="button"
                onClick={() => handleExportGST('combined')}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-100 font-medium text-zinc-700"
              >
                📊 Export Combined GST (CSV)
              </button>
              <button
                type="button"
                onClick={() => handleExportGST('invoices')}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-100 font-medium text-zinc-700"
              >
                📄 Export Invoices Only (CSV)
              </button>
              <button
                type="button"
                onClick={() => handleExportGST('creditnotes')}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-100 font-medium text-zinc-700"
              >
                📑 Export Credit Notes (CSV)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-zinc-200/80 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by number, customer, order, email, or mobile..."
            className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-xs font-bold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="all">All Statuses</option>
            {activeTab === 'invoices' ? (
              <>
                <option value="paid">Paid</option>
                <option value="issued">Issued / Pending</option>
                <option value="credit_note_issued">Credit Note Issued</option>
              </>
            ) : (
              <>
                <option value="not_applicable">COD (No Refund)</option>
                <option value="initiated">Refund Initiated</option>
                <option value="completed">Refund Completed</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="h-9 w-9 rounded-full border-3 border-amber-400 border-t-transparent animate-spin" />
            <p className="text-xs font-semibold text-zinc-500">Loading documents...</p>
          </div>
        ) : activeTab === 'invoices' ? (
          /* INVOICES TABLE */
          invoices.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="bg-zinc-100 p-4 rounded-full w-14 h-14 mx-auto flex items-center justify-center text-zinc-400">
                <FileText className="h-7 w-7" />
              </div>
              <p className="text-sm font-bold text-zinc-800">No invoices found</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {searchQuery
                  ? 'No invoices match your search keyword. Clear the search bar to see all documents.'
                  : 'Invoices will be automatically created whenever orders are placed.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Invoice Number</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Customer mobile no</th>
                    <th className="py-3.5 px-4">Order Number</th>
                    <th className="py-3.5 px-4">Products</th>
                    <th className="py-3.5 px-4">Created</th>
                    <th className="py-3.5 px-4">Updated</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs">
                  {invoices.map((inv) => {
                    const isPaid = inv.payment?.status === 'paid';
                    const isCancelled = inv.status === 'credit_note_issued';
                    const dateCreated = inv.created_at
                      ? new Date(inv.created_at).toLocaleString('en-IN', {
                          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
                        })
                      : '—';
                    const dateUpdated = inv.updated_at
                      ? new Date(inv.updated_at).toLocaleString('en-IN', {
                          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
                        })
                      : dateCreated;

                    return (
                      <tr key={inv._id} className="hover:bg-zinc-50/70 transition-colors">
                        {/* Invoice Number */}
                        <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">
                          <InfoItem label="Invoice" value={inv.invoice_number || '—'} />
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold text-[10px] uppercase">
                              {(inv.customer_name || 'C')[0]}
                            </div>
                            <InfoItem label="Customer" value={inv.customer_name || 'Customer'} />
                          </div>
                        </td>

                        {/* Mobile */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                              <Phone className="h-3.5 w-3.5" />
                            </div>
                            <InfoItem label="Mobile" value={inv.customer_phone || '—'} />
                          </div>
                        </td>

                        {/* Order Number */}
                        <td className="py-3.5 px-4">
                          <InfoItem label="Order" value={inv.order_number || '—'} />
                        </td>

                        {/* Products */}
                        <td className="py-3.5 px-4">
                          <div className="max-w-[200px]">
                            {inv.items && inv.items.length > 0 ? (
                              inv.items.map((it: any, idx: number) => (
                                <InfoItem
                                  key={idx}
                                  label={`Product ${idx + 1}`}
                                  value={it.product_name || 'Electric Coconut Scraper'}
                                />
                              ))
                            ) : (
                              <InfoItem label="Product 1" value="Electric Coconut Scraper Model M01" />
                            )}
                          </div>
                        </td>

                        {/* Created */}
                        <td className="py-3.5 px-4 text-zinc-600 font-mono text-[11px] whitespace-nowrap">
                          {dateCreated}
                        </td>

                        {/* Updated */}
                        <td className="py-3.5 px-4 text-zinc-600 font-mono text-[11px] whitespace-nowrap">
                          {dateUpdated}
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 font-black font-mono text-zinc-900 whitespace-nowrap">
                          <span className="bg-zinc-100 text-zinc-800 px-2.5 py-1 rounded-lg text-xs font-bold border border-zinc-200">
                            {formatINR(inv.financials?.total || 0)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isCancelled ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                              <Ban className="h-3 w-3" />
                              Credit Note Issued
                            </span>
                          ) : isPaid ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" />
                              Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="h-3 w-3" />
                              Pending / COD
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleViewInvoiceHtml(inv)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-sm transition-all active:scale-95"
                              title="View & Print Tax Invoice"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View / Print
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* CREDIT NOTES TABLE */
          creditNotes.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="bg-zinc-100 p-4 rounded-full w-14 h-14 mx-auto flex items-center justify-center text-zinc-400">
                <Notebook className="h-7 w-7" />
              </div>
              <p className="text-sm font-bold text-zinc-800">No credit notes found</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {searchQuery
                  ? 'No credit notes match your search keyword. Clear the search bar to see all documents.'
                  : 'Credit notes are automatically generated when orders are cancelled or returned.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Credit Note #</th>
                    <th className="py-3.5 px-4">Against Invoice</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Customer mobile no</th>
                    <th className="py-3.5 px-4">Order Number</th>
                    <th className="py-3.5 px-4">Reason</th>
                    <th className="py-3.5 px-4">Credit Amount</th>
                    <th className="py-3.5 px-4">Refund Status</th>
                    <th className="py-3.5 px-4">Issued Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs">
                  {creditNotes.map((cn) => {
                    const dateIssued = cn.issued_at
                      ? new Date(cn.issued_at).toLocaleString('en-IN', {
                          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
                        })
                      : '—';

                    return (
                      <tr key={cn._id} className="hover:bg-zinc-50/70 transition-colors">
                        {/* Credit Note Number */}
                        <td className="py-3.5 px-4 font-mono font-bold text-red-600">
                          <InfoItem label="Credit Note" value={cn.credit_note_number || '—'} />
                        </td>

                        {/* Against Invoice */}
                        <td className="py-3.5 px-4 font-mono">
                          <InfoItem label="Invoice" value={cn.invoice_number || '—'} />
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-red-50 text-red-700 flex items-center justify-center font-bold text-[10px] uppercase">
                              {(cn.customer_name || 'C')[0]}
                            </div>
                            <InfoItem label="Customer" value={cn.customer_name || 'Customer'} />
                          </div>
                        </td>

                        {/* Mobile */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                              <Phone className="h-3.5 w-3.5" />
                            </div>
                            <InfoItem label="Mobile" value={cn.customer_phone || '—'} />
                          </div>
                        </td>

                        {/* Order Number */}
                        <td className="py-3.5 px-4">
                          <InfoItem label="Order" value={cn.order_number || '—'} />
                        </td>

                        {/* Reason */}
                        <td className="py-3.5 px-4 max-w-[200px]">
                          <span className="text-zinc-700 truncate block text-xs" title={cn.reason}>
                            {cn.reason || 'Order cancelled'}
                          </span>
                        </td>

                        {/* Credit Amount */}
                        <td className="py-3.5 px-4 font-black font-mono text-red-600 whitespace-nowrap">
                          <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded-lg text-xs font-bold border border-red-200">
                            {formatINR(cn.financials?.total_credit_amount || 0)}
                          </span>
                        </td>

                        {/* Refund Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {cn.refund_status === 'not_applicable' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
                              COD (No Refund)
                            </span>
                          ) : cn.refund_status === 'completed' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" />
                              Refund Done
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <Clock className="h-3 w-3" />
                              Refund Initiated
                            </span>
                          )}
                        </td>

                        {/* Issued Date */}
                        <td className="py-3.5 px-4 text-zinc-600 font-mono text-[11px] whitespace-nowrap">
                          {dateIssued}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleViewCreditNoteHtml(cn)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-sm transition-all active:scale-95"
                            title="View & Print Tax Credit Note"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View / Print
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
