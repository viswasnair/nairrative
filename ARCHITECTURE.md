# Architecture

Three diagrams covering different levels of the system.

---

## 1. System Layers

The four runtime tiers and how they connect.

```mermaid
flowchart TD
    subgraph Browser["Browser — React SPA (Vite)"]
        direction TB
        App["App.jsx\n(shell · auth · nav · hook wiring)"]
        subgraph Components["Components"]
            OT["OverviewTab\n8 Recharts charts + KPI cards"]
            LT["LibraryTab\nVirtualized table\n↳ BookshelfTab (cover grid)\n↳ NewReleasesTab"]
            AT["AnalysisTab\n8 AI insight panels"]
            RT["RecsTab\n15 discovery lenses"]
            CT["ChatTab\nConversational assistant"]
            BM["BookModal\nAdd / edit + AI fill"]
            EB["ErrorBoundary\n(per tab)"]
        end
        subgraph Hooks["Hooks"]
            uAuth["useAuth"]
            uBooks["useBooks\n↳ useBookCRUD\n↳ useGenres\n↳ useBookAiFill"]
            uAn["useAnalysis"]
            uRecs["useRecs"]
            uChat["useChat"]
            uFilt["useLibraryFilters"]
        end
        BAC["BookActionsContext\n(save · delete · draft)"]
        AC["AnalysisContext\n(panels · prompts · loading)"]
        RC["RecsContext\n(lenses · series recap)"]
        LFC["LibraryFiltersContext\n(filters · filteredBooks · derived arrays)"]
        subgraph Lib["Lib / Adapters / Constants"]
            aiClient["aiClient.js\ncallAI · AI_MODELS"]
            dbLib["db.js\nall Supabase data calls"]
            authLib["auth.js\ngetSession · signIn · signOut"]
            bookSearchLib["bookSearch.js\nOpenLibrary covers"]
            cache["aiCache.js\n3-layer cache"]
            bookUtils["bookUtils.js\nnormalizeBook · buildBookContext · toRow"]
            prompts["analysisPrompts.js\nrecsPrompts.js"]
            theme["theme.js · config.js · seeds.js"]
            apiConf["api.js\nLLM_URL · claudeHeaders"]
        end
        LS[("localStorage\n(fast cache)")]
    end

    subgraph Vercel["Vercel Edge Function"]
        proxy["api/claude.js\nCORS · JWT verify · rate limit\nmodel allowlist · provider routing"]
        apiUtils["apiUtils.js\ncorsHeaders · verifyJWT · checkRateLimit"]
        providers["providers.js\nAnthropic · OpenAI normalisation"]
        proxy --> apiUtils
        proxy --> providers
    end

    subgraph SupabaseCloud["Supabase"]
        Auth["Auth\n(JWKS endpoint)"]
        subgraph DB["PostgreSQL (RLS on all tables)"]
            T1["books · book_authors · authors · genres"]
            T2["analysis_cache · recs_cache · panel_prompts"]
            T3["new_releases\n(populated by check-releases fn)"]
        end
    end

    subgraph External["External Services"]
        Anthropic["Anthropic API\nclaude-haiku / sonnet / opus"]
        Redis[("Upstash Redis\n30 req / 60 s per user")]
        OL["OpenLibrary\ncover search"]
    end

    App --> Components
    App --> Hooks
    App -->|"provides"| BAC
    BAC -->|"consumed by"| BM
    App -->|"provides"| AC
    AC -->|"consumed by"| AT
    App -->|"provides"| RC
    RC -->|"consumed by"| RT
    App -->|"provides"| LFC
    LFC -->|"consumed by"| LT
    Hooks --> Lib
    Lib --> LS
    aiClient -->|"POST /api/claude\nBearer token"| proxy
    dbLib -->|"Supabase JS client"| DB
    authLib -->|"Supabase JS client"| Auth
    bookSearchLib -->|"HTTPS"| OL
    proxy -->|"JWKS fetch"| Auth
    proxy -->|"rate-limit check"| Redis
    providers -->|"HTTPS"| Anthropic
```

