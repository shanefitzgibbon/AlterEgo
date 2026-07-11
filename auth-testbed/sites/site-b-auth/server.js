const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../../common/fixtures');
const { ok, fail } = require('../../common/response');
const { SessionStore } = require('../../common/session-store');
const { DEFAULT_POLICY } = require('../../common/constants');
const { installCsrf, escapeHtml } = require('../../common/security');

const app = express();
const sessions = new SessionStore();
const COOKIE_NAME = 'site_b_sid';
const COOKIE_DOMAIN = process.env.SITE_B_COOKIE_DOMAIN || '.localtest.me';

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
installCsrf(app);
const authLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });
const fixedReturnTo = process.env.SITE_B_DEFAULT_RETURN_TO || 'http://app.localtest.me:3012/after-login';

app.get('/', (_req, res) => res.type('text/plain').send('Site B auth service'));

app.get('/login', (req, res) => {
  const csrfToken = req.cookies.csrf_token || crypto.randomBytes(16).toString('hex');
  res.cookie('csrf_token', csrfToken, { httpOnly: false, sameSite: 'lax' });
  res.type('html').send(`<!doctype html><html><body>
<h1>Site B Login</h1>
<form method="post" action="/login">
<input name="username" value="alice" />
<input name="password" value="password123" type="password" />
<input name="rememberMe" value="true" />
<input name="csrf" value="${escapeHtml(csrfToken)}" type="hidden" />
<input name="returnTo" value="${escapeHtml(fixedReturnTo)}" />
<button type="submit">Login</button>
</form>
</body></html>`);
});

app.post('/login', authLimiter, (req, res) => {
  const { username, password } = req.body;
  const rememberMe = String(req.body.rememberMe) === 'true';
  const returnTo = fixedReturnTo;
  const user = authenticate(username, password);
  if (!user) return fail(res, 401, 'BAD_CREDENTIALS', 'Invalid credentials');

  const ttlMs = rememberMe ? DEFAULT_POLICY.rememberMeTtlMs : DEFAULT_POLICY.sessionTtlMs;
  const session = sessions.createSession(user, { ttlMs, idleTimeoutMs: DEFAULT_POLICY.idleTimeoutMs, remember: rememberMe });

  res.cookie(COOKIE_NAME, session.id, {
    httpOnly: true,
    sameSite: 'lax',
    domain: COOKIE_DOMAIN,
    secure: false,
    maxAge: ttlMs
  });

  if ((req.headers.accept || '').includes('application/json')) {
    return ok(res, { user, returnTo, session: { id: session.id, expiresAt: session.expiresAt } });
  }

  return res.redirect(returnTo);
});

app.post('/logout', (req, res) => {
  sessions.destroy(req.cookies[COOKIE_NAME]);
  res.clearCookie(COOKIE_NAME, { domain: COOKIE_DOMAIN });
  return ok(res, { loggedOut: true });
});

app.get('/session', (req, res) => {
  const session = sessions.touch(req.cookies[COOKIE_NAME]);
  if (!session) return fail(res, 401, 'UNAUTHENTICATED', 'No active session');
  return ok(res, { user: session.user, session: { id: session.id, expiresAt: session.expiresAt } });
});

app.post('/force-expire', (req, res) => {
  sessions.forceExpire(req.cookies[COOKIE_NAME]);
  return ok(res, { expired: true });
});

function start(port = 3011) {
  return app.listen(port, () => console.log(`Site B auth listening on ${port}`));
}

module.exports = { app, start };
