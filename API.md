# Cinely: Media Engine API Specification

## 1. Overview & Architectural Principles

The Cinely Media Engine API provides a standardized interface for client applications (Web, Mobile, TV, Player SDK).

- **Protocol**: HTTP/2 & HTTP/3 over TLS 1.3.
- **Real-Time Channels**: Server-Sent Events (SSE) via `/v1/realtime` for session candidate updates, cross-device sync, and catalog refreshes.
- **Errors**: RFC 7807 Problem Details on all 4xx/5xx responses.
- **Versioning**: URI path versioning (`/v1`).

---

## 2. Authentication & Authorization

All requests to protected endpoints require an `Authorization: Bearer <token>` header (JWT signed with RS256/EdDSA). Playback session tokens (`sessionToken`) protect active streaming sessions.

---

## 3. Core API Endpoints

### 3.1 Settings → Addons Management Endpoints

#### `GET /v1/addons/catalog`
Browse and search available Stremio addons from the synchronized registry using authentic taxonomy.
- **Query Parameters**:
  - `q` (optional): search keyword
  - `category` (optional): one of the **16 authentic categories**:
    `anime` | `asian drama` | `bollywood` | `debrid support` | `http streams` | `live tv` | `metadata` | `misc` | `movies` | `music` | `nsfw` | `radios` | `subtitles` | `torrents` | `tv shows` | `usenet`
  - `sort` (optional): `popular` (default) | `new` | `updatedAt`
  - `page` (default: `1`), `limit` (default: `20`)
- **Response `200 OK`**:
```json
{
  "data": {
    "addons": [
      {
        "id": "com.stremio.torrentio.addon",
        "name": "Torrentio",
        "version": "0.0.15",
        "description": "Provides torrent streams from scraped torrent providers...",
        "logo": "https://torrentio.strem.fun/images/logo_v1.png",
        "background": "https://torrentio.strem.fun/images/background_v1.jpg",
        "types": ["movie", "series", "anime", "other"],
        "categories": ["torrents", "debrid support", "movies", "tv shows", "anime"],
        "behaviorHints": {
          "configurable": true,
          "configurationRequired": false
        },
        "stars": 2048,
        "isInstalled": true,
        "isEnabled": true
      }
    ],
    "pagination": { "total": 525, "page": 1, "pageCount": 27 }
  }
}
```

#### `GET /v1/addons/catalog/{addon_id}`
Returns complete manifest details and configuration schema for an individual addon.

#### `GET /v1/users/me/addons`
Returns the list of currently installed and enabled addons for the authenticated user.

#### `POST /v1/users/me/addons/{addon_id}/enable`
Enables a specific addon for the user.

#### `POST /v1/users/me/addons/{addon_id}/disable`
Disables a specific addon (disabled addons are never queried during playback resolution).

#### `PUT /v1/users/me/addons/{addon_id}/config`
Stores encrypted custom configuration parameters for an addon (e.g. Debrid tokens, resolution filters).
- **Request Body**:
```json
{
  "configuration": {
    "debridProvider": "realdebrid",
    "debridApiKey": "sec_rd_token_98471209384",
    "qualityFilter": ["4k", "1080p"]
  }
}
```
- **Response `200 OK`**: `{ "status": "configured_and_saved", "keyVersion": "v1" }`

#### `POST /v1/users/me/addons/custom`
Installs a custom community addon by its manifest URL (`https://custom-addon.io/manifest.json`).

#### `POST /v1/users/me/addons/reset-defaults`
Restores the user's addon list to Cinely's transparent default set.

---

### 3.2 Two-Tier Stream Resolution & Playback Lifecycle

#### `POST /v1/playback/resolve`
Queries active **user-enabled stream addons** using the two-tier timing model.
- **Request Body**:
```json
{
  "canonicalId": "cinely:item:mov_894721",
  "mediaType": "movie",
  "externalIds": { "imdbId": "tt1492048", "tmdbId": "894721" },
  "clientCapabilities": {
    "supportedCodecs": ["av1", "hevc", "h264", "aac", "eac3"],
    "maxResolution": "2160p",
    "estimatedBandwidthKbps": 35000
  }
}
```

