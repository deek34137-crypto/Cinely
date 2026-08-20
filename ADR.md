# Cinely: Architectural Decision Records (ADRs)

This document summarizes the core architectural decisions governing the design and implementation of the Cinely Media Engine platform.

---

## Index of Architectural Decision Records

- [ADR-001: V1 Modular Monolith Architecture Boundary](#adr-001-v1-modular-monolith-architecture-boundary)
- [ADR-002: Two-Tier Stream Resolution Timing Model](#adr-002-two-tier-stream-resolution-timing-model)
- [ADR-003: Measurable Best-Effort Playback Fallback Protocol](#adr-003-measurable-best-effort-playback-fallback-protocol)
- [ADR-004: Stremio Addons as Exclusive External Stream-Provider Mechanism for V1](#adr-004-stremio-addons-as-exclusive-external-stream-provider-mechanism-for-v1)
- [ADR-005: Authentic Addon Taxonomy & Dynamic Catalog Synchronization](#adr-005-authentic-addon-taxonomy--dynamic-catalog-synchronization)
- [ADR-006: Generic Manifest-Driven StremioAddonAdapter Architecture](#adr-006-generic-manifest-driven-stremioaddonadapter-architecture)
- [ADR-007: Versioned AES-256-GCM Credential Vault with Key Rotation](#adr-007-versioned-aes-256-gcm-credential-vault-with-key-rotation)
- [ADR-008: Mandatory 13-Vector Addon Contract Test Suite](#adr-008-mandatory-13-vector-addon-contract-test-suite)
- [ADR-009: First-Class Addon Health Engine Feeding Dynamic Stream Ranking](#adr-009-first-class-addon-health-engine-feeding-dynamic-stream-ranking)
- [ADR-010: User-Control Principle & Addon Sovereignty](#adr-010-user-control-principle--addon-sovereignty)

---

### ADR-001: V1 Modular Monolith Architecture Boundary

- **Status**: Approved
- **Context**: Video streaming platforms frequently risk premature microservice fragmentation, leading to operational complexity, distributed transaction overhead, and inter-service latency.
- **Decision**: Cinely V1 will be built strictly as a **Modular Monolith** in TypeScript / Fastify with PostgreSQL 16 and Redis/Valkey 7. Domain subsystems (Metadata Normalizer, Addon Registry, Generic Adapter, Stream Resolver, Health Engine, Session Manager) reside in isolated internal packages with explicit interface contracts.
- **Consequences**: Fast developer velocity, zero network serialization latency between core subsystems, straightforward transactional consistency, and clean migration paths to distributed services if concrete scale requirements emerge later.

---

### ADR-002: Two-Tier Stream Resolution Timing Model

- **Status**: Approved
- **Context**: External Stremio addons have widely varying response times (200ms to 6000ms). An inflexible single timeout either stalls playback startup or prematurely discards high-quality slow providers.
- **Decision**: Implement a **Two-Tier Timing Model**:
  1. *Fast-Resolution Window (2.5s)*: Aggregates and ranks all candidates ready within 2.5s, immediately returning the primary stream to the client.
  2. *Hard Resolution Ceiling (5.0–8.0s)*: Slower addons continue resolving in the background. Newly arrived candidates are merged into the active Redis session cache and pushed to the client via Server-Sent Events (SSE).
- **Consequences**: Sub-3-second time-to-first-frame for the user while capturing high-fidelity streams without blocking the initial experience.

---

### ADR-003: Measurable Best-Effort Playback Fallback Protocol

- **Status**: Approved
- **Context**: Stream failover cannot guarantee instantaneous $< 150\text{ms}$ hot-swaps under real-world network variations, manifest parsing overhead, and video decoding pipelines.
- **Decision**: Define and monitor 4 explicit, measurable SLA metrics:
  - *Detection Latency ($T_{\text{detect}}$)*: $< 2,000\text{ms}$ on stall; $< 100\text{ms}$ on fatal 4xx/5xx/DRM errors.
  - *Fallback Resolution Latency ($T_{\text{resolve}}$)*: $< 250\text{ms}$ (p95) to pop pre-ranked candidate from Redis.
  - *Playback Resume Latency ($T_{\text{resume}}$)*: $< 1,500\text{ms}$ (p95) to decode and render first frame.
  - *Resume Position Delta ($\Delta_{\text{pos}}$)*: $\le 1.0\text{s}$ variance from the interruption point.
- **Consequences**: Realistic, auditable playback resilience with automated telemetry collection on every fallback event.

---

### ADR-004: Stremio Addons as Exclusive External Stream-Provider Mechanism for V1

- **Status**: Approved
- **Context**: Building separate first-party scrapers or resolvers for individual sites/services causes massive maintenance overhead, legal risk, and duplicate work.
- **Decision**: Cinely V1 establishes **Stremio-compatible addons as the exclusive external stream-provider mechanism**. Cinely will NOT build standalone scrapers for Pluto, Tubi, Archive.org, torrent indexes, or individual websites. All external stream discovery flows through user-enabled Stremio addons.
- **Consequences**: Infinite extensibility, clean legal boundary, and instant compatibility with hundreds of community-maintained media sources.

---

### ADR-005: Authentic Addon Taxonomy & Dynamic Catalog Synchronization

- **Status**: Approved
- **Context**: Adding arbitrary custom categories ("Best", "4K", "Safe") misrepresents the underlying ecosystem and causes catalog divergence.
- **Decision**: Cinely synchronizes dynamically with `https://stremio-addons.net/addons` and strictly mirrors its **exact 16 categories** (`anime`, `asian drama`, `bollywood`, `debrid support`, `http streams`, `live tv`, `metadata`, `misc`, `movies`, `music`, `nsfw`, `radios`, `subtitles`, `torrents`, `tv shows`, `usenet`) and **3 sort options** (`popular`, `new`, `updatedAt`).
- **Consequences**: Authentic, verified catalog browsing in Settings → Addons without fabricated taxonomies.

---

### ADR-006: Generic Manifest-Driven StremioAddonAdapter Architecture

- **Status**: Approved
- **Context**: Hardcoding provider-specific logic (e.g. `if (torrentio)`) tightly couples the engine to specific addons and breaks architectural isolation.
- **Decision**: Implement a single, generic `StremioAddonAdapter` operating purely through Stremio Addon Protocol v3 manifest capability inspection (`catalog`, `meta`, `stream`, `subtitles`, `types`, `idPrefixes`).
- **Consequences**: Zero provider-specific conditional branches; any standard Stremio addon works seamlessly out of the box.

---

### ADR-007: Versioned AES-256-GCM Credential Vault with Key Rotation

- **Status**: Approved
- **Context**: Storing user addon configurations (Debrid API keys, custom authentication tokens) requires robust encryption, integrity verification, and rotation capabilities.
- **Decision**: Store credentials in a versioned envelope schema:
  `[ key_version ] : [ 96-bit Unique Nonce/IV ] : [ 128-bit Auth Tag ] : [ Ciphertext ]` using AES-256-GCM with HKDF-SHA256 master key derivation, supporting lazy re-encryption on read/write and batch rotation without downtime.
- **Consequences**: Cryptographic authenticity verification on every decryption and zero-downtime key rotation.

---

### ADR-008: Mandatory 13-Vector Addon Contract Test Suite

- **Status**: Approved
- **Context**: Addons run on diverse external infrastructure and may return malformed responses, hang, or emit errors.
- **Decision**: Mandate a 13-vector automated contract test suite in CI/CD covering: Manifest Ingestion, Capability Filtering, Config Path Interpolation, Stream Normalization, Subtitle Normalization, Fast-Window Deadline (2.5s), Hard Ceiling & Cancellation (`AbortSignal` at 8.0s), Malformed Payloads, Rate Limiting (429), Addon Outage (5xx), Dead Stream Manifests, Health Reporting, and Credential/Logging Safety.
- **Consequences**: Resilient runtime execution with zero server crashes from malformed third-party addon responses.

---

### ADR-009: First-Class Addon Health Engine Feeding Dynamic Stream Ranking

- **Status**: Approved
- **Context**: Static addon priorities degrade user experience if an enabled addon's servers experience slowdowns or segment errors.
- **Decision**: Implement an **Addon Health Engine** as a core subsystem tracking real-time sliding window success rates (60s, 15m, 24h), latency percentiles ($p_{50}, p_{95}, p_{99}$), and error budgets. The resulting dynamic Health Score $H_{\text{addon}} \in [0.0, 1.0]$ directly modulates candidate ranking scores and drives circuit breakers.
- **Consequences**: Self-healing stream orchestration where degrading addons are automatically demoted in favor of healthy alternatives.

---

### ADR-010: User-Control Principle & Addon Sovereignty

- **Status**: Approved
- **Context**: Platforms that paternalistically restrict user provider choices, blacklist addons based on arbitrary preference, or enforce artificial content gatekeeping frustrate users and break provider neutrality.
- **Decision**: Establish the **User-Control Principle** as an immutable invariant:
  1. The user has full, authoritative sovereignty over enabled/disabled addons, configuration, and filtering.
  2. Cinely will never silently disable an addon, hide an addon from the catalog, or block a stream because it considers the addon "unpreferred."
  3. Cinely functions strictly as an aggregator, normalizer, ranker, and playback engine.
  4. Platform restrictions are limited strictly to technical infrastructure integrity (SSRF protection against loopback/cloud metadata probing, authentication, rate limiting).
- **Consequences**: Complete user trust, zero arbitrary gatekeeping, and pure platform neutrality.
