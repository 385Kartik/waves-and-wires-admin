import { useEffect, useState } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Settings {
  store_name: string; store_email: string; store_phone: string;
  store_phones: string[]; currency: string; currency_symbol: string;
  free_shipping_above: number; tax_rate: number; order_prefix: string;
}
const DEFAULTS: Settings = {
  store_name: 'Waves & Wires', store_email: 'hello@wavesandwires.com',
  store_phone: '+91 98765 43210', store_phones: ['+91 98765 43210'],
  currency: 'INR', currency_symbol: '₹', free_shipping_above: 999, tax_rate: 18, order_prefix: 'WW',
};

const inputCls = "w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all";

function Field({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 block">{label}</label>
      {children}
      {note && <p className="text-xs text-zinc-400 mt-1">{note}</p>}
    </div>
  );
}

export default function AdminSettings() {
  const [s,       setS]       = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [tab,     setTab]     = useState<'general'|'shipping'|'access'>('general');

  useEffect(() => {
    supabase.from('store_settings').select('*').then(({ data }) => {
      if (data) {
        const m = { ...DEFAULTS };
        data.forEach((r: any) => {
          try {
            const raw = r.value;
            const val = typeof raw === 'object' ? raw : JSON.parse(raw);
            if (r.key === 'store_phones') {
              m.store_phones = Array.isArray(val) ? val : [String(val).replace(/^"|"$/g, '')];
            } else if (r.key in m) {
              const k = r.key as keyof Settings;
              if (typeof (m as any)[k] === 'number') (m as any)[k] = Number(val);
              else (m as any)[k] = String(val).replace(/^"|"$/g, '');
            }
          } catch { /* skip bad rows */ }
        });
        setS(m);
      }
      setLoading(false);
    });
  }, []);

  async function save() {
    setSaving(true);
    // Build upsert rows — store_phones as JSON array, others as before
    const rows = [
      ...Object.entries(s)
        .filter(([k]) => k !== 'store_phones')
        .map(([key, value]) => ({
          key, value: typeof value === 'number' ? value : JSON.stringify(value),
          updated_at: new Date().toISOString(),
        })),
      {
        key: 'store_phones',
        value: s.store_phones.filter(p => p.trim()),
        updated_at: new Date().toISOString(),
      },
    ];
    const { error } = await supabase.from('store_settings').upsert(rows, { onConflict: 'key' });
    if (error) toast.error(error.message);
    else toast.success('Settings saved! Footer & contact page will update automatically.');
    setSaving(false);
  }

  function addPhone() {
    setS(prev => ({ ...prev, store_phones: [...prev.store_phones, ''] }));
  }
  function updatePhone(i: number, val: string) {
    setS(prev => ({ ...prev, store_phones: prev.store_phones.map((p, idx) => idx === i ? val : p) }));
  }
  function removePhone(i: number) {
    setS(prev => ({ ...prev, store_phones: prev.store_phones.filter((_, idx) => idx !== i) }));
  }

  if (loading) return (
    <div className="p-6 space-y-4">
      {[...Array(3)].map((_,i) => <div key={i} className="h-32 rounded-2xl bg-zinc-100 animate-pulse" />)}
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-xl font-bold text-zinc-900">Settings</h1><p className="text-sm text-zinc-500">Configure your store</p></div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm shadow-orange-200">
          <Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <div className="flex gap-1.5 bg-white border border-zinc-200 rounded-xl p-1 w-fit">
        {(['general','shipping','access'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${tab === t ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}>{t}</button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 space-y-5">
          <h2 className="text-sm font-bold text-zinc-800">Store Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Store Name"><input value={s.store_name} onChange={e => setS(p => ({ ...p, store_name: e.target.value }))} className={inputCls} /></Field>
            </div>
            <Field label="Contact Email">
              <input type="email" value={s.store_email} onChange={e => setS(p => ({ ...p, store_email: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="Order Prefix" note="e.g. WW → WW-0000001">
              <input value={s.order_prefix} onChange={e => setS(p => ({ ...p, order_prefix: e.target.value }))} className={inputCls} />
            </Field>
            <div className="sm:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Contact Phone Numbers</label>
                <button onClick={addPhone}
                  className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg transition-colors">
                  <Plus className="h-3.5 w-3.5" />Add Number
                </button>
              </div>
              {s.store_phones.map((phone, i) => (
                <div key={i} className="flex gap-2">
                  <input value={phone} onChange={e => updatePhone(i, e.target.value)}
                    placeholder="+91 98765 43210" className={`${inputCls} flex-1`} />
                  {s.store_phones.length > 1 && (
                    <button onClick={() => removePhone(i)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <p className="text-xs text-zinc-400">These numbers appear in the footer and contact page. All are clickable on mobile.</p>
            </div>
            <Field label="Currency Code"><input value={s.currency} onChange={e => setS(p => ({ ...p, currency: e.target.value }))} className={inputCls} /></Field>
            <Field label="Currency Symbol"><input value={s.currency_symbol} onChange={e => setS(p => ({ ...p, currency_symbol: e.target.value }))} className={inputCls} /></Field>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
            💡 Changes to email and phone numbers will automatically reflect in the Footer and Contact page after saving.
          </div>
        </div>
      )}

      {tab === 'shipping' && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 space-y-5">
          <h2 className="text-sm font-bold text-zinc-800">Shipping & Tax</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Free Shipping Above (₹)" note="Set 0 to disable free shipping threshold">
              <input type="number" min={0} value={s.free_shipping_above} onChange={e => setS(p => ({ ...p, free_shipping_above: parseFloat(e.target.value) || 0 }))} className={inputCls} />
            </Field>
            <Field label="GST Rate (%)" note="Applied as percentage on (subtotal - discount)">
              <input type="number" min={0} max={100} value={s.tax_rate} onChange={e => setS(p => ({ ...p, tax_rate: parseFloat(e.target.value) || 0 }))} className={inputCls} />
            </Field>
          </div>
        </div>
      )}

      {tab === 'access' && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-5 sm:p-6 space-y-4">
          <h2 className="text-sm font-bold text-zinc-800">Admin Access</h2>
          <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 text-sm text-zinc-600 space-y-2">
            <p>To grant admin access to a user, run this in your Supabase SQL Editor:</p>
            <pre className="bg-zinc-900 text-green-400 rounded-lg p-3 text-xs overflow-x-auto mt-2 select-all">
{`UPDATE public.profiles
SET is_admin = TRUE
WHERE id = (
  SELECT id FROM auth.users
  WHERE email = 'user@example.com'
);`}
            </pre>
            <p>Replace <code className="bg-zinc-200 px-1 rounded text-xs">user@example.com</code> with the user's actual email address.</p>
          </div>
        </div>
      )}
    </div>
  );
}
