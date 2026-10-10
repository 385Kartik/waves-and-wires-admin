import { apiClient } from '../api/client';

class QueryBuilder {
  private table: string;
  private method: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private payload: any = null;
  private filters: Record<string, any> = {};
  private neqFilters: Record<string, any> = {};
  private inFilters: Record<string, any[]> = {};
  private notFilters: Array<{ col: string; op: string; val: any }> = [];
  private ilikeFilters: Record<string, string> = {};
  private gteFilters: Record<string, any> = {};
  private lteFilters: Record<string, any> = {};
  private isSingle = false;
  private sortCol: string | null = null;
  private sortAsc = true;
  private limitCount: number | null = null;
  private rangeFrom: number | null = null;
  private rangeTo: number | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(columns = '*', _opts?: { count?: string; head?: boolean }) {
    if (this.method !== 'insert' && this.method !== 'update') {
      this.method = 'select';
    }
    return this;
  }

  eq(col: string, val: any) {
    this.filters[col] = val;
    return this;
  }

  neq(col: string, val: any) {
    this.neqFilters[col] = val;
    return this;
  }

  in(col: string, vals: any[]) {
    this.inFilters[col] = Array.isArray(vals) ? vals : [];
    return this;
  }

  not(col: string, op: string, val: any) {
    this.notFilters.push({ col, op, val });
    return this;
  }

  ilike(col: string, pattern: string) {
    this.ilikeFilters[col] = pattern;
    return this;
  }

  gte(col: string, val: any) {
    this.gteFilters[col] = val;
    return this;
  }

  lte(col: string, val: any) {
    this.lteFilters[col] = val;
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.sortCol = col;
    this.sortAsc = opts?.ascending ?? true;
    return this;
  }

  limit(n: number) {
    this.limitCount = n;
    return this;
  }

