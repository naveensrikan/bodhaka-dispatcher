import { useCallback, useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
  addEdge, applyNodeChanges, applyEdgeChanges, useReactFlow,
  type Node, type Edge, type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Save, Play, ArrowLeft, Loader2, Download, Copy as CopyIcon } from 'lucide-react';
import { NodePalette } from '../components/NodePalette';
import { FlowNode } from '../components/FlowNode';
import { NodeInspector } from '../components/NodeInspector';
import { useToast } from '../components/Toast';

const nodeTypes = {
  manualTrigger: FlowNode, scheduleTrigger: FlowNode,
  knowledgeBase: FlowNode, webSearch: FlowNode, userInput: FlowNode,
  llmPrompt: FlowNode, summarize: FlowNode, generateQuiz: FlowNode,
  ifElse: FlowNode, delay: FlowNode, rememberThis: FlowNode,
  sendEmail: FlowNode, sendWhatsApp: FlowNode, saveToFile: FlowNode, displayResult: FlowNode,
};

function BuilderInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isNew = !id;

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [name, setName] = useState('Untitled Agent');
  const [description, setDescription] = useState('');
  const [schedule, setSchedule] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [selected, setSelected] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [runLogs, setRunLogs] = useState<string[]>([]);
  const [knowledgeDocs, setKnowledgeDocs] = useState<any[]>([]);
  const [defaultEmail, setDefaultEmail] = useState('');
  const [defaultWhatsApp, setDefaultWhatsApp] = useState('');

  const wrapperRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    window.api.knowledge.list().then(setKnowledgeDocs);
    window.api.config.get().then((c) => {
      setDefaultEmail(c.contact?.email || '');
      setDefaultWhatsApp(c.contact?.whatsapp || '');
    });
    if (!isNew && id) {
      window.api.agents.get(id).then((agent) => {
        if (!agent) return;
        setName(agent.name);
        setDescription(agent.description || '');
        setSchedule(agent.schedule || '');
        setEnabled(agent.enabled);
        // Make sure the scheduleTrigger node shows the agent's saved schedule,
        // so the right-side panel always reflects the real timing.
        const loadedNodes = (agent.definition?.nodes || []).map((n: any) => {
          if (n.type === 'scheduleTrigger' && agent.schedule && !n.data?.cron) {
            return { ...n, data: { ...n.data, cron: agent.schedule } };
          }
          return n;
        });
        setNodes(loadedNodes);
        setEdges(agent.definition?.edges || []);
      });
    }
  }, [id]);

  useEffect(() => {
    const unsubscribe = window.api.execution.onRunUpdate((data: any) => {
      if (data.type === 'log') setRunLogs((prev) => [...prev, data.message]);
      if (data.type === 'complete') setRunning(false);
    });
    return unsubscribe;
  }, []);

  // Delete key removes selected nodes/edges
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.key === 'Delete' || ev.key === 'Backspace') && selected && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        setNodes((nds) => nds.filter((n) => n.id !== selected.id));
        setEdges((eds) => eds.filter((e) => e.source !== selected.id && e.target !== selected.id));
        setSelected(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  const onNodesChange = useCallback((changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((conn: Connection) => setEdges((eds) => addEdge(conn, eds)), []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) return;
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const newNode: Node = { id: `${type}-${Date.now()}`, type, position, data: { label: '' } };
    setNodes((nds) => nds.concat(newNode));
  }, [screenToFlowPosition]);

  function updateNodeData(nodeId: string, newData: Record<string, any>) {
    setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n)));
  }

  async function save() {
    if (!name.trim()) { toast.show('Please give your agent a name', 'error'); return; }
    setSaving(true);
    // The schedule is owned by the scheduleTrigger node on the canvas (single
    // source of truth). Derive the agent's schedule from that node's cron so the
    // scheduler always matches what the user configured in the panel.
    const scheduleNode = nodes.find((n) => n.type === 'scheduleTrigger');
    const derivedSchedule = scheduleNode?.data?.cron ? String(scheduleNode.data.cron) : null;
    const payload = { id: isNew ? undefined : id, name, description, definition: { nodes, edges }, schedule: derivedSchedule, enabled };
    try {
      const result = await window.api.agents.save(payload);
      setSchedule(derivedSchedule || '');
      toast.show('Saved', 'success');
      if (isNew) navigate(`/agents/${result.id}`, { replace: true });
    } catch (err: any) {
      toast.show(`Save failed: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function runNow() {
    if (isNew) { toast.show('Save your agent first', 'error'); return; }
    setRunLogs([]);
    setRunning(true);
    toast.show(`Running "${name}"...`, 'info');
    try {
      const result = await window.api.agents.runNow(id!);
      if (result.status === 'success') toast.show('Completed', 'success');
      else toast.show(`Failed: ${result.error || 'check logs'}`, 'error');
    } catch (err: any) {
      toast.show(`Run failed: ${err.message}`, 'error');
      setRunning(false);
    }
  }

  async function exportAgent() {
    if (isNew) { toast.show('Save first to export', 'error'); return; }
    const result = await window.api.agents.export(id!);
    if (result.exported) toast.show(`Exported to ${result.path}`, 'success');
  }

  async function duplicate() {
    if (isNew) return;
    const result = await window.api.agents.duplicate(id!);
    toast.show('Duplicated', 'success');
    navigate(`/agents/${result.id}`);
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 border-b border-border dark:border-border-dark flex items-center gap-2 px-4 bg-bg-layer dark:bg-bg-dark-layer">
        <button onClick={() => navigate('/agents')} className="btn-ghost p-1.5"><ArrowLeft size={14} /></button>
        <input className="flex-1 bg-transparent text-[14px] font-semibold outline-none placeholder:text-text-tertiary" value={name} onChange={(e) => setName(e.target.value)} placeholder="Agent name" />
        <label className="flex items-center gap-1.5 text-[12px] text-text-secondary px-2">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          enabled
        </label>
        {!isNew && (
          <>
            <button onClick={duplicate} className="btn-ghost" title="Duplicate"><CopyIcon size={13} /></button>
            <button onClick={exportAgent} className="btn-ghost" title="Export"><Download size={13} /></button>
          </>
        )}
        <button onClick={runNow} disabled={running || isNew} className="btn-secondary">
          {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
          Run
        </button>
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <NodePalette />

        <div className="flex-1 relative" ref={wrapperRef} onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, n) => setSelected(n)}
            onPaneClick={() => setSelected(null)}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} size={1} />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-text-tertiary">
                <div className="text-base font-semibold mb-1.5 text-text-secondary">Empty canvas</div>
                <div className="text-[13px]">Drag building blocks from the left to start.</div>
                <div className="text-[11px] mt-3 text-text-tertiary">Tip: select a node and press Delete to remove it.</div>
              </div>
            </div>
          )}

          {(running || runLogs.length > 0) && (
            <div className="absolute bottom-4 right-4 w-[420px] max-h-72 overflow-y-auto card p-3 shadow-win-flyout font-mono text-[11px]">
              <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-1.5 flex items-center justify-between">
                <span>Execution Log</span>
                {!running && <button onClick={() => setRunLogs([])} className="hover:text-text-primary">clear</button>}
              </div>
              {runLogs.map((line, i) => (<div key={i} className="leading-relaxed">{line}</div>))}
              {running && <div className="text-accent animate-pulse">running...</div>}
            </div>
          )}
        </div>

        {selected && (
          <NodeInspector
            node={selected}
            agentId={id}
            knowledgeDocs={knowledgeDocs}
            defaultEmail={defaultEmail}
            defaultWhatsApp={defaultWhatsApp}
            onChange={updateNodeData}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}

export function AgentBuilder() {
  return (
    <ReactFlowProvider>
      <BuilderInner />
    </ReactFlowProvider>
  );
}
