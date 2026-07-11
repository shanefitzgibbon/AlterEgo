# Integration Test Matrix

## Core smoke scenarios

| Scenario | Site A | Site B | Site C | Site D | Site E | Site F | Key assertion |
|---|---|---|---|---|---|---|---|
| First login | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Authenticated user is deterministic fixture user |
| Logout then login | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Session/token is replaced and old state is invalid |
| Forced session expiry | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Expired auth cannot access `/protected` |
| Interrupted redirect | — | ✅ | ✅ | — | — | ✅ | Flow recovers without cross-user leakage |
| Persona switch mid-flow | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Identity isolation across browser personas |
| Concurrent tabs | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Last login state remains internally consistent |
| Domain overlap | — | ✅ | ✅ | — | — | ✅ | Cookies scoped to intended domain/pattern only |

## Nightly-expanded scenarios

- Site B cross-domain redirect with mixed app/auth/api cookies.
- Site C callback replay and stale code rejection.
- Site D MFA challenge expiration and remember-device skip path.
- Site E refresh token rotation and refresh reuse denial.
- Site F SP-initiated and IdP-initiated SSO variants plus CSRF form checks.
