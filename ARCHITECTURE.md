# Cinely: System Architecture & Subsystems Specification

## 1. High-Level System Architecture (V1 Modular Monolith)

Cinely V1 is architected as a **Modular Monolith** in TypeScript / Fastify. External stream and catalog discovery is exclusively powered by the **Stremio Addon Ecosystem**, managed through a generic adapter layer, an Addon Registry, and an Addon Health Engine.

```mermaid
graph TD
    subgraph Clients ["Client Applications"]
        Web[Web Client - Settings -> Addons UI]
        Mobile[Mobile iOS/Android]
        TV[Smart TV / AppleTV]
        PlayerSDK[Cinely Headless Player SDK]
    end

    subgraph GatewayLayer ["API Gateway & Edge Layer"]
        Gateway[Fastify HTTP Gateway / Auth Middleware]
        SSEHub[SSE Realtime Hub - Fallback & Catalog Updates]
    end

    subgraph CoreEngine ["Cinely Media Engine (Modular Monolith Core)"]
        MetaNorm[1. Metadata Normalization Engine]
        AddonReg[2. Addon Registry & Catalog Sync Engine]
        GenericAdapter[3. Generic StremioAddonAdapter Framework]
        StreamNorm[4. Two-Tier Stream Aggregator across Addons]
        HealthEngine[5. First-Class Addon Health Engine]
        RankEngine[6. Health-Weighted Ranking Engine]
        SessionMgr[7. Playback Session & Fallback Orchestrator]
        Vault[8. User Addon Preferences & Versioned Config Vault]
    end

    subgraph StorageLayer ["Persistence & Caching"]
        RDBMS[(Relational DB: PostgreSQL 16)]
        CacheStore[(Fast Cache: Redis / Valkey 7)]
    end

    subgraph StremioEcosystem ["External Stremio Addon Network"]
        AddonCatalogNet["Stremio Addons Catalog (stremio-addons.net)"]
        EnabledAddon1["User-Enabled Addon 1 (Streams)"]
        EnabledAddon2["User-Enabled Addon 2 (Subtitles)"]
        EnabledAddonN["User-Enabled Addon N (Catalogs/Meta)"]
    end

    Clients -->|HTTPS / WSS| GatewayLayer
    GatewayLayer --> CoreEngine
    CoreEngine <--> StorageLayer
    AddonReg <-->|Periodic Sync / Discovery| AddonCatalogNet
    GenericAdapter -->|Stremio v3 Protocol| EnabledAddon1
    GenericAdapter -->|Stremio v3 Protocol| EnabledAddon2
    GenericAdapter -->|Stremio v3 Protocol| EnabledAddonN
```

---

## 2. Core Media Engine Subsystems

### 2.1 Subsystem 1: Metadata Normalization Engine
- **Purpose**: Normalizes metadata from authoritative catalogs (TMDB, TVMaze) and metadata-capable Stremio addons into uniform **Canonical Media Entities**.
- **Canonical Model**: Standardized URN (`cinely:item:mov_894721`), localized titles, release years, certifications, credits, seasons, episodes, and external ID mappings (`tmdb:`, `tt` IMDb, `kitsu:`).

### 2.2 Subsystem 2: Addon Registry & Catalog Sync Engine
- **Purpose**: Synchronizes, indexes, and manages available Stremio addons from `https://stremio-addons.net/addons`.
- **Authentic Taxonomy Preservation**:
  - Mirrors exact 16 categories (`anime`, `asian drama`, `bollywood`, `debrid support`, `http streams`, `live tv`, `metadata`, `misc`, `movies`, `music`, `nsfw`, `radios`, `subtitles`, `torrents`, `tv shows`, `usenet`).
  - Mirrors exact sort options (`popular`, `new`, `updatedAt`).
- **Dynamic Catalog Fetching**: Addons are fetched dynamically via catalog sync workers and cached with ETags; no hundreds of hard-coded addon URLs.

### 2.3 Subsystem 3: Generic `StremioAddonAdapter` Framework
- **Purpose**: Provides a universal, provider-agnostic implementation of the Stremio Addon Protocol v3.
- **Strict Anti-Branching Guarantee**: The adapter contains **zero provider-specific conditional branches** (e.g. no `if (torrentio)` or `if (comet)`). All behavior is driven purely by the addon's manifest:
  ```
  StremioAddonAdapter ──► Fetches Manifest (/manifest.json)
                              │
                              ├──► Inspects Declared Resources (catalog, meta, stream, subtitles)
                              ├──► Inspects Supported Types (movie, series, anime, etc.)
                              ├──► Inspects ID Prefixes (tt, tmdb:, kitsu:)
                              └──► Dispatches Resource Request (/<resource>/<type>/<id>[/<extra>].json)
  ```
- **Capability-Driven Execution**: Cinely only invokes resources (`stream`, `subtitles`, `meta`, `catalog`) explicitly declared in the addon's manifest.

### 2.4 Subsystem 4: Two-Tier Stream Aggregation Pipeline
- **Purpose**: Concurrently queries **user-enabled Stremio addons** that declare the `stream` resource for the requested media type and ID prefix:
  1. **Fast-Resolution Window (2.5 seconds)**: Gathers responses from all addons responding within 2.5s. Available streams are normalized, scored, and served immediately to start playback.
  2. **Hard Resolution Ceiling (5.0–8.0 seconds)**: Slower addons continue resolving in the background. Newly arrived candidates are merged into the Redis session fallback queue and broadcast via SSE.
  3. **Abort Signal**: Any addon call exceeding 8.0s is aborted via `AbortSignal`.

