# SAS Retrieval Agent Assistant

A custom chatbot UI for **SAS Retrieval Agent Manager (RAM)**, in the SAS corporate
theme and styled identically to the reports repository's Smart Monitoring Assistant (glass panels,
atmospheric bokeh backdrop, Manrope type — skinned in SAS blue #0766d1 / midnight
navy #032954, with the SAS mark). Pick a published agent (or query a collection directly)
from the dropdown in the chat header and converse with it — answers, retrieved source
passages, agent tool calls, and token usage all come from the RAM REST API.

## What it does

- **Agent dropdown** — lists every agent published on your RAM environment
  (`GET /agents`), plus collections for direct retrieval queries (`GET /collections`).
- **Conversations with memory** — each chat maps to a RAM *query session*
  (`querySessionId`), so the agent keeps conversational context across turns.
- **Persistent history** — past query sessions are loaded from RAM
  (`GET /querySessions`) into the "Recent conversations" panel and their messages are
  rebuilt on click (`GET /query?filter=eq(querySessionId,'…')`). The panel is scoped to
  the agent/collection selected in the dropdown, so you only see that target's history.
- **Grounding transparency** — retrieved context passages render as clickable source
  chips, agent tool calls show in a collapsible trace, and token usage/cost appears
  under each answer.
- **Full traceability** — a details-view icon under each answer opens a popup with
  the complete trace: tool calls with inputs/outputs (`GET /toolCalls`), LLM calls
  with prompts, models, and token costs (`GET /llmCalls`), retrieval/RAG calls
  (`GET /retrievalCalls`), and the retrieved passages — all filtered by
  `parentQueryId`, same data as RAM's own details view.
- **Live agent activity** — while a query runs, the typing indicator lists the
  tool/LLM/retrieval calls RAM has recorded so far (the trace endpoints are polled
  alongside the result), so long-running agent queries show what's happening
  instead of just a spinner.
- **Server-side auth** — the FastAPI backend holds the SAS Viya bearer token (static or
  auto-refreshed via SASLogon OAuth) and proxies all RAM calls, so the token never
  reaches the browser and CORS is a non-issue.
- **Interactive maps (TomTom agent)** — when an agent calls the TomTom MCP's
  `tomtom-render-map` tool, the answer renders a pretty, SAS-themed interactive map
  (MapLibre GL) with routes, markers, traffic incidents, and isochrones — Dubai-
  centered and UAE-bounded. See [`docs/tomtom-agent.md`](docs/tomtom-agent.md).

## Architecture

```
Browser (React + Vite + Tailwind — same look as the reports chatbot, SAS theme)
   │  /api/*  (same-origin in prod, Vite proxy in dev)
   ▼
FastAPI backend (token management + thin proxy)
   │  Bearer token
   ▼
SAS Viya — /SASRetrievalAgentManager/api/v1
```

## Quick start (mock mode — no Viya needed)

```bash
# backend
cd backend
pip install -r requirements.txt
RAM_MOCK=true uvicorn main:app --reload --port 8000

# frontend (second terminal)
cd frontend
npm install
npm run dev          # http://localhost:5173, proxies /api to :8000
```

## Connecting to a real RAM deployment

### Standalone RAM (Keycloak auth) — zero configuration

Copy `backend/.env.example` to `backend/.env` and set just:

```bash
RAM_API_URL=https://<ram-host>/SASRetrievalAgentManager/api/v1
RAM_VERIFY_SSL=false   # only if the cert is self-signed
```

Start the app and click **Sign in** in the header. The app runs the OAuth
device code flow (with PKCE) against RAM's pre-configured public client
(`sas-ram-api`): it shows a short code, you open the verification page, log in
with your RAM user, and enter the code. The backend keeps the session alive
with the refresh token. Override `RAM_CLIENT_ID` / `RAM_REALM` if your
deployment differs from the defaults (`sas-ram-api` / `sas-iot`).

### Full SAS Viya, or non-interactive auth

| Variable | Purpose |
|---|---|
| `RAM_API_URL` | `https://<host>/SASRetrievalAgentManager/api/v1` |
| `RAM_TOKEN` | Option A: a static bearer token (quick demos) |
| `SAS_CLIENT_ID` / `SAS_CLIENT_SECRET` | Option B: OAuth client — backend fetches & refreshes tokens itself |
| `SAS_USERNAME` / `SAS_PASSWORD` | Optional: use the password grant to act as a named user |
| `SAS_LOGON_URL` | Token endpoint — defaults to Viya's SASLogon; for standalone RAM use the Keycloak realm's token endpoint |
| `RAM_VERIFY_SSL` | `false` for self-signed certificates |

