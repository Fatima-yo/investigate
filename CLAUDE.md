# Investigate — /var/www/investigate/

## Overview
- **URL**: https://theamericasconsulting.com/investigate
- **Type**: Static HTML + Node.js backend (port 3001)
- **Systemd**: `investigate-server.service`
- **Served by**: nginx `alias /var/www/investigate/` (static files) + proxy to :3001 for API routes

## Key Files
- `investigate.html` — Main multi-chain explorer (2500+ lines inline JS, no blockchain-api.js)
- `investigate-ethereum.html` — Ethereum-specific page (uses blockchain-api.js)
- `investigate-bitcoin.html`, `investigate-solana.html`, etc. — Per-chain pages
- `blockchain-api.js` — Shared API library (Etherscan V2, API key from localStorage)
- `server.js` — Node backend (port 3001): auth, query logging, query history
- `settings.html` — API key management (stores keys in browser localStorage under `blockchainApiKeys`)

## Two Distinct Codebases
- `investigate.html` has its own **inline** blockchain logic (~2500 lines) — does NOT use `blockchain-api.js`
- All other chain-specific pages (`investigate-ethereum.html` etc.) use `blockchain-api.js`

## API Keys
- Stored in **browser localStorage** under key `blockchainApiKeys` (per-origin)
- Must be re-entered per browser — not stored server-side
- Etherscan key (ethereum + bsc): `B8BUGCYR8XUBR1HV7H1RB69Y9CWSIXPQ5W`
- Set via `https://theamericasconsulting.com/investigate/settings.html`

## RPC Endpoints (investigate.html inline JS)

### Current endpoints (as of 2026-03-31, changed during migration)
- Ethereum: `https://cloudflare-eth.com`
- Polygon: `https://rpc.ankr.com/polygon`
- Fantom: `https://rpc.ankr.com/fantom`

### Previous endpoints (original — changed due to rate limiting on new server IP)
- Ethereum: `https://eth.llamarpc.com` — hit 429 Too Many Requests on new server
- Polygon: `https://polygon.llamarpc.com` — ERR_NAME_NOT_RESOLVED in browser
- Fantom: `https://rpc.ftm.tools` — 401 Unauthorized

**If the new endpoints don't work, revert to originals and investigate further.**

## Known Issues (2026-03-31)
- `rpc.ftm.tools` (Fantom) returns 401 — switched to Ankr
- `polygon.llamarpc.com` DNS not resolving in browser — switched to Ankr
- `eth.llamarpc.com` rate-limits (429) on new server IP — switched to Cloudflare

## Visitor/Query System
- Visitors get a query limit (tracked server-side by IP/session)
- `GET /api/visitor` — init visitor session, returns remaining queries
- `POST /api/investigate` — log a query
- `POST /api/query/result` — update query result status