---

## 2. Hook & Component Wiring

How `App.jsx` connects hooks to components.

```mermaid
flowchart LR
    App["App.jsx"]

    subgraph HookTree["Hooks (composed in App.jsx)"]
        uAuth["useAuth\nsession · login · logout"]
        uBooks["useBooks"]
        uGen["useGenres\ngenre list · addGenre · fuzzy UI"]
        uFill["useBookAiFill\nchat-fill · applyPending"]
        uAn["useAnalysis\n8 panels · panel prompts · cache"]
        uRecs["useRecs\n15 lenses · intent inputs · cache"]
        uChat["useChat\nmessages · sendChat"]
        uFilt["useLibraryFilters\n8 filter dims · filteredBooks"]
        uBooks -->|composes| uGen
        uBooks -->|composes| uFill
    end

    subgraph Tabs["Tab Components"]
        OT["OverviewTab"]
        LT["LibraryTab\n↳ BookshelfTab\n↳ NewReleasesTab"]
        AT["AnalysisTab"]
        RT["RecsTab"]
        CT["ChatTab"]
        BM["BookModal\n(via BookActionsContext)"]
    end

    BAC["BookActionsContext"]

    App --> uAuth
    App --> uBooks
    App --> uAn
    App --> uRecs
    App --> uChat
    App --> uFilt

    uAuth -->|"session"| App

    App -->|"books · openModal"| OT
    App -->|"filteredBooks · filters · setFilters"| LT
    App -->|"panels · regenerate · prompts"| AT
    App -->|"lenses · intentInputs · refresh"| RT
    App -->|"messages · sendChat · books"| CT
    App -->|"provides context"| BAC
    BAC -->|"save · delete · draft callbacks"| BM

    LT -->|"uses"| uFilt
```

---

## 3. AI Request & Cache Data Flow

What happens when a hook needs fresh AI output (e.g. recommendations).

```mermaid
sequenceDiagram
    participant C as Component
    participant H as Hook<br/>(useRecs / useAnalysis)
    participant LS as localStorage
    participant SB as Supabase<br/>(recs_cache / analysis_cache)
    participant Edge as /api/claude<br/>(Vercel Edge)
    participant JWKS as Supabase JWKS
    participant Redis as Upstash Redis
    participant AI as Anthropic API

    C->>H: trigger (tab open / refresh / lastAddedAt)
    H->>LS: loadCachedData (fingerprint check)
    alt cache hit & fingerprint matches
        LS-->>H: cached result
    else cache miss
        H->>SB: SELECT data WHERE user_id = ?
        alt Supabase cache hit
            SB-->>H: cached result
            H->>LS: sync to localStorage
        else full miss
            H->>Edge: POST /api/claude<br/>{ model, messages, system, max_tokens }<br/>Authorization: Bearer <token>
            Edge->>JWKS: verify JWT signature
            JWKS-->>Edge: claims (sub, exp)
            Edge->>Redis: INCR rl:{sub} (30 req / 60 s)
            Redis-->>Edge: count OK
            Edge->>AI: forward request (Anthropic format)
            AI-->>Edge: { content: [{ type, text }] }
            Edge-->>H: normalised response
            H->>LS: saveCachedData (fingerprint + result)
            H->>SB: UPSERT ON CONFLICT user_id
        end
    end
    H-->>C: panels / lenses state update
```

> **Fingerprint** — cache key derived from `books.map(b => "${b.id}|${b.title}|${b.year}|${b.genre}").join(",")`.
> Any add, edit, or delete changes the fingerprint and invalidates both caches.
>
> **Sequential pacing** — `useAnalysis` calls the edge function once per panel with an 8-second inter-request delay (`INTER_REQUEST_DELAY_MS`) to respect Anthropic rate limits.
