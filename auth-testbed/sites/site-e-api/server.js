const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../../common/fixtures');
const { ok, fail } = require('../../common/response');
const { installCsrf } = require('../../common/security');

const app = express();
app.use(express.json());
app.use(cookieParser());
installCsrf(app);
const authLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });

const JWT_SECRET = process.env.SITE_E_JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : crypto.randomBytes(32).toString('hex'));
if (!JWT_SECRET) {
  throw new Error('SITE_E_JWT_SECRET is required in production');
}
if (!process.env.SITE_E_JWT_SECRET && process.env.NODE_ENV !== 'production') {
  console.warn('SITE_E_JWT_SECRET not set; using ephemeral secret for this process');
}
const ACCESS_TTL_SECONDS = Number(process.env.SITE_E_ACCESS_TTL_SECONDS || 60);
const REFRESH_COOKIE = 'site_e_refresh';
const refreshStore = new Map();

function issueAccessToken(user) {
  return jwt.sign({ sub: user.id, username: user.username, roles: user.roles }, JWT_SECRET, { expiresIn: ACCESS_TTL_SECONDS });
}

function issueRefreshToken(user) {
  const token = `rt_${crypto.randomUUID()}`;
  refreshStore.set(token, { user, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  return token;
}

function rotateRefreshToken(oldToken, user) {
  refreshStore.delete(oldToken);
  return issueRefreshToken(user);
}

app.get('/', (_req, res) => res.type('text/plain').send('Site E API'));

app.post('/login', authLimiter, (req, res) => {
  const { username, password } = req.body || {};
  const user = authenticate(username, password);
  if (!user) return fail(res, 401, 'BAD_CREDENTIALS', 'Invalid credentials');

  const refreshToken = issueRefreshToken(user);
  const accessToken = issueAccessToken(user);
  res.cookie(REFRESH_COOKIE, refreshToken, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
  return ok(res, { accessToken, expiresIn: ACCESS_TTL_SECONDS, user });
});

app.post('/refresh', authLimiter, (req, res) => {
  const current = req.cookies[REFRESH_COOKIE];
  const entry = refreshStore.get(current);
  if (!entry || entry.expiresAt < Date.now()) {
    return fail(res, 401, 'REFRESH_INVALID', 'Refresh token invalid or expired');
  }

  const user = entry.user;
  const newRefresh = rotateRefreshToken(current, user);
  const accessToken = issueAccessToken(user);
  res.cookie(REFRESH_COOKIE, newRefresh, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
  return ok(res, { accessToken, expiresIn: ACCESS_TTL_SECONDS, rotated: true });
});

app.get('/me', authLimiter, (req, res) => {
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

app.get('/protected', authLimiter, (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return fail(res, 401, 'UNAUTHENTICATED', 'Authorization header required');
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return ok(res, { resource: 'site-e-protected', user: { id: payload.sub, username: payload.username, roles: payload.roles } });
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
