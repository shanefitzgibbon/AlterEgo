const express = require('express');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../../common/fixtures');
const { ok, fail } = require('../../common/response');
const { createRateLimiter } = require('../../common/security');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
const authLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });

const codes = new Map();
const CLIENT_ID = process.env.SITE_C_CLIENT_ID || 'site-c-rp';
const CLIENT_SECRET = process.env.SITE_C_CLIENT_SECRET || 'site-c-secret';
const JWT_SECRET = process.env.SITE_C_JWT_SECRET || 'site-c-jwt-secret';

app.get('/', (_req, res) => res.type('text/plain').send('Site C IdP'));

app.get('/authorize', authLimiter, (req, res) => {
  const { client_id, redirect_uri, state, username = 'alice' } = req.query;
  if (client_id !== CLIENT_ID) return fail(res, 400, 'BAD_CLIENT', 'Unknown client_id');
  if (!redirect_uri) return fail(res, 400, 'BAD_REQUEST', 'redirect_uri required');

  const user = authenticate(username, 'password123');
  if (!user) return fail(res, 401, 'BAD_CREDENTIALS', 'Invalid fixture credentials');

  const code = `code_${Math.random().toString(36).slice(2, 10)}`;
  codes.set(code, { user, clientId: client_id, redirectUri: redirect_uri, expiresAt: Date.now() + 60_000 });

  const callback = new URL(redirect_uri);
  callback.searchParams.set('code', code);
  if (state) callback.searchParams.set('state', state);
  return res.redirect(callback.toString());
});

app.post('/token', authLimiter, (req, res) => {
  const { code, client_id, client_secret, redirect_uri } = req.body || {};
  const entry = codes.get(code);
  if (!entry) return fail(res, 400, 'INVALID_CODE', 'Unknown code');
  if (Date.now() > entry.expiresAt) return fail(res, 400, 'EXPIRED_CODE', 'Code expired');
  if (client_id !== CLIENT_ID || client_secret !== CLIENT_SECRET) return fail(res, 401, 'BAD_CLIENT', 'Invalid client credentials');
  if (redirect_uri !== entry.redirectUri) return fail(res, 400, 'BAD_REDIRECT', 'redirect_uri mismatch');

  codes.delete(code);
  const accessToken = jwt.sign({ sub: entry.user.id, username: entry.user.username, roles: entry.user.roles }, JWT_SECRET, { expiresIn: '5m' });
  return ok(res, { token_type: 'Bearer', access_token: accessToken, expires_in: 300, user: entry.user });
});

function start(port = 3021) {
  return app.listen(port, () => console.log(`Site C IdP listening on ${port}`));
}

module.exports = { app, start };
