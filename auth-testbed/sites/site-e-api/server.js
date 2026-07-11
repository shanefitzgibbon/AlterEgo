const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { authenticate } = require('../../common/fixtures');
const { ok, fail } = require('../../common/response');

const app = express();
app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = process.env.SITE_E_JWT_SECRET || 'site-e-jwt-secret';
const ACCESS_TTL_SECONDS = Number(process.env.SITE_E_ACCESS_TTL_SECONDS || 60);
const REFRESH_COOKIE = 'site_e_refresh';
const refreshStore = new Map();

function issueAccessToken(user) {
  return jwt.sign({ sub: user.id, username: user.username, roles: user.roles }, JWT_SECRET, { expiresIn: ACCESS_TTL_SECONDS });
}

function issueRefreshToken(userId) {
  const token = `rt_${crypto.randomUUID()}`;
  refreshStore.set(token, { userId, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  return token;
}

function rotateRefreshToken(oldToken, userId) {
  refreshStore.delete(oldToken);
  return issueRefreshToken(userId);
}

app.get('/', (_req, res) => res.type('text/plain').send('Site E API'));

app.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = authenticate(username, password);
  if (!user) return fail(res, 401, 'BAD_CREDENTIALS', 'Invalid credentials');

  const refreshToken = issueRefreshToken(user.id);
  const accessToken = issueAccessToken(user);
  res.cookie(REFRESH_COOKIE, refreshToken, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
  return ok(res, { accessToken, expiresIn: ACCESS_TTL_SECONDS, user });
});

app.post('/refresh', (req, res) => {
  const current = req.cookies[REFRESH_COOKIE];
  const entry = refreshStore.get(current);
  if (!entry || entry.expiresAt < Date.now()) {
    return fail(res, 401, 'REFRESH_INVALID', 'Refresh token invalid or expired');
  }

  const user = { id: entry.userId, username: entry.userId === 'u_alice' ? 'alice' : 'bob', roles: entry.userId === 'u_alice' ? ['user'] : ['admin'] };
  const newRefresh = rotateRefreshToken(current, entry.userId);
  const accessToken = issueAccessToken(user);
  res.cookie(REFRESH_COOKIE, newRefresh, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
  return ok(res, { accessToken, expiresIn: ACCESS_TTL_SECONDS, rotated: true });
});

app.get('/me', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return fail(res, 401, 'UNAUTHENTICATED', 'Authorization header required');

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return ok(res, { user: { id: payload.sub, username: payload.username, roles: payload.roles } });
  } catch {
    return fail(res, 401, 'TOKEN_INVALID', 'Access token invalid or expired');
  }
});

app.post('/logout', (req, res) => {
  const current = req.cookies[REFRESH_COOKIE];
  if (current) refreshStore.delete(current);
  res.clearCookie(REFRESH_COOKIE);
  return ok(res, { loggedOut: true });
});

function start(port = 3041) {
  return app.listen(port, () => console.log(`Site E API listening on ${port}`));
}

module.exports = { app, start };
