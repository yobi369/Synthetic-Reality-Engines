# Security policy

## Supported deployment status

Synthetic Reality Engines is an experimental application. Do not expose the current API to untrusted public traffic until request validation, rate limiting, provider timeouts, safe error handling and deployment-specific security controls are implemented and tested.

## Secrets

- Keep `GEMINI_API_KEY` on the server only.
- Never commit real `.env` files, tokens or provider credentials.
- Do not prefix server secrets with `VITE_`; Vite-prefixed variables can be bundled into client code.
- Rotate any credential that may have been exposed.

## API safety requirements

The current AI endpoints accept structured request bodies and pass selected context to an external model provider. Before public deployment:
- enforce JSON content type and a small request body limit;
- validate field types, lengths and collection sizes;
- construct prompts from bounded, normalized data;
- apply per-IP/user rate limits and provider request deadlines;
- avoid returning raw exception messages, stack traces or provider internals;
- return an explicit unavailable response when no provider key is configured;
- apply security headers and an explicit CORS policy if cross-origin access is needed.

## Reporting

Please report suspected vulnerabilities privately to the repository owner rather than publishing exploit details in an issue. Include affected paths, impact and reproducible steps. Do not include live secrets or personal data in reports.


## Account and run data controls

- Passwords are stored as scrypt-derived hashes with per-account random salts; plaintext passwords are not persisted.
- Session bearer tokens are random and only SHA-256 token hashes are stored. Sessions expire after seven days and can be revoked.
- Authenticated run and intervention operations always scope lookups and mutations by the session's account ID.
- Registration and login endpoints have per-process IP rate limits. Deploy behind HTTPS and a trusted reverse proxy.
- The current file-backed store is for a single server instance. Configure `DATA_DIR` on a persistent, access-restricted volume, limit host filesystem access, and maintain encrypted off-host backups.
- Do not expose the data directory through static file serving. Do not commit production data or credentials.
- Before multi-instance deployment, replace the file adapter with a transactional shared database and a distributed session/rate-limit store.
