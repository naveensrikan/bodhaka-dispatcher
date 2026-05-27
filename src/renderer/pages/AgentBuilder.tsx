import { useCallback, useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Save, Play, ArrowLeft, Loader2 } from 'lucide-react';
import { NodePalette } from '../components/NodePalette';
import { FlowNode } from '../components/FlowNode';
import { NodeInspector } from '../components/NodeInspector';

const nodeTypes = {
  manualTrigger: FlowNode,
  scheduleTrigger: FlowNode,
  knowledgeBase: FlowNode,
  webSearch: FlowNode,
  userInput: FlowNode,
  llmPrompt: FlowNode,
  summarize: FlowNode,
  generateQuiz: FlowNode,
  sendEmail: FlowNode,
  sendWhatsApp: FlowNode,
  displayResult: FlowNode,
};

function BuilderInner() {
  const { id } = useParams();
  const navigate = useNavigate();
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

  const wrapperRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    window.api.knowledge.list().then(setKnowledgeDocs);
    if (!isNew && id) {
      window.api.agents.get(id).then((agent) => {
        if (!agent) return;
        setName(agent.name);
        setDescription(agent.description || '');
        setSchedule(agent.schedule || '');
        setEnabled(agent.enabled);
        setNodes(agent.definition?.nodes || []);
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

  const onNodesChange = useCallback((changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)), []);
  const onEdgesChange = useCallback((changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  const onConnect = useCallback((conn: Connection) => setEdges((eds) => addEdge(conn, eds)), []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: '' },
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition]
  );

  function updateNodeData(nodeId: string, newData: Record<string, any>) {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n))
    );
  }

  async function save() {
    setSaving(true);
    const payload = {
      id: isNew ? undefined : id,
      name,
      description,
      definition: { nodes, edges },
      schedule: schedule || null,
      enabled,
    };
    const result = await window.api.agents.save(payload);
    setSaving(false);
    if (isNew) navigate(`/agents/${result.id}`, { replace: true });
  }

  async function runNow() {
    if (isNew) {
      alert('Save your agent first.');
      return;
    }
    setRunLogs([]);
    setRunning(true);
    await window.api.agents.runNow(id!);
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="h-14 border-b border-ink-700/50 flex items-center gap-3 px-5 bg-ink-900/40 backdrop-blur-md">
        <button onClick={() => navigate('/agents')} className="btn-ghost p-1.5">
          <ArrowLeft size={14} />
        </button>
        <input
          className="flex-1 bg-transparent font-display text-lg outline-none placeholder:text-ink-500"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Agent name"
        />
        <input
          className="input text-xs font-mono w-40"
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
          placeholder="cron: 0 7 * * *"
        />
        <label className="flex items-center gap-1.5 text-xs text-ink-300">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          enabled
        </label>
        <button onClick={runNow} disabled={running || isNew} className="btn-secondary">
          {running ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          Run
        </button>
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
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
          >
            <Background gap={20} size={1} color="#2a2618" />
            <Controls />
            <MiniMap pannable zoomable nodeColor="#736b48" maskColor="rgba(10,9,5,0.7)" />
          </ReactFlow>

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-ink-400">
                <div className="font-display text-2xl mb-2 text-ink-300">Empty canvas</div>
                <div className="text-sm">Drag blocks from the left to start building.</div>
              </div>
            </div>
          )}

          {/* Run logs overlay */}
          {(running || runLogs.length > 0) && (
            <div className="absolute bottom-4 right-4 w-96 max-h-64 overflow-y-auto card p-3 font-mono text-[10px] text-ink-200">
              <div className="text-[10px] uppercase tracking-wider text-ink-400 mb-2 flex items-center justify-between">
                <span>Live execution</span>
                {!running && <button onClick={() => setRunLogs([])} className="text-ink-400 hover:text-ink-100">clear</button>}
              </div>
              {runLogs.map((line, i) => (
                <div key={i} className="leading-relaxed">{line}</div>
              ))}
              {running && <div className="text-accent animate-pulse">running…</div>}
            </div>
          )}
        </div>

        {selected && (
          <NodeInspector
            node={selected}
            knowledgeDocs={knowledgeDocs}
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
