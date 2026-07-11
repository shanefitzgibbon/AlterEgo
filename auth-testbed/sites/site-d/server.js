const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../../common/fixtures');
const { ok, fail } = require('../../common/response');
const { SessionStore } = require('../../common/session-store');
const { installCsrf } = require('../../common/security');

const app = express();
const sessions = new SessionStore();
const challenges = new Map();
const rememberedDevices = new Map();

const SESSION_COOKIE = 'site_d_sid';
const DEVICE_COOKIE = 'site_d_device';
const MFA_CODE = '000999';

app.use(express.json());
app.use(cookieParser());
installCsrf(app);
const authLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });

app.get('/', (_req, res) => res.type('text/plain').send('Site D MFA step-up auth'));

app.post('/login', authLimiter, (req, res) => {
  const { username, password } = req.body || {};
  const user = authenticate(username, password);
  if (!user) return fail(res, 401, 'BAD_CREDENTIALS', 'Invalid credentials');

  const deviceId = req.cookies[DEVICE_COOKIE];
  if (deviceId && rememberedDevices.get(deviceId) === user.id) {
    const session = sessions.createSession(user, { ttlMs: 15 * 60 * 1000, idleTimeoutMs: 5 * 60 * 1000 });
    res.cookie(SESSION_COOKIE, session.id, { httpOnly: true, sameSite: 'lax' });
    return ok(res, { user, mfaRequired: false, rememberedDevice: true });
  }

  const challengeId = crypto.randomUUID();
  challenges.set(challengeId, { user, expiresAt: Date.now() + 2 * 60 * 1000 });
  return ok(res, { mfaRequired: true, challengeId, deterministicCode: MFA_CODE });
});

app.post('/mfa/verify', authLimiter, (req, res) => {
  const { challengeId, code, rememberDevice = false } = req.body || {};
  const challenge = challenges.get(challengeId);
  if (!challenge || challenge.expiresAt < Date.now()) {
    return fail(res, 400, 'INVALID_CHALLENGE', 'Challenge is invalid or expired');
  }

  if (code !== MFA_CODE) return fail(res, 401, 'BAD_MFA_CODE', 'Incorrect MFA code');

  challenges.delete(challengeId);
  const session = sessions.createSession(challenge.user, { ttlMs: 15 * 60 * 1000, idleTimeoutMs: 5 * 60 * 1000 });
  res.cookie(SESSION_COOKIE, session.id, { httpOnly: true, sameSite: 'lax' });

  if (rememberDevice) {
    const deviceId = crypto.randomUUID();
    rememberedDevices.set(deviceId, challenge.user.id);
    res.cookie(DEVICE_COOKIE, deviceId, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 });
  }

  return ok(res, { user: challenge.user, mfaRequired: false });
});

app.get('/me', (req, res) => {
  const session = sessions.getSession(req.cookies[SESSION_COOKIE]);
  if (!session) return fail(res, 401, 'UNAUTHENTICATED', 'No active session');
  return ok(res, { user: session.user });
});

app.get('/protected', (req, res) => {
  const session = sessions.touch(req.cookies[SESSION_COOKIE]);
  if (!session) return fail(res, 401, 'UNAUTHENTICATED', 'No active session');
  return ok(res, { resource: 'site-d-protected', user: session.user });
});

app.post('/logout', (req, res) => {
  sessions.destroy(req.cookies[SESSION_COOKIE]);
  res.clearCookie(SESSION_COOKIE);
  return ok(res, { loggedOut: true });
});

app.post('/force-expire', (req, res) => {
  sessions.forceExpire(req.cookies[SESSION_COOKIE]);
  return ok(res, { expired: true });
});

function start(port = 3031) {
  return app.listen(port, () => console.log(`Site D listening on ${port}`));
}

module.exports = { app, start };
