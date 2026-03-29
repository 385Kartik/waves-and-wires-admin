import { useEffect, useState, useCallback } from 'react';
import { Mail, RefreshCw, CheckCheck, X, Reply, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Message {
  id: string; name: string; email: string;
  subject: string; message: string;
  is_read: boolean; created_at: string;
}

export default function AdminMessages() {
  const [messages,     setMessages]     = useState<Message[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState<Message | null>(null);
  const [filterUnread, setFilterUnread] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { toast.error(error.message); }
    else setMessages(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openMessage(m: Message) {
    setSelected(m);
    if (!m.is_read) {
      await supabase.from('contact_messages').update({ is_read: true }).eq('id', m.id);
      setMessages(prev => prev.map(x => x.id === m.id ? { ...x, is_read: true } : x));
    }
  }

  async function markAllRead() {
    await supabase.from('contact_messages').update({ is_read: true }).eq('is_read', false);
    setMessages(prev => prev.map(m => ({ ...m, is_read: true })));
    toast.success('All messages marked as read');
  }

  async function deleteMessage(id: string) {
    const { error } = await supabase.from('contact_messages').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Message deleted');
    setMessages(prev => prev.filter(m => m.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  const unreadCount = messages.filter(m => !m.is_read).length;
  const filtered    = filterUnread ? messages.filter(m => !m.is_read) : messages;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Messages</h1>
          <p className="text-sm text-zinc-500">{unreadCount} unread of {messages.length}</p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200 rounded-xl px-3.5 py-2 hover:bg-zinc-50 transition-all">
              <CheckCheck className="h-3.5 w-3.5" />Mark All Read
            </button>
          )}
          <button onClick={load}
            className="flex items-center gap-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200 rounded-xl px-3.5 py-2 hover:bg-zinc-50 transition-all">
            <RefreshCw className="h-3.5 w-3.5" />Refresh
          </button>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setFilterUnread(false)}
          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${!filterUnread ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-300'}`}>
          All ({messages.length})
        </button>
        <button onClick={() => setFilterUnread(true)}
          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${filterUnread ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-300'}`}>
          Unread ({unreadCount})
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200/80 overflow-hidden divide-y divide-zinc-50">
        {loading ? [...Array(4)].map((_,i) => (
          <div key={i} className="p-4 space-y-2 animate-pulse">
            <div className="h-3 w-1/3 rounded bg-zinc-100" />
            <div className="h-3 w-2/3 rounded bg-zinc-100" />
          </div>
        )) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="h-10 w-10 text-zinc-200 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">{filterUnread ? 'No unread messages' : 'No messages yet'}</p>
          </div>
        ) : filtered.map(m => (
          <button key={m.id} onClick={() => openMessage(m)}
            className={`w-full flex items-start gap-3.5 p-4 text-left hover:bg-zinc-50 transition-colors ${!m.is_read ? 'bg-amber-50/60' : ''}`}>
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${!m.is_read ? 'bg-primary/10' : 'bg-zinc-100'}`}>
              <Mail className={`h-4 w-4 ${!m.is_read ? 'text-primary' : 'text-zinc-400'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={`text-sm truncate ${!m.is_read ? 'font-bold text-zinc-900' : 'font-semibold text-zinc-700'}`}>{m.name}</p>
                <p className="text-[10px] text-zinc-400 shrink-0">{format(new Date(m.created_at), 'dd MMM')}</p>
              </div>
              <p className={`text-xs truncate mt-0.5 ${!m.is_read ? 'text-zinc-700 font-medium' : 'text-zinc-500'}`}>{m.subject}</p>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5">{m.message}</p>
            </div>
            {!m.is_read && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />}
          </button>
        ))}
      </div>

      {/* Message detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-zinc-900 truncate pr-4">{selected.subject}</h2>
                <p className="text-xs text-zinc-400">{format(new Date(selected.created_at), 'PPp')}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-500 shrink-0"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex-1 p-6 space-y-5">
              <div className="bg-zinc-50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">{selected.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900">{selected.name}</p>
                    <a href={`mailto:${selected.email}`} className="text-xs text-primary hover:underline">{selected.email}</a>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Message</p>
                <div className="bg-white border border-zinc-200 rounded-2xl p-5 text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">
                  {selected.message}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <a href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-zinc-900 hover:bg-zinc-700 text-white text-sm font-semibold px-4 py-2.5 transition-colors">
                  <Reply className="h-4 w-4" />Reply via Email
                </a>
                <button onClick={() => deleteMessage(selected.id)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2.5 text-sm font-semibold transition-colors">
                  <Trash2 className="h-4 w-4" />Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
