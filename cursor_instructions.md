# Cursor Instruction File – Disaster Response Coordination Platform

> **Purpose**: Feed this file to Cursor/Windsurf (or similar AI coding tools) and instruct it to "follow the instructions in `cursor_instructions.md`."  The file condenses the assignment, enumerates deliverables, and embeds ready‑to‑use AI prompts so you can ship fast.

---

## 1  Project Overview

Build a backend‑heavy **MERN** stack application that aggregates real‑time data to aid disaster management.  Primary focus: complex backend logic (Node.js + Express + Supabase) with a minimal frontend for testing.

### Key External Services

- **Google Gemini API** – location extraction & image verification
- **Mapping Service** – Google Maps / Mapbox / OpenStreetMap (choose one)
- **Supabase** – Postgres storage, geospatial queries, caching
- **Mock Twitter / Bluesky API** – social‑media reports
- **Browse Page (cheerio)** – official updates scraper

---

## 2  Tech Stack & Tooling

| Layer          | Choice                                               |
| -------------- | ---------------------------------------------------- |
| **Runtime**    | Node 18 +, Express 4 +, Socket.IO                    |
| **Database**   | Supabase (PostgreSQL 14) – PostGIS/GEOGRAPHY enabled |
| **Cache**      | Supabase `cache` table (TTL = 1 h)                   |
| **Frontend**   | Minimal (plain React, Vite, or single HTML)          |
| **AI Helpers** | Cursor Composer / Windsurf Cascade                   |

Set env vars in a local `.env`:

```text
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
MAPBOX_TOKEN=...
TWITTER_BEARER=...        # optional
PORT=3000
```

---

## 3  Database Schema (SQL snippets)

```sql
-- 3.1 disasters
CREATE TABLE disasters (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text    NOT NULL,
  location_name text    NOT NULL,
  location      geography(Point, 4326),
  description   text,
  tags          text[],
  owner_id      uuid,
  created_at    timestamptz DEFAULT now(),
  audit_trail   jsonb      DEFAULT '[]'::jsonb
);
CREATE INDEX disasters_location_idx ON disasters USING GIST (location);
CREATE INDEX disasters_tags_idx     ON disasters USING GIN  (tags);

-- 3.2 reports
CREATE TABLE reports (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disaster_id         uuid REFERENCES disasters(id) ON DELETE CASCADE,
  user_id             uuid,
  content             text,
  image_url           text,
  verification_status text DEFAULT 'pending',
  created_at          timestamptz DEFAULT now()
);

-- 3.3 resources
CREATE TABLE resources (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disaster_id   uuid REFERENCES disasters(id) ON DELETE CASCADE,
  name          text,
  location_name text,
  location      geography(Point, 4326),
  type          text,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX resources_location_idx ON resources USING GIST (location);

-- 3.4 cache
CREATE TABLE cache (
  key         text PRIMARY KEY,
  value       jsonb,
  expires_at  timestamptz
);
```

---

## 4  API Endpoints (REST)

| Verb   | Route                                  | Purpose                       |
| ------ | -------------------------------------- | ----------------------------- |
| POST   | `/disasters`                           | create disaster               |
| GET    | `/disasters?tag=…`                     | list disasters by tag         |
| PUT    | `/disasters/:id`                       | update                        |
| DELETE | `/disasters/:id`                       | delete                        |
| GET    | `/disasters/:id/social-media`          | social‑media feed             |
| GET    | `/disasters/:id/resources?lat=…&lon=…` | nearby resources              |
| GET    | `/disasters/:id/official-updates`      | gov / NGO updates             |
| POST   | `/disasters/:id/verify-image`          | verify image                  |
| POST   | `/geocode`                             | location extraction → lat/lng |

### WebSocket Events

- `disaster_updated`  – CRUD events
- `social_media_updated` – new posts
- `resources_updated` – new/updated resources

---

## 5  Caching Strategy in Supabase

```ts
async function getOrSetCache(key: string, fetcher: () => Promise<any>) {
  const { data } = await supabase
     .from('cache')
     .select('value, expires_at')
     .eq('key', key)
     .single();
  if (data && new Date(data.expires_at) > new Date()) {
    return data.value; // hit
  }
  const fresh = await fetcher();
  await supabase.from('cache').upsert({
     key,
     value: fresh,
     expires_at: new Date(Date.now() + 60 * 60 * 1000)
  });
  return fresh;
}
```

---

## 6  External Integration Patterns

### 6.1 Gemini – Location Extraction

```ts
POST  /geocode
body: { text: "Heavy flooding in Manhattan" }
flow:
 1. call Gemini: prompt `Extract location: {{text}}` → "Manhattan, NYC"
 2. geocode via Mapbox → lat/lon
 3. return { location_name, lat, lon }
```

### 6.2 Gemini – Image Verification

```ts
POST /disasters/:id/verify-image { imageUrl }
→ Gemini: `Analyze image at {{url}} for manipulation`
→ store `verification_status` in `reports`
```

### 6.3 Mock Twitter

If no real API keys, mount `/mock-social-media` returning sample JSON.

---

## 7  Logging & Error Handling

- Use `pino` logger (`pino-pretty` in dev).
- Structured entries: `{ level, msg, module, disasterId?, extra }`.
- Wrap external API calls with retry + exponential back‑off.
- Rate‑limit per‑route (e.g., `express-rate-limit`, 60 req/min).

---

## 8  Minimal Frontend Checklist

- Form ➜ `POST /disasters`
- Table/List ➜ WebSocket subscribe to `disaster_updated`
- Button ➜ fetch `/disasters/:id/social-media` & display
- Provide curl snippets or `fetch()` examples for manual testing.

---

## 9  Suggested Implementation Steps

1. **Bootstrap repo** – `pnpm create vite@latest client`, `npm init -y` server.
2. **Schema migration** – run SQL in Supabase.
3. **Auth mock** – middleware that injects `req.user`.
4. **Core CRUD routes** (`/disasters`).
5. **WebSocket gateway** (Socket.IO).
6. **Supabase cache util**.
7. **Gemini + Mapbox integration**.
8. **Social media adapter** (real or mock).
9. **Resource geospatial lookup**.
10. **Image verification route**.
11. **Minimal React UI**.
12. **Deploy** – Render (backend) & Vercel (frontend).

---

## 10  Ready‑to‑Use Cursor Prompts

Paste these into Cursor’s command palette (`⌘K → Cursor`) and approve the generated diff.

```text
// Create disasters CRUD routes in Express, Supabase client pre‑configured as `supabase`
Generate an Express router for CRUD on "disasters" using Supabase. Include validation with zod and structured logging with pino.
```

```text
// Supabase geospatial query utility
Generate a helper `findNearbyResources(lat, lon, radiusKm)` that queries `resources` with `ST_DWithin`.
```

```text
// Gemini location extraction route
Generate an Express POST route `/geocode` that uses Gemini to extract location names from text and Mapbox to geocode. Cache response in Supabase.
```

```text
// Socket.IO setup
Generate Socket.IO server that emits `disaster_updated`, `social_media_updated`, `resources_updated` events.
```

---

## 11  Assumptions & Shortcuts

- Hard‑coded users `{ id: "u1", role: "admin" }`, `{ id: "u2", role: "contributor" }`.
- Mock social‑media endpoint when real keys unavailable.
- TTL for all cached external calls = 1 h.
- Minimal frontend – no styling mandates.

---

