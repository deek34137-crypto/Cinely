# Cinely: Security Architecture & Trust Model Specification

## 1. Zero-Trust Security Architecture

Cinely enforces strict zero-trust boundaries across all ingress and egress network boundaries:

```
[ Client Applications ]
        │
        ▼ (HTTPS / TLS 1.3 + JWT Bearer Auth)
[ Cinely API Gateway ] ─── (Rate Limiting, WAF, Input Sanitization)
        │
        ▼ (Internal Fastify Module Bus)
[ Media Engine Core ] ─── (AES-256-GCM Vault with Key Rotation)
        │
        ▼ (Strict Outbound SSRF Firewall & Egress Filter)
[ Generic StremioAddonAdapter Sandbox ]
        │
        ▼ (Public Internet / HTTPS)
[ User-Enabled Stremio Addons ] ── (Protocol v3 Manifests & Resources)
```

---

## 2. User Addon Configuration Vault (AES-256-GCM)

User-provided addon configurations (e.g. Debrid API keys, custom authentication headers, filter options) are protected using authenticated envelope encryption:

### 2.1 Encryption Standard & Envelope Structure
- **Algorithm**: AES-256-GCM (Galois/Counter Mode).
- **Key Derivation**: HKDF (HMAC-based Extract-and-Expand Key Derivation Function) with SHA-256 using master keys managed via AWS KMS / HashiCorp Vault / secure environment secrets.
- **Payload Schema**:
  ```
  [ key_version (v1/v2) ] : [ 96-bit Unique Nonce/IV ] : [ 128-bit Auth Tag ] : [ Ciphertext ]
  ```
- **Authenticated Verification**: Every decryption strictly verifies the 128-bit authentication tag before releasing decrypted configuration into in-memory request pipelines.

### 2.2 Key Rotation Protocol
1. **Master Key Versioning**: The application supports multiple active decryption keys (`v1`, `v2`) while designating a single active encryption key (`vCurrent`).
2. **Lazy Re-Encryption**: When an older credential (`v1`) is read during an active session, the engine decrypts it with `v1` and automatically re-encrypts with `vCurrent` and a fresh 96-bit nonce.
3. **Zero-Downtime Migration**: An administrative CLI tool facilitates batch key rotations without service interruption.

---

## 3. Addon Outbound Egress & SSRF Protection

Because users can install custom community Stremio addons via custom manifest URLs, strict Server-Side Request Forgery (SSRF) defenses are enforced on all outbound addon requests:

```
+-------------------------------------------------------------------------------+
|                    SSRF DEFENSE PIPELINE (STREMIO ADDON FETCH)                |
|                                                                               |
| 1. DNS Pre-Resolution: Resolve target hostname to IP address prior to connect |
| 2. Private IP Blacklist:                                                      |
|    - 127.0.0.0/8 (Loopback)                                                   |
|    - 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 (RFC 1918 Private LANs)        |
|    - 169.254.169.254 (Cloud Instance Metadata Services)                       |
|    - ::1, fc00::/7, fe80::/10 (IPv6 Loopback & Link-Local)                    |
| 3. Execution Guarantee: Any addon URL resolving to blacklisted IP ranges      |
|    is blocked immediately with a typed SSRFViolationException.                |
+-------------------------------------------------------------------------------+
```

---

## 4. Legal Compliance & Addon Client Role

- **Addon Client / Aggregator Model**: Cinely operates strictly as an aggregator and client of user-enabled Stremio addons.
- **No Unauthorized Scrapers**: Cinely does not host, ship, or bundle proprietary torrent scrapers or reverse-engineered site scrapers. All stream resolution conforms to the published Stremio Addon Protocol v3.
- **No DRM Circumvention**: DRM-protected streams pass standard license requests through authorized key servers using Encrypted Media Extensions (EME) without key interception.

---

## 5. Security Testing & Credential Safety

- **Automated CI/CD Credential Leak Prevention**: Test suites assert that no Debrid API keys, custom auth headers, or tokens are logged to standard output, error objects, or telemetry URIs.
- **Input Validation**: All incoming requests and external addon JSON responses are sanitized and validated against strict Zod/TypeScript schemas.

---

## 6. Security Decisions Summary

1. **AES-256-GCM with Key Versioning**: 96-bit nonces, 128-bit authentication tags, and zero-downtime key rotation for user addon configurations.
2. **SSRF Defense**: Strict DNS pre-resolution blacklisting on all custom and catalog addon manifest requests.
3. **Stremio Protocol Compliance**: Compliant Stremio Addon client adhering to declared addon manifests.
