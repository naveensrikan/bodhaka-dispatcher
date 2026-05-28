import { useEffect, useState } from 'react';
import { Megaphone, RefreshCw } from 'lucide-react';
import { Markdown } from './Markdown';

interface Announcement { id: string; date?: string; text: string }

export function AnnouncementsCard() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await window.api.shell.getAnnouncements();
      setItems(res.items || []);
      setFromCache(!!res.fromCache);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div
      className="rounded-win p-4 mb-6 border"
      style={{ background: '#eef5ff', borderColor: 'rgba(0,0,0,0.08)' }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(30,42,138,0.10)' }}>
            <Megaphone size={13} style={{ color: '#1e2a8a' }} />
          </div>
          <span className="text-[13px] font-bold" style={{ color: '#000000' }}>Announcements</span>
          {fromCache && !loading && (
            <span className="text-[10px]" style={{ color: 'rgba(0,0,0,0.5)' }}>(offline, showing last synced)</span>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          title="Refresh announcements"
          style={{ color: 'rgba(0,0,0,0.55)' }}
          className="hover:opacity-70 transition-opacity"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <p className="text-[12px]" style={{ color: 'rgba(0,0,0,0.55)' }}>Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-[12px]" style={{ color: 'rgba(0,0,0,0.55)' }}>No announcements right now.</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((a) => (
            <li key={a.id} className="text-[12.5px] leading-relaxed flex gap-2" style={{ color: '#000000' }}>
              <span className="mt-[3px] shrink-0" style={{ color: '#1e2a8a' }}>•</span>
              <div className="min-w-0">
                {a.date && <div className="text-[10.5px] mb-0.5" style={{ color: 'rgba(0,0,0,0.5)' }}>{a.date}</div>}
                <Markdown content={a.text} className="announcement-md" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