### 2.5 Subsystem 5: First-Class Addon Health Engine
- **Purpose**: Continuously monitors addon reliability, latency, and error budgets across all requests and player heartbeats.
- **Tracked Metrics per Addon**:
  - Sliding window success rate ($W_{\text{60s}}, W_{\text{15m}}, W_{\text{24h}}$).
  - Latency percentiles ($p_{50}, p_{95}, p_{99}$).
  - Error rate and circuit breaker states (`CLOSED`, `OPEN`, `HALF_OPEN`).
  - Playback stall and failure reports from client heartbeats.
- **Dynamic Ranking Integration**: Computes an active Addon Health Score $H_{\text{addon}} \in [0.0, 1.0]$ feeding directly into candidate ranking.

### 2.6 Subsystem 6: Playback Session & Fallback Orchestrator
- **Purpose**: Manages active playback leases and coordinates automated fallback across addon stream candidates.
- **Measurable Fallback Targets**:
  - Detection Latency ($T_{\text{detect}}$): $< 2,000\text{ms}$ (stall) / $< 100\text{ms}$ (fatal error).
  - Fallback Resolution Latency ($T_{\text{resolve}}$): $< 250\text{ms}$ (p95) from session cache.
  - Playback Resume Latency ($T_{\text{resume}}$): $< 1,500\text{ms}$ (p95).
  - Resume Position Delta ($\Delta_{\text{pos}}$): $\le 1.0\text{s}$.

### 2.7 Subsystem 7: User Addon Preferences & Versioned Configuration Vault
- **Purpose**: Persists user-selected addon toggles and encrypted custom addon configurations.
- **User Control Model**:
  - User explicitly enables/disables any addon.
  - Addon configuration parameters (e.g. Debrid API keys, stream resolution filters, custom transport URLs) are encrypted at rest using versioned AES-256-GCM.
  - Default addons are fully visible and can be toggled OFF or reset at any time.

---

## 3. End-to-End Sequence: Addon Stream Resolution & Resilient Fallback

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Headless Player SDK
    participant GW as API Gateway
    participant Eng as Media Engine
    participant AddonA as Enabled Stremio Addon A (Streams)
    participant AddonB as Enabled Stremio Addon B (Streams)
    participant Health as Addon Health Engine
    participant Cache as Redis Session Cache

    User->>GW: POST /v1/playback/resolve (canonical_id: "tt1492048")
    GW->>Eng: Resolve Stream via User-Enabled Addons
    par Query Enabled Stream Addons Concurrently
        Eng->>AddonA: GET /stream/movie/tt1492048.json [Signal: 2.5s]
        Eng->>AddonB: GET /stream/movie/tt1492048.json [Signal: 8.0s]
    end
    AddonA-->>Eng: Returns Streams (at 1.1s)
    Note over Eng: 2.5s Fast Window Deadline Reached
    Eng->>Health: Get Addon Health Scores (AddonA: 0.99, AddonB: Pending)
    Eng->>Eng: Normalize & Rank Streams from AddonA
    Eng->>Cache: Save Session & Primary Candidate (from AddonA)
    Eng-->>User: 200 OK (Primary Stream, SessionToken, PendingCeiling: true)
    
    User->>User: Player SDK begins buffering & playing Primary Stream
    
    Note over Eng,AddonB: Background resolution completes at 3.8s
    AddonB-->>Eng: Returns Streams
    Eng->>Eng: Normalize & Rank Streams from AddonB
    Eng->>Cache: Append AddonB Candidates to Fallback Queue
    Eng-->>User: SSE Event: CANDIDATE_QUEUE_UPDATED (FallbackCount: +3)

    Note over User: AddonA stream dies mid-playback (HTTP 502 / Buffer Stall)
    User->>User: Detect stream failure (T_detect = 90ms)
    User->>GW: POST /v1/playback/session/{id}/fallback (position: 00:32:15, cand_A, HTTP_502)
    GW->>Eng: Process Fallback
    Eng->>Health: Record AddonA failure (penalize health score)
    Eng->>Cache: Pop next ranked candidate (from AddonB)
    Eng-->>User: 200 OK (nextCandidate: Candidate B, resumePosition: 00:32:15) (T_resolve = 60ms)
    User->>User: Hot-swap source & resume playback at 00:32:15 (T_resume = 680ms, Delta = 0.1s)
```

---

## 4. Architectural Summary

1. **Stremio Addons as Sole Stream Mechanism**: All external stream discovery flows through user-enabled Stremio addons via `StremioAddonAdapter`.
2. **First-Class Settings → Addons**: Native support for browsing, filtering by 16 authentic categories, searching, configuring, and enabling/disabling addons.
3. **Generic & Manifest-Driven**: Zero hardcoded provider conditionals; capability inspection driven entirely by Stremio manifest.
4. **Resilient Two-Tier Timing & Health Ranking**: 2.5s fast window, 5–8s hard ceiling, dynamic health scoring, and measurable fallback SLAs.
