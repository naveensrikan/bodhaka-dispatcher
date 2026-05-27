import { useEffect, useState, useRef } from 'react';
import { Upload, FileText, Trash2, Search, Loader2 } from 'lucide-react';

interface Doc {
  id: string;
  filename: string;
  size_bytes: number;
  chunk_count: number;
  created_at: number;
}

export function KnowledgeBase() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const list = await window.api.knowledge.list();
    setDocs(list);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    // Electron-specific: get file paths
    const paths = Array.from(files).map((f) => (f as any).path).filter(Boolean);
    if (paths.length === 0) {
      alert('Could not read file paths. Make sure you are running in the Electron desktop app.');
      setUploading(false);
      return;
    }
    await window.api.knowledge.upload(paths);
    await refresh();
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function doSearch() {
    if (!query.trim()) return;
    const r = await window.api.knowledge.search(query, 5);
    setResults(r);
  }

  async function deleteDoc(id: string) {
    if (!confirm('Delete this document and all its chunks?')) return;
    await window.api.knowledge.delete(id);
    await refresh();
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="font-display text-3xl tracking-tight">Knowledge Base</h1>
        <p className="text-ink-300 text-sm mt-1">
          Upload textbooks, lecture notes, PDFs, or notes. Agents can read and reason over them.
        </p>
      </header>

      {/* Upload */}
      <div className="card p-6 mb-6 border-dashed border-2 border-ink-700">
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md"
          onChange={handleUpload}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            {uploading ? <Loader2 size={20} className="animate-spin text-accent" /> : <Upload size={20} className="text-accent" />}
          </div>
          <div>
            <div className="font-display text-lg">
              {uploading ? 'Processing…' : 'Add study material'}
            </div>
            <div className="text-xs text-ink-400">PDF · DOCX · TXT · MD — files are chunked and embedded locally</div>
          </div>
        </label>
      </div>

      {/* Search */}
      <div className="card p-4 mb-6">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-ink-800/80 border border-ink-700 rounded-lg px-3">
            <Search size={14} className="text-ink-400" />
            <input
              className="flex-1 bg-transparent py-2 outline-none text-sm"
              placeholder="Search across your knowledge base…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            />
          </div>
          <button onClick={doSearch} className="btn-primary">Search</button>
        </div>
        {results.length > 0 && (
          <div className="mt-4 space-y-2">
            {results.map((r) => (
              <div key={r.id} className="p-3 bg-ink-800/40 rounded-lg border border-ink-700/40">
                <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-1">
                  {r.filename} · score {r.score?.toFixed(3)}
                </div>
                <div className="text-sm text-ink-100 line-clamp-3">{r.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documents list */}
      <h2 className="font-display text-lg tracking-tight mb-3">Indexed Documents ({docs.length})</h2>
      {docs.length === 0 ? (
        <div className="card p-12 text-center text-ink-400 text-sm">No documents yet. Upload something above.</div>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="card p-4 flex items-center gap-4">
              <FileText size={18} className="text-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{d.filename}</div>
                <div className="text-xs text-ink-400 mt-0.5">
                  {(d.size_bytes / 1024).toFixed(1)} KB · {d.chunk_count} chunks · {new Date(d.created_at).toLocaleDateString()}
                </div>
              </div>
              <button onClick={() => deleteDoc(d.id)} className="btn-ghost text-red-400 hover:bg-red-500/10">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
