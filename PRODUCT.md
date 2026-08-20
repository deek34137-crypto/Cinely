# Cinely: Product Specification & Vision Document

## 1. Executive Summary

**Cinely** is a universal media discovery, stream resolution, and playback orchestration platform.

At its core, Cinely is **not** a media player frontend, a piracy streaming app, nor an add-on-dependent scraper codebase. Cinely's primary product is a **provider-agnostic Media Engine** designed to solve media fragmentation: the challenge where metadata, licensing, media feeds, catalogs, and streaming protocols are scattered across disjointed services.

For **Cinely V1**, the platform's external content and stream discovery ecosystem is **exclusively powered by the Stremio Addon ecosystem**. Cinely does not build separate first-party provider adapters for individual scrapers, torrent indexes, or standalone streaming sites. Instead, Cinely provides a universal, generic `StremioAddonAdapter` and an **Addon Registry** that normalizes metadata, catalogs, streams, and subtitles from user-enabled Stremio-compatible addons.

Cinely aggregates legitimate metadata sources for its canonical UI, queries user-enabled Stremio addons in real time, normalizes disparate stream formats, evaluates stream reliability and quality, securely resolves playback candidates, and guarantees reliable playback through intelligent automated fallback orchestration.

---

## 2. Core Value Propositions

### 2.1 Universal Canonical Catalog & Discovery
- Eliminates fragmented search experiences by aggregating metadata from authoritative registries (TMDB, TVMaze) and enabled Stremio catalog addons into a single unified canonical ID space.
- Automatically resolves entity collisions, localized titles, season/episode numbering variations, and cross-platform media identities.

### 2.2 Native In-App Settings → Addons Experience (First-Class V1 Feature)
- **Self-Contained In-App Addon Management**: The user never needs to leave Cinely to browse, filter, search, enable, or disable addons.
- Cinely uses `stremio-addons.net` purely as a backend catalog data source; the entire browsing, filtering (16 authentic categories), and toggle experience is native within Cinely's own UI:
  ```
  Cinely
    └── Settings
          └── Addons
                ├── [ Search addons... ]
                ├── [ Filters: 16 Authentic Categories | 3 Sort Dimensions ]
                ─────────────────────────────────────────────────────────────
                ├── Torrentio           [ ON  ]   [ Configure ]
                ├── Comet               [ OFF ]   [ Configure ]
                ├── MediaFusion         [ ON  ]   [ Configure ]
                ├── OpenSubtitles v3    [ ON  ]
                ─────────────────────────────────────────────────────────────
  ```
- **External Configuration Only When Required**: For configurable addons exposing custom web configuration interfaces (e.g. Debrid setup on `https://torrentio.strem.fun/configure`), only that specific setup step opens the addon's configuration flow, returning the generated configured manifest directly back into Cinely.

### 2.3 User-Control Principle & Addon Sovereignty
- **The user's enabled addon set is strictly authoritative.**
- Cinely provides the interface, aggregation, normalization, ranking, and playback infrastructure without imposing paternalistic content or provider restrictions.
- Cinely never silently disables addons, never hides catalog addons, and never blocks streams from user-enabled addons.

### 2.4 Intelligent Candidate Ranking & Addon Health Engine
- When multiple enabled addons offer streams for a requested title, Cinely evaluates candidates across objective metrics: dynamic addon health scores, network latency, historical uptime, bitrate, codec compatibility, audio configuration, and user preferences.
- A first-class **Addon Health Engine** continuously monitors uptime, p50/p95/p99 latency, and error budgets, dynamically adjusting candidate rankings without overriding user selection.

### 2.5 Resilient Playback & Measurable Fallback
- Manages active playback sessions with continuous telemetry.
- If an addon's stream suffers fatal degradation, buffer stalls, or HTTP 4xx/5xx errors, the client-engine protocol transitions to the next best candidate from remaining enabled addons with tracked, measurable best-effort performance metrics ($T_{\text{detect}}$, $T_{\text{resolve}}$, $T_{\text{resume}}$, $\Delta_{\text{pos}}$).

---

## 3. Product Scope & Boundaries

