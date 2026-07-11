const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const { authenticate } = require('../../common/fixtures');
const { ok, fail } = require('../../common/response');
const { SessionStore } = require('../../common/session-store');
const { createRateLimiter, installCsrf, safeRedirect } = require('../../common/security');

const app = express();
const sessions = new SessionStore();
const COOKIE_NAME = 'site_f_sid';
const CSRF_COOKIE = 'site_f_csrf';

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
installCsrf(app, { cookieName: CSRF_COOKIE });
const authLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });

app.get('/', (_req, res) => res.type('text/plain').send('Site F enterprise auth variants'));

app.get('/login', (_req, res) => {
  const token = crypto.randomBytes(12).toString('hex');
  res.cookie(CSRF_COOKIE, token, { httpOnly: false, sameSite: 'strict' });
  res.type('html').send(`<!doctype html><html><body>
<h1>Site F CSRF-protected login</h1>
<form method="post" action="/login">
<input type="hidden" name="csrf" value="${token}" />
<input name="username" value="alice" />
<input type="password" name="password" value="password123" />
<button type="submit">Login</button>
</form>
</body></html>`);
});

app.post('/login', authLimiter, (req, res) => {
  const csrfBody = req.body.csrf;
  const csrfCookie = req.cookies[CSRF_COOKIE];
  if (!csrfBody || !csrfCookie || csrfBody !== csrfCookie) {
    return fail(res, 403, 'CSRF_INVALID', 'CSRF token mismatch');
  }

  const user = authenticate(req.body.username, req.body.password);
  if (!user) return fail(res, 401, 'BAD_CREDENTIALS', 'Invalid credentials');

  const session = sessions.createSession(user, { ttlMs: 15 * 60 * 1000, idleTimeoutMs: 5 * 60 * 1000 });
  res.cookie(COOKIE_NAME, session.id, { httpOnly: true, sameSite: 'strict', secure: false });
  return ok(res, { user, authPattern: 'csrf-form-login' });
});

app.get('/sso/sp', (req, res) => {
  const returnTo = safeRedirect(String(req.query.returnTo || ''), [], '/protected');
  const relay = encodeURIComponent(returnTo);
  return res.redirect(`/sso/idp?user=alice&RelayState=${relay}`);
});

app.get('/sso/idp', authLimiter, (req, res) => {
  const username = req.query.user || 'alice';
  const relayState = safeRedirect(String(req.query.RelayState || ''), [], '/protected');
  const user = authenticate(username, 'password123');
  if (!user) return fail(res, 401, 'BAD_CREDENTIALS', 'Invalid user');

  const session = sessions.createSession(user, { ttlMs: 15 * 60 * 1000, idleTimeoutMs: 5 * 60 * 1000, metadata: { pattern: 'idp-initiated' } });
  res.cookie(COOKIE_NAME, session.id, { httpOnly: true, sameSite: 'strict' });
  return res.redirect(relayState);
});

app.get('/me', (req, res) => {
  const session = sessions.getSession(req.cookies[COOKIE_NAME]);
  if (!session) return fail(res, 401, 'UNAUTHENTICATED', 'No active session');
  return ok(res, { user: session.user, sameSite: 'Strict' });
});

app.get('/protected', (req, res) => {
  const session = sessions.touch(req.cookies[COOKIE_NAME]);
  if (!session) return fail(res, 401, 'UNAUTHENTICATED', 'No active session');
  return ok(res, { resource: 'site-f-enterprise-protected', user: session.user });
});

app.post('/logout', (req, res) => {
  sessions.destroy(req.cookies[COOKIE_NAME]);
  res.clearCookie(COOKIE_NAME);
  return ok(res, { loggedOut: true });
});

app.post('/force-expire', (req, res) => {
  sessions.forceExpire(req.cookies[COOKIE_NAME]);
  return ok(res, { expired: true });
});

function start(port = 3051) {
  return app.listen(port, () => console.log(`Site F listening on ${port}`));
}

module.exports = { app, start };