Getting a quick token for option A on full Viya:

```bash
curl -k https://<viya-host>/SASLogon/oauth/token \
  -d "grant_type=password&username=<user>&password=<pass>" \
  -u "sas.cli:"
```

## Production

```bash
docker build -t ram-chat-ui .
docker run -p 8000:8000 --env-file backend/.env ram-chat-ui
```

The Dockerfile builds the frontend and serves it from the FastAPI app on one port
(same pattern as the Health repo — works on Railway/Render/Fly out of the box).

## Deploying to Railway

The repo is Railway-ready: `railway.json` points at the `Dockerfile`, which builds
the React frontend and serves it from FastAPI on a single `$PORT`. A health check
hits `/api/health`.

**1. Create the service**
- Push this repo to GitHub, then in Railway: **New Project → Deploy from GitHub repo**
  and pick it. Railway auto-detects the Dockerfile — no build config needed.

**2. Set variables** (service **Variables** tab). Two kinds matter here:

| Variable | When it's used | Notes |
|---|---|---|
| `RAM_API_URL` | runtime | `https://<ram-host>/SASRetrievalAgentManager/api/v1` |
| `RAM_VERIFY_SSL` | runtime | `false` only for self-signed certs |
| `VITE_TOMTOM_API_KEY` | **build** | TomTom key for the interactive map tiles — Vite bakes it into the bundle at build time, so it must be set **before/at deploy**, not just at runtime. Restrict the key to your Railway domain. |
| auth (see below) | runtime | how the backend gets a RAM token |

Railway passes service variables to the Docker build as `--build-arg`s automatically,
so setting `VITE_TOMTOM_API_KEY` in the Variables tab is enough for maps to work. If
you change it later, trigger a redeploy (the bundle has to be rebuilt).

**3. Pick an auth model — this matters for a hosted app.** The backend keeps the
RAM token **in memory**, so:

- **Interactive sign-in** (device/code flow) works, but the session lives in the
  container — every redeploy or restart drops it and someone has to click *Sign in*
  again. Fine for a quick demo; annoying for an always-on deployment.
- **Service account (recommended for hosting)** — set `SAS_CLIENT_ID` /
  `SAS_CLIENT_SECRET` (and optionally `SAS_USERNAME` / `SAS_PASSWORD` for a named
  user, plus `SAS_LOGON_URL` for standalone RAM). The backend fetches and refreshes
  the token itself: no sign-in screen, and it survives restarts.

**4. Two caveats to check before you trust the URL**
- **Network reach** — Railway runs in the public cloud, so it must be able to reach
  `RAM_API_URL` over the internet. If RAM/Viya is on a private network or behind a
  VPN/firewall, a public Railway service can't talk to it. Confirm the host is
  reachable from outside first.
- **It's single-session** — the in-memory token is shared by everyone who opens the
  app. Treat the Railway URL as privileged: keep it private, or put Railway's access
  controls / your own auth in front of it. Don't expose a signed-in RAM session to
  the open internet.

**Smoke test without RAM:** set `RAM_MOCK=true` (and nothing else) to confirm the
deploy serves the UI end-to-end against the in-memory mock, then switch to the real
`RAM_API_URL` + auth.

Other platforms (Render, Fly, Cloud Run) work the same way — point them at the
Dockerfile and pass `VITE_TOMTOM_API_KEY` as a build arg plus the runtime vars above.

## What the RAM API supports (and what it doesn't)

Based on the v1 OpenAPI spec:

**Possible**
- Synchronous Q&A against agents (`POST /query` with `agentId`) or collections (`collectionIds`)
- Multi-turn conversations via `querySessionId`
- Listing/reloading past sessions and their full Q&A history
- Inspecting retrieved context, tool calls, LLM calls, and per-query token usage/cost
- Async queries (`synchronous=false`) — this UI always submits asynchronously and polls,
  so slow agent runs can't be killed by gateway timeouts (tune with `RAM_QUERY_TIMEOUT`)
- Source/file management (upload files, tags, trigger re-indexing) — API exists, not surfaced in this UI

**Not possible with the current API**
- **Streaming responses** — no SSE/websocket endpoint; answers arrive in one response,
  so the UI shows a typing indicator instead of token-by-token streaming
- Creating/configuring agents, collections, or LLMs (read-only endpoints; manage them in the RAM web app)
- Renaming or deleting query sessions server-side (rename/delete in this UI is local-only)
- Per-message feedback (thumbs up/down) — no feedback endpoint in v1