```
+-------------------------------------------------------------------------------+
|                                CINELY ECOSYSTEM                               |
|                                                                               |
|  +-------------------------------------------------------------------------+  |
|  |                     Client Applications (Consumers)                     |  |
|  |             Web App  |  Mobile (iOS/Android)  |  Smart TVs              |  |
|  |             [ Settings → Addons: In-App Browsing, Filters, Toggles ]     |  |
|  +------------------------------------+------------------------------------+  |
|                                       | (REST / SSE / WebSockets)             |
|  +------------------------------------v------------------------------------+  |
|  |                    CINELY MEDIA ENGINE (Modular Monolith)               |  |
|  |  +---------------------+ +----------------------+ +------------------+  |  |
|  |  | Metadata Aggregator | | Stream Resolver &    | | Playback Session |  |  |
|  |  | & Normalizer        | | Addon Stream Ranker  | | & Fallback Mgr   |  |  |
|  |  +---------------------+ +----------------------+ +------------------+  |  |
|  |  +---------------------+ +----------------------+ +------------------+  |  |
|  |  | Addon Health Engine | | Addon Registry &     | | User Addon Prefs |  |  |
|  |  | (SLA & Telemetry)   | | Catalog Sync Engine  | | & Config Vault   |  |  |
|  |  +---------------------+ +----------------------+ +------------------+  |  |
|  |  +-------------------------------------------------------------------+  |  |
|  |  |        Generic StremioAddonAdapter Subsystem (Protocol v3)        |  |  |
|  |  +-------+------------------+-------------------+--------------------+  |  |
|  +----------|------------------|-------------------|--------------------+--+  |
|             |                  |                   |                          |
|  +----------v---------+ +------v-----------+ +-----v------------+             |
|  | Canonical Metadata | | User Addon #1    | | User Addon #N    |             |
|  | (TMDB / TVMaze)    | | (Streams/Catalog)| | (Subtitles/Meta) |             |
|  +--------------------+ +------------------+ +------------------+             |
+-------------------------------------------------------------------------------+
```

### 3.1 In-Scope Capabilities (V1)
1. **In-App Settings → Addons UI**: Native browsing, searching, and filtering of addons with direct toggle switches (`ON`/`OFF`), configuration launcher, and instant activation.
2. **Generic Stremio Addon Adapter**: Unified implementation of the Stremio Addon Protocol v3 (`/manifest.json`, `/catalog/...`, `/meta/...`, `/stream/...`, `/subtitles/...`). No provider-specific hardcoded branching.
3. **Addon Registry & Catalog Discovery**: Dynamic background discovery from `https://stremio-addons.net/addons`, mirroring authentic categories and sorting options.
4. **Default Addon Provisioning**: Ships with a transparent, user-disableable default set for immediate out-of-the-box functionality.
5. **Stream Normalization & Health-Weighted Ranking**: Normalizing stream descriptors from all active addons and ranking them via dynamic health scores, bitrate, and codec match.
6. **Two-Tier Stream Resolution**: 2.5s fast window + 5.0–8.0s hard ceiling + SSE background streaming.
7. **Playback Lifecycle & Measurable Fallback**: Automated failover to alternative addon streams upon failure with SLA telemetry.

### 3.2 Explicit Anti-Goals & Architectural Boundaries
- **No Content Censorship or Gatekeeping**: Cinely does NOT impose its own content or provider restrictions on the user's Stremio addon selection. Cinely never blocks an addon or stream simply because it considers the addon "unpreferred."
- **No Separate First-Party Stream Adapters**: Cinely V1 will NOT build or maintain standalone stream scrapers or website-specific resolvers. All external stream discovery is delegated exclusively to Stremio-compatible addons.
- **No Invented Addon Taxonomy**: Cinely strictly mirrors the 16 categories and 3 sort options present in Stremio Addons; no artificial categories ("Best Providers", "4K", "Safe") will be fabricated.
- **No Forced or Silent Addon Installations**: Default addons are fully visible and toggleable. Cinely never forces an addon ON or installs unapproved addons.
- **No DRM/Licensing Bypass or Scraper Reverse-Engineering**: Cinely acts strictly as an addon client adhering to declared addon manifests and Stremio v3 protocol endpoints.

---

## 4. Fundamental User-Control Invariants

1. **User Authority**: The user's enabled/disabled addon list is the sole authority governing which external endpoints are queried for media streams.
2. **In-App Management**: Browsing, filtering, searching, and toggling addons is completely self-contained within Cinely's native interface.
3. **No Arbitrary Disabling**: Cinely will never silently disable, remove, or hide an addon from the user's catalog.
4. **Transparent Defaults**: Initial default addons are provided purely for immediate usability. The user has full autonomy to toggle them OFF and configure any other compatible Stremio addon.
5. **Platform-Only Restrictions**: The only restrictions enforced by Cinely are those strictly required for technical platform integrity (preventing SSRF attacks to internal infrastructure, enforcing token authentication, rate limiting, and cryptographic vaulting).
