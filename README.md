# Student Agent Builder v0.2

A desktop app for students to build their own AI agents with a visual drag-and-drop canvas.
Bring your own API key, upload study material, and design workflows that run on a schedule
or on-demand — daily chapter summaries, research digests, quiz generators, motivational
nudges, and more.

## What's New in v0.2

- **Native Windows 11 look** — Segoe UI, Fluent colors, light/dark theme toggle
- **Templates gallery** — 4 ready-made agents you can use in one click
- **Run History page** — see every agent run with full logs and outputs
- **Toast notifications** — clear feedback for every action (save, run, error)
- **Fixed PDF upload** — uses native Windows file dialog now
- **Logic nodes** — If/Else and Delay for more sophisticated workflows
- **Web Search node** — uses Anthropic's built-in web search when you're on Claude
- **Better agent inspector** — "use my email" quick-fill, better defaults

## Features

- **BYOK** — bring your own Anthropic or OpenAI API key
- **Knowledge Base** — upload PDFs, DOCX, TXT, MD. Files are chunked, embedded, and searchable locally
- **Visual Agent Builder** — React Flow canvas with categorized building blocks
- **Scheduled Execution** — agents run on cron schedules in the background
- **Real Outputs** — sends real email via your SMTP credentials
- **Local-first** — all data, keys, and embeddings stay on your machine

## Architecture

```
src/
  main/                  # Electron main process (Node.js)
    db/                  # SQLite schema + initialization
    services/            # llm, knowledge, executor, scheduler, email
    ipc/                 # IPC handlers exposed to renderer
    index.ts             # entry point
    preload.ts           # secure bridge to renderer
  renderer/              # React app (the UI)
    pages/               # Dashboard, Configuration, KnowledgeBase, AgentBuilder, MyAgents
    components/          # FlowNode, NodePalette, NodeInspector
    styles/              # Tailwind + custom design tokens
  shared/                # types shared between main and renderer
```

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Run in dev mode (Vite + Electron together)
npm run dev

# 3. Package for Windows
npm run package:win

# 4. Package for macOS (run on a Mac)
npm run package:mac
```

## First Run

1. Open the app → **Configuration**
2. Fill in your name, grade, interests
3. Pick a provider (Anthropic recommended) and paste your API key, click **Test**
4. Add SMTP credentials so agents can email you (for Gmail, create an [app password](https://myaccount.google.com/apppasswords))
5. **Save Changes**
6. Go to **Knowledge Base** → upload a PDF or two of your study material
7. Go to **My Agents → New Agent** → drag a *Schedule Trigger* → *Knowledge Base* → *Summarize* → *Send Email*, connect them, click *Save*, then *Run*

## Stack

- **Electron 33** — desktop shell
- **React 18 + TypeScript** + **Vite** — renderer
- **React Flow (@xyflow/react)** — visual canvas
- **SQLite (better-sqlite3)** — local storage for config, agents, runs, knowledge
- **Tailwind CSS** — styling, with a custom warm-dark "ink" theme
- **OpenAI / Anthropic SDKs** — LLM access
- **node-cron** — scheduling
- **nodemailer** — SMTP email
- **pdf-parse / mammoth** — document extraction

## Roadmap

Next slices to add:

- [ ] WhatsApp output via Twilio
- [ ] Web search node (Brave / Serper / Tavily API)
- [ ] Loop and If/Else logic nodes
- [ ] Google Gemini + Ollama (local model) providers
- [ ] Pre-built agent templates (Daily Briefing, Quiz Generator, Research Digest)
- [ ] Run history viewer with full logs and outputs
- [ ] macOS code signing + auto-update

## License

MIT
