import { useEffect, useState } from 'react';
import { Download, Loader2, Sparkles } from 'lucide-react';

export function UpdateBanner() {
  const [available, setAvailable] = useState<{ version: string; notes?: string } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const offAvail = window.api.update.onAvailable((info) => setAvailable(info));
    const offProg = window.api.update.onProgress((pct) => setProgress(pct));
    const offDone = window.api.update.onDownloaded(() => { /* app will quit+install */ });
    return () => { offAvail(); offProg(); offDone(); };
  }, []);

  async function doUpdate() {
    setDownloading(true);
    await window.api.update.download();
    // When finished, main process auto-installs and relaunches.
  }

  if (!available) return null;

  return (
    <div className="mx-4 mt-3 rounded-win overflow-hidden border-2 border-gold shadow-lg">
      <div className="bg-gradient-to-r from-brand to-brand-light px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
          <Sparkles size={18} className="text-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-[14px]">
            A new version of Bodhaka Forge is available (v{available.version})
          </div>
          <div className="text-white/80 text-[12px]">
            {downloading
              ? `Downloading… ${progress}% (the app will restart automatically when ready)`
              : 'Click Update to download and install it automatically.'}
          </div>
        </div>
        {downloading ? (
          <div className="flex items-center gap-2 text-white text-[13px] font-medium px-3">
            <Loader2 size={15} className="animate-spin" /> {progress}%
          </div>
        ) : (
          <button
            onClick={doUpdate}
            className="bg-gold text-brand-dark font-semibold text-[13px] px-4 py-2 rounded-win hover:brightness-105 flex items-center gap-1.5 shrink-0"
          >
            <Download size={15} /> Update now
          </button>
        )}
      </div>
    </div>
  );
}
