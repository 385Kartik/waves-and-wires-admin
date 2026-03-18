import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface StoreSettings {
  store_name: string;
  store_email: string;
  store_phone: string;       // legacy single phone (kept for compat)
  store_phones: string[];    // new: multiple phones
  currency: string;
  currency_symbol: string;
  free_shipping_above: number;
  tax_rate: number;
  order_prefix: string;
}

const DEFAULTS: StoreSettings = {
  store_name: 'Waves & Wires',
  store_email: 'hello@wavesandwires.com',
  store_phone: '+91 98765 43210',
  store_phones: ['+91 98765 43210'],
  currency: 'INR',
  currency_symbol: '₹',
  free_shipping_above: 999,
  tax_rate: 18,
  order_prefix: 'WW',
};

// Module-level cache so it's fetched once per session
let _cached: StoreSettings | null = null;
let _fetching = false;
const _listeners: Array<(s: StoreSettings) => void> = [];

async function fetchSettings(): Promise<StoreSettings> {
  if (_cached) return _cached;
  if (_fetching) return new Promise(resolve => _listeners.push(resolve));

  _fetching = true;
  const { data } = await supabase.from('store_settings').select('*');
  const s = { ...DEFAULTS };

  (data ?? []).forEach((r: any) => {
    try {
      const raw = r.value;
      // raw is already parsed JSONB from Supabase
      const val = typeof raw === 'object' ? raw : JSON.parse(raw);
      if (r.key === 'store_phones') {
        s.store_phones = Array.isArray(val) ? val : [String(val)];
      } else if (r.key in s) {
        const k = r.key as keyof StoreSettings;
        if (typeof (s as any)[k] === 'number') {
          (s as any)[k] = Number(val);
        } else {
          (s as any)[k] = String(val).replace(/^"|"$/g, '');
        }
      }
    } catch { /* ignore parse errors */ }
  });

  // Sync store_phones with store_phone for backward compat
  if (s.store_phones.length === 0 && s.store_phone) {
    s.store_phones = [s.store_phone];
  }

  _cached = s;
  _fetching = false;
  _listeners.forEach(fn => fn(s));
  _listeners.length = 0;
  return s;
}

// Call this after saving settings to force re-fetch
export function invalidateStoreSettings() {
  _cached = null;
}

export function useStoreSettings() {
  const [settings, setSettings] = useState<StoreSettings>(_cached ?? DEFAULTS);
  const [loading, setLoading] = useState(!_cached);

  useEffect(() => {
    let mounted = true;
    fetchSettings().then(s => {
      if (mounted) { setSettings(s); setLoading(false); }
    });
    return () => { mounted = false; };
  }, []);

  return { settings, loading };
}
