import { useEffect, useState } from 'react';
import { Upload, FileText, Trash2, Search, Loader2, FilePlus } from 'lucide-react';
import { useToast } from '../components/Toast';

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
  const [searching, setSearching] = useState(false);
  const toast = useToast();

  async function refresh() {
    const list = await window.api.knowledge.list();
    setDocs(list);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function pickAndUpload() {
    try {
      const paths = await window.api.dialog.openFiles({
        title: 'Add study material',
        filters: [
          { name: 'Documents', extensions: ['pdf', 'docx', 'txt', 'md'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (!paths || paths.length === 0) return;

      setUploading(true);
      toast.show(`Processing ${paths.length} file${paths.length > 1 ? 's' : ''}...`, 'info');
      const results = await window.api.knowledge.upload(paths);
      await refresh();

      const successful = results.filter((r: any) => !r.error).length;
      const failed = results.filter((r: any) => r.error).length;

      if (successful > 0 && failed === 0) {
        toast.show(`Indexed ${successful} file${successful > 1 ? 's' : ''}`, 'success');
      } else if (successful > 0 && failed > 0) {
        toast.show(`${successful} succeeded, ${failed} failed`, 'info');
      } else {
        toast.show(`Failed to index: ${results[0]?.error || 'unknown error'}`, 'error');
      }
    } catch (err: any) {
      toast.show(`Upload failed: ${err.message}`, 'error');
    } finally {
      setUploading(false);
    }
  }

  async function doSearch() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const r = await window.api.knowledge.search(query, 5);
      setResults(r);
      if (r.length === 0) {
        toast.show('No matches found. Try uploading more material or different keywords.', 'info');
      }
    } catch (err: any) {
      toast.show(`Search failed: ${err.message}`, 'error');
    } finally {
      setSearching(false);
    }
  }

  async function deleteDoc(id: string, name: string) {
    if (!confirm(`Delete "${name}" and all its indexed chunks?`)) return;
    await window.api.knowledge.delete(id);
    await refresh();
    toast.show('Document deleted', 'success');
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge Base</h1>
        <p className="text-text-secondary dark:text-text-secondary-dark text-[13px] mt-1">
          Upload textbooks, lecture notes, or any reference material. Your agents can read and reason over it.
        </p>
      </header>

      {/* Upload card */}
      <div
        onClick={uploading ? undefined : pickAndUpload}
        className={`card p-6 mb-5 border-dashed border-2 ${uploading ? 'opacity-60' : 'cursor-pointer hover:border-accent hover:bg-accent-subtle/30 dark:hover:bg-accent-subtle-dark/30'} transition-all`}
      >
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-win bg-accent-subtle dark:bg-accent-subtle-dark flex items-center justify-center">
            {uploading
              ? <Loader2 size={20} className="animate-spin text-accent" />
              : <Upload size={20} className="text-accent" />
            }
          </div>
          <div className="flex-1">
            <div className="font-semibold text-sm mb-0.5">
              {uploading ? 'Processing files...' : 'Add study material'}
            </div>
            <div className="text-[12px] text-text-secondary dark:text-text-secondary-dark">
              {uploading
                ? 'Extracting text, chunking, and creating embeddings...'
                : 'Click to choose files · PDF, DOCX, TXT, MD'
              }
            </div>
          </div>
          {!uploading && (
            <button className="btn-primary">
              <FilePlus size={14} /> Choose files
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="card p-3 mb-5">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 input">
            <Search size={14} className="text-text-tertiary shrink-0" />
            <input
              className="flex-1 bg-transparent outline-none text-sm"
              placeholder="Search across your knowledge base..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            />
          </div>
          <button onClick={doSearch} disabled={searching || !query.trim()} className="btn-primary">
            {searching ? <Loader2 size={14} className="animate-spin" /> : 'Search'}
          </button>
        </div>
        {results.length > 0 && (
          <div className="mt-3 space-y-2">
            {results.map((r) => (
              <div key={r.id} className="p-3 rounded-win bg-bg-hover dark:bg-bg-dark-subtle border border-border dark:border-border-dark">
                <div className="text-[11px] text-text-tertiary mb-1.5 flex items-center justify-between">
                  <span>{r.filename}</span>
                  <span className="chip">score {r.score?.toFixed(3)}</span>
                </div>
                <div className="text-[13px] line-clamp-3">{r.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm">Indexed Documents</h2>
        <span className="text-[12px] text-text-tertiary">{docs.length} {docs.length === 1 ? 'doc' : 'docs'}</span>
      </div>
      {docs.length === 0 ? (
        <div className="card p-10 text-center text-text-secondary text-sm">
          No documents yet. Upload something above to get started.
        </div>
      ) : (
        <div className="space-y-1.5">
          {docs.map((d) => (
            <div key={d.id} className="card p-3 flex items-center gap-3">
              <FileText size={16} className="text-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[13px] truncate">{d.filename}</div>
                <div className="text-[11px] text-text-tertiary mt-0.5">
                  {(d.size_bytes / 1024).toFixed(1)} KB · {d.chunk_count} chunks · {new Date(d.created_at).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => deleteDoc(d.id, d.filename)}
                className="btn-ghost text-danger hover:bg-danger/10"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