  range(from: number, to: number) {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  insert(data: any) {
    this.method = 'insert';
    this.payload = data;
    return this;
  }

  update(data: any) {
    this.method = 'update';
    this.payload = data;
    return this;
  }

  upsert(data: any, _opts?: any) {
    this.method = 'upsert';
    this.payload = data;
    return this;
  }

  delete() {
    this.method = 'delete';
    return this;
  }

  // Maps table name to Express backend route
  private getEndpoint(): string {
    switch (this.table) {
      case 'products':
        return '/products';
      case 'categories':
        return '/categories';
      case 'orders':
        return '/orders';
      case 'coupons':
        return '/admin/coupons';
      case 'store_settings':
        return '/admin/settings';
      case 'admin_dashboard_stats':
        return '/admin/dashboard-stats';
      case 'profiles':
      case 'customers':
        return '/admin/customers';
      case 'refund_requests':
        return '/admin/refunds';
      case 'messages':
      case 'contact_messages':
        return '/admin/messages';
      default:
        return `/${this.table}`;
    }
  }

  private normalizeItem(item: any) {
    if (!item || typeof item !== 'object') return item;
    const normalized: any = {
      ...item,
      id: String(item._id || item.id || ''),
    };
    if (normalized.category_id && typeof normalized.category_id === 'object') {
      normalized.category = normalized.category_id;
      normalized.category_id = String(normalized.category_id._id || normalized.category_id.id || '');
    }
    if (normalized.user_id && typeof normalized.user_id === 'object') {
      normalized.user = normalized.user_id;
      normalized.user_id = String(normalized.user_id._id || normalized.user_id.id || '');
    }
    return normalized;
  }

  private async execute(): Promise<{ data: any; count?: number; error: any }> {
    const endpoint = this.getEndpoint();
    const id = this.filters.id || this.filters._id;

    try {
      let resData: any = null;
      let totalCount = 0;

      if (this.method === 'select') {
        const res: any = await apiClient.get(endpoint, { params: this.filters });
        resData = res?.data?.data !== undefined ? res.data.data : (res?.data !== undefined ? res.data : res);

        // If table is store_settings, convert key-value array or format
        if (this.table === 'store_settings') {
          if (Array.isArray(resData)) {
            resData = resData.map((s) => ({
              id: String(s._id || s.id || s.key),
              key: s.key,
              value: typeof s.value === 'object' ? JSON.stringify(s.value) : String(s.value ?? ''),
            }));
          }
        }

        if (Array.isArray(resData)) {
          resData = resData.map((item) => this.normalizeItem(item));

          // Apply eq filters
          for (const [col, val] of Object.entries(this.filters)) {
            if (val !== undefined && val !== null && val !== '') {
              resData = resData.filter((item: any) => {
                if (item[col] === undefined) return true;
                return String(item[col]) === String(val);
              });
            }
          }

          // Apply neq filters
          for (const [col, val] of Object.entries(this.neqFilters)) {
            resData = resData.filter((item: any) => String(item[col]) !== String(val));
          }

          // Apply in filters
          for (const [col, vals] of Object.entries(this.inFilters)) {
            const strVals = vals.map(String);
            resData = resData.filter((item: any) => strVals.includes(String(item[col])));
          }

          // Apply not filters
          for (const { col, op, val } of this.notFilters) {
            if (op === 'in') {
              const cleaned = String(val)
                .replace(/^[(\[]|[)\]]$/g, '')
                .split(',')
                .map((s) => s.trim().replace(/^["']|["']$/g, ''));
              resData = resData.filter((item: any) => !cleaned.includes(String(item[col])));
            } else {
              resData = resData.filter((item: any) => String(item[col]) !== String(val));
            }
          }

          // Apply ilike filters
          for (const [col, pattern] of Object.entries(this.ilikeFilters)) {
            const needle = String(pattern).replace(/%/g, '').toLowerCase().trim();
            if (needle) {
              resData = resData.filter((item: any) =>
                String(item[col] ?? '').toLowerCase().includes(needle)
              );
            }
          }

          // Apply gte filters
          for (const [col, val] of Object.entries(this.gteFilters)) {
            resData = resData.filter((item: any) => {
              if (!item[col]) return false;
              const a = Date.parse(item[col]);
              const b = Date.parse(val);
              if (!isNaN(a) && !isNaN(b)) return a >= b;
              return item[col] >= val;
            });
          }

          // Apply lte filters
          for (const [col, val] of Object.entries(this.lteFilters)) {
            resData = resData.filter((item: any) => {
              if (!item[col]) return false;
              const a = Date.parse(item[col]);
              const b = Date.parse(val);
              if (!isNaN(a) && !isNaN(b)) return a <= b;
              return item[col] <= val;
            });
          }

          // Apply sorting
          if (this.sortCol) {
            const col = this.sortCol;
            const dir = this.sortAsc ? 1 : -1;
            resData.sort((a: any, b: any) => {
              const va = a[col];
              const vb = b[col];
              if (va === vb) return 0;
              if (va === undefined || va === null) return 1;
              if (vb === undefined || vb === null) return -1;
              return va < vb ? -1 * dir : 1 * dir;
            });
          }

          totalCount = resData.length;

          // Apply range or limit
          if (this.rangeFrom !== null && this.rangeTo !== null) {
            resData = resData.slice(this.rangeFrom, this.rangeTo + 1);
          } else if (this.limitCount !== null) {
            resData = resData.slice(0, this.limitCount);
          }
        } else if (resData && typeof resData === 'object') {
          resData = this.normalizeItem(resData);
          totalCount = 1;
        }

        if (this.isSingle) {
          if (Array.isArray(resData)) {
            resData = resData[0] || null;
          }
        }
      } else if (this.method === 'insert') {
        const body = Array.isArray(this.payload) ? this.payload[0] : this.payload;
        const res: any = await apiClient.post(endpoint, body);
        resData = res?.data?.data !== undefined ? res.data.data : (res?.data !== undefined ? res.data : res);
        if (resData && typeof resData === 'object') {
          resData = this.normalizeItem(resData);
        }
      } else if (this.method === 'update') {
        const url = id ? `${endpoint}/${id}` : endpoint;
        const res: any = await apiClient.put(url, this.payload);
        resData = res?.data?.data !== undefined ? res.data.data : (res?.data !== undefined ? res.data : res);
        if (resData && typeof resData === 'object') {
          resData = this.normalizeItem(resData);
        }
      } else if (this.method === 'upsert') {
        const res: any = await apiClient.put(endpoint, this.payload);
        resData = res?.data?.data !== undefined ? res.data.data : (res?.data !== undefined ? res.data : res);
      } else if (this.method === 'delete') {
        const url = id ? `${endpoint}/${id}` : endpoint;
        const res: any = await apiClient.delete(url);
        resData = res?.data?.data !== undefined ? res.data.data : (res?.data !== undefined ? res.data : res);
      }

      return { data: resData, count: totalCount, error: null };
    } catch (err: any) {
      console.warn(`[SupabaseCompat] Error on ${this.method} ${endpoint}:`, err);
      return { data: null, count: 0, error: { message: err.message || 'API Error' } };
    }
  }

  // Promise interface
  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; count?: number; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

// Storage adapter
const storageAdapter = {
  from(bucket: string) {
    return {
      async upload(filePath: string, file: File) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await apiClient.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          const url = res.data?.data?.url || res.data?.url;
          return { data: { path: url }, error: null };
        } catch (err: any) {
          return { data: null, error: { message: err.message || 'Upload failed' } };
        }
      },
      getPublicUrl(path: string) {
        return { data: { publicUrl: path } };
      }
    };
  }
};

// Auth dummy adapter
const authAdapter = {
  async getSession() {
    return { data: { session: null } };
  },
  onAuthStateChange() {
    return { data: { subscription: { unsubscribe: () => {} } } };
  },
  async signOut() {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {}
  }
};

export const supabase = {
  from(table: string) {
    return new QueryBuilder(table);
  },
  storage: storageAdapter,
  auth: authAdapter,
};

// Global fallback for any un-imported references
if (typeof window !== 'undefined') {
  (window as any).supabase = supabase;
}