- **Response `200 OK`**:
```json
{
  "data": {
    "sessionId": "sess_89b21f98-4c12-4029-9e8a-77e810a9c821",
    "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": "2026-08-16T22:30:00Z",
    "resolutionTiming": {
      "fastWindowCompleted": true,
      "backgroundResolutionActive": true,
      "hardCeilingSeconds": 8.0
    },
    "primaryCandidate": {
      "candidateId": "cand_01J5K49V...",
      "addonId": "com.stremio.torrentio.addon",
      "addonName": "Torrentio [RD+]",
      "sourceType": "direct",
      "streamUrl": "https://debrid.stream.cinely/play/stream.mkv",
      "quality": {
        "resolution": "2160p",
        "bitrateKbps": 22000,
        "codecVideo": "hevc",
        "codecAudio": "eac3",
        "audioChannels": 6,
        "hdrFormat": "hdr10"
      },
      "subtitles": [
        { "id": "sub_en", "language": "en", "label": "English (SDH)", "format": "vtt", "isDefault": true }
      ]
    },
    "fallbackCandidatesCount": 3
  }
}
```

#### `POST /v1/playback/session/{session_id}/heartbeat`
Maintains the playback lease and reports telemetry.

#### `POST /v1/playback/session/{session_id}/fallback`
Invoked upon fatal stream failure or buffer stall to retrieve the next ranked candidate from remaining enabled addons.
- **Request Body**:
```json
{
  "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "failingCandidateId": "cand_01J5K49V...",
  "errorCategory": "HTTP_502_BAD_GATEWAY",
  "playbackPositionSeconds": 1420.5,
  "telemetry": {
    "detectionLatencyMs": 95,
    "lastBufferedSeconds": 0.0,
    "httpStatus": 502
  }
}
```
- **Response `200 OK`**:
```json
{
  "data": {
    "fallbackSuccess": true,
    "resumePositionSeconds": 1420.5,
    "nextCandidate": {
      "candidateId": "cand_02M8N19X...",
      "addonId": "comet.elfhosted.com",
      "addonName": "Comet [ElfHosted]",
      "sourceType": "direct",
      "streamUrl": "https://debrid2.stream.cinely/play/stream.mkv",
      "quality": {
        "resolution": "1080p",
        "bitrateKbps": 11000,
        "codecVideo": "h264",
        "codecAudio": "aac"
      }
    },
    "remainingFallbackCount": 2
  }
}
```

---

### 3.3 Addon Health & Diagnostics Endpoints

- `GET /v1/addons/{addon_id}/health` — Returns live SLA metrics, latency distribution ($p_{50}, p_{95}, p_{99}$), error rates, and circuit breaker state.
- `POST /v1/addons/{addon_id}/test` — Probes manifest reachability and latency.

---

## 4. Standard RFC 7807 Error Format

```json
{
  "type": "https://api.cinely.io/errors/ADDON_CIRCUIT_OPEN",
  "title": "Addon Circuit Open",
  "status": 503,
  "detail": "Addon 'comet.elfhosted.com' circuit is OPEN due to elevated error rates. Remaining enabled addons were queried.",
  "instance": "/v1/playback/resolve",
  "code": "ADDON_CIRCUIT_OPEN",
  "timestamp": "2026-08-16T16:40:00Z"
}
```

---

## 5. API Assumptions Summary

1. **Settings → Addons**: Fully supported API with 16 authentic categories, 3 sort options, configuration encryption, and toggle controls.
2. **Two-Tier Timing**: 2.5s fast window with background continuation up to 8.0s via SSE.
3. **Session-Bound Fallback**: Cryptographic session tokens and standardized SLA diagnostic payloads.
