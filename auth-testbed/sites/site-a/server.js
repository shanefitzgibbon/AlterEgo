const express = require('express');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { authenticate, FIXTURE_USERS } = require('../../common/fixtures');
const { ok, fail } = require('../../common/response');
const { SessionStore } = require('../../common/session-store');
const { DEFAULT_POLICY } = require('../../common/constants');
const { installCsrf } = require('../../common/security');

const app = express();
const sessions = new SessionStore();
const COOKIE_NAME = 'site_a_sid';

app.use(express.json());
app.use(cookieParser());
installCsrf(app);
const authLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });

function getSession(req) {
  return sessions.getSession(req.cookies[COOKIE_NAME]);
}

function requireAuth(req, res, next) {
  const session = sessions.touch(req.cookies[COOKIE_NAME]);
  if (!session) return fail(res, 401, 'UNAUTHENTICATED', 'Login required');
  req.session = session;
  next();
}

app.get('/', (_req, res) => {
  res.type('text/plain').send('Site A: classic cookie/session auth');
});

app.post('/login', authLimiter, (req, res) => {
  const { username, password, rememberMe = false } = req.body || {};
  const user = authenticate(username, password);
  if (!user) return fail(res, 401, 'BAD_CREDENTIALS', 'Invalid credentials');

  const ttlMs = rememberMe ? DEFAULT_POLICY.rememberMeTtlMs : DEFAULT_POLICY.sessionTtlMs;
  const session = sessions.createSession(user, {
    ttlMs,
    idleTimeoutMs: DEFAULT_POLICY.idleTimeoutMs,
    remember: Boolean(rememberMe)
  });

  res.cookie(COOKIE_NAME, session.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: ttlMs
  });

  return ok(res, { user, session: { id: session.id, expiresAt: session.expiresAt, idleTimeoutMs: session.idleTimeoutMs } });
});

app.post('/logout', (req, res) => {
  sessions.destroy(req.cookies[COOKIE_NAME]);
  res.clearCookie(COOKIE_NAME);
  return ok(res, { loggedOut: true });
});

app.get('/me', (req, res) => {
  const session = getSession(req);
  if (!session) return fail(res, 401, 'UNAUTHENTICATED', 'No active session');
  return ok(res, { user: session.user, session: { id: session.id, expiresAt: session.expiresAt } });
});

app.get('/protected', requireAuth, (req, res) => {
  return ok(res, { resource: 'site-a-protected-data', user: req.session.user });
});

app.post('/force-expire', (req, res) => {
  sessions.forceExpire(req.cookies[COOKIE_NAME]);
  return ok(res, { expired: true });
});

app.get('/fixtures', (_req, res) => {
  return ok(res, {
    users: FIXTURE_USERS.map(({ password, ...rest }) => rest),
    credentials: { username: 'alice', password: 'password123' },
    policy: DEFAULT_POLICY,
    routes: ['/login', '/logout', '/me', '/protected', '/force-expire']
  });
});

function start(port = 3001) {
  return app.listen(port, () => {
    console.log(`Site A listening on ${port}`);
  });
}

module.exports = { app, start };
