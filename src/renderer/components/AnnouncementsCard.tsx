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
    <div className="card p-4 mb-6">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-brand/10 dark:bg-brand-light/20 flex items-center justify-center shrink-0">
            <Megaphone size={13} className="text-brand dark:text-brand-light" />
          </div>
          <span className="text-[13px] font-semibold text-text-primary dark:text-text-primary-dark">Announcements</span>
          {fromCache && !loading && (
            <span className="text-[10px] text-text-tertiary">(offline, showing last synced)</span>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          title="Refresh announcements"
          className="text-text-tertiary hover:text-text-primary dark:hover:text-text-primary-dark transition-colors"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <p className="text-[12px] text-text-tertiary">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-[12px] text-text-tertiary">No announcements right now.</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((a) => (
            <li key={a.id} className="text-[12.5px] text-text-secondary dark:text-text-secondary-dark leading-relaxed flex gap-2">
              <span className="text-brand dark:text-brand-light mt-[3px] shrink-0">•</span>
              <div className="min-w-0">
                {a.date && <div className="text-[10.5px] text-text-tertiary mb-0.5">{a.date}</div>}
                <Markdown content={a.text} className="announcement-md" />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
