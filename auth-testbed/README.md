# Auth Test Bed

A lightweight set of simple auth sites to exercise integration tests for AlterEgo persona isolation.

## Shared baseline

- Standard routes on each site: `/login`, `/logout`, `/me`, `/protected`.
- Shared JSON shape:
  - Success: `{ ok: true, data: {...}, error: null }`
  - Failure: `{ ok: false, data: null, error: { code, message, details } }`
- Deterministic fixture credentials:
  - `alice / password123`
  - `bob / password123`
- Predictable defaults:
  - Session TTL: 15 minutes
  - Remember-me TTL: 7 days
  - Idle timeout: 5 minutes

## Implemented sites

- **Site A (3001):** classic cookie/session auth.
- **Site B (3011/3012/3013):** app/auth/api split for multi-domain-style cookie behavior.
- **Site C (3021/3022):** OAuth/OIDC-style redirect flow with IdP + RP.
- **Site D (3031):** MFA step-up with deterministic OTP and remember-device.
- **Site E (3041/3042):** SPA + API short-lived access token and refresh token rotation.
- **Site F (3051):** enterprise-flavored flows (SP/IdP initiated, CSRF form login, strict SameSite cookie).

## Local usage

```bash
npm install
npm run start:all
```

Then run tests:

```bash
npm run test:smoke
npm run test:nightly
```

## Azure deployment strategy

- Use one container image and set `SITE` env var (`site-a`, `site-b-auth`, etc.) per app.
- Deploy auth/API services to Azure Container Apps or Azure App Service.
- Deploy SPA/static frontends (e.g. Site E SPA) to Azure Static Web Apps.
- Use Azure Front Door for domain/subdomain routing patterns.
- Store secrets in Azure Key Vault and inject via managed identity references.
- Provision infrastructure from `infra/bicep/main.bicep`.
