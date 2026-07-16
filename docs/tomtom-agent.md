# TomTom Agent — interactive maps in the SAS RAM UI

This is the third agent (after the legal RAG assistant and the SAS data‑science
agent). It gives the agent live geospatial powers — geocoding, routing, traffic
incidents, POIs, isochrones — and renders the result as a **pretty, interactive,
SAS‑themed map** inside this custom UI.

## How it works

```
RAM agent  ──calls──►  TomTom MCP (remote, Streamable HTTP)
                          ├─ data tools: tomtom-geocode / -routing / -traffic / -poi-search / -reachable-range …
                          └─ tomtom-render-map  ──►  normalized map spec  { kind:"tomtom.map", markers, routes, incidents, areas, … }
                                                          │
RAM returns answer + toolCalls  ──►  this UI  ──►  MapCard (MapLibre GL) renders the spec
```

- RAM (and standard MCP clients) can only show text/JSON, which is why the agent
  emits a **spec** via `tomtom-render-map` instead of a picture. The custom UI
  picks the spec out of the tool‑call output (`extractMapSpec`) and draws a live
  map (`MapCard.jsx`) — the same idea as the SAS `render_chart` flow.
- The map is themed to match the UI (pearl/glass chrome, SAS‑blue routes & markers,
  glass popups), defaults to Dubai, and is bounded to the UAE.

## 1. Register the TomTom MCP in RAM

Self‑host the TomTom MCP (`tomtom-maps-mcp`, HTTP mode) and add it in RAM as a
**Remote MCP server**, transport **Streamable HTTP** — exactly like the SAS MCP:

- **URL:** `http://<tomtom-mcp-host>:<port>/mcp`
- **Auth:** API Key or None
- Server env: `TOMTOM_API_KEY=<key>`, and `MAPS=tomtom-orbis-maps` for the richer
  Orbis tool set (EV routing, search‑along‑route, area‑search, data‑viz) or leave
  default for standard TomTom Maps. `tomtom-render-map` is available on **both**.

## 2. Scope the agent to Dubai / UAE

Two layers (both already biased to the UAE):

1. **Server‑side** — `tomtom-render-map` defaults the map view to Dubai and bounds
   it to the UAE.
2. **Agent prompt** — add to the agent's system prompt so the data tools stay in
   region:

   > You are an RTA mobility assistant for Dubai and the UAE. When calling TomTom
   > search/geocoding tools, restrict results to the UAE (`countrySet=ARE`) and bias
   > toward Dubai. After gathering coordinates/routes/incidents, **always call
   > `tomtom-render-map`** to show the result as an interactive map. Prefer it over
   > `tomtom-static-map` / `tomtom-dynamic-map`.

## 3. Configure the UI map

Copy `frontend/.env.example` → `frontend/.env.local` and set:

- `VITE_TOMTOM_API_KEY` — browser key for map + traffic tiles (domain‑restrict it).
- `VITE_MAP_STYLE_URL` *(optional)* — a TomTom vector style for 3D buildings / full
  theming. Without it the map uses a clean light TomTom raster basemap.

## 4. Try it without a live agent (mock mode)

```bash
cd backend  && RAM_MOCK=true uvicorn main:app --reload --port 8000
cd frontend && npm install && npm run dev
```

Ask the mock anything map‑related ("route from Burj Khalifa to Dubai Marina",
"traffic near Downtown") and the UI renders the sample Dubai map (route + markers +
incident + traffic toggle). Set `VITE_TOMTOM_API_KEY` to see the basemap tiles.
