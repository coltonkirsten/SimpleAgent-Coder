# SimpleAgent-Coder

A full-stack agentic coding tool: describe what you want in natural language, and an AI agent reads, writes, and edits code across a project to build it — with the agent's reasoning, tool calls, and file changes streamed live to a web UI.

Built as my **B.S. Computer Engineering capstone at UC Santa Cruz** (2025).

## What it does

SimpleAgent-Coder pairs a Python agent backend with a React chat frontend. You give it an instruction — *"add a login page,"* *"fix this bug,"* *"build a snake game"* — and the agent works in a loop: reading files, writing and editing code, and inspecting results until the task is complete. Every tool call and response streams back to the interface in real time over a WebSocket.

## Architecture

```
frontend/   React 19 chat UI — streams the agent's messages, tool calls, and
            code changes over a WebSocket. Markdown + syntax highlighting, paste-to-screenshot.
backend/    FastAPI + WebSocket server wrapping the agent loop.
  code_agent.py            core read / write / edit-code agent
  agent_developer_tools/   file + project manipulation tools
  project_manager.py       manages the working project environment
  prompts.py               system prompts
  SimpleAgent/             agent framework (git submodule) — the LLM tool-use loop
```

**Backend:** Python · FastAPI · Uvicorn · WebSockets · [LiteLLM](https://github.com/BerriAI/litellm) (provider-agnostic LLM calls) · BeautifulSoup · Pillow
**Frontend:** React 19 · react-markdown · react-syntax-highlighter · html2canvas · react-icons
**Agent core:** built on [SimpleAgent](https://github.com/coltonkirsten/SimpleAgent), my lightweight agent framework.

## How the agent works

1. You send an instruction from the web UI.
2. The agent enters a tool-use loop: read files → write/edit code → inspect results.
3. Each tool call and result streams over the WebSocket and renders in the chat.
4. The loop continues until the task is complete.

## Running locally

This repo uses a git submodule — clone with:

```bash
git clone --recurse-submodules https://github.com/coltonkirsten/SimpleAgent-Coder.git
```

**Backend**
```bash
cd backend
source ./venv_manager.sh on      # create + activate the virtual environment
pip install -r requirements.txt
python main.py                   # starts the FastAPI + WebSocket server
```

**Frontend**
```bash
cd frontend
npm install
npm start                        # http://localhost:3000
```

Set your LLM provider key for the backend via environment variables (LiteLLM reads standard `*_API_KEY` vars).

## Related

- [SimpleAgent](https://github.com/coltonkirsten/SimpleAgent) — the underlying agent framework
- More work at [github.com/coltonkirsten](https://github.com/coltonkirsten)
