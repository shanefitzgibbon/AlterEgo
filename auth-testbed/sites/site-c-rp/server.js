const express = require('express');
const cookieParser = require('cookie-parser');
const { ok, fail } = require('../../common/response');
const { SessionStore } = require('../../common/session-store');

const app = express();
const sessions = new SessionStore();

const IDP_URL = process.env.SITE_C_IDP_URL || 'http://localhost:3021';
const RP_URL = process.env.SITE_C_RP_URL || 'http://localhost:3022';
const CLIENT_ID = process.env.SITE_C_CLIENT_ID || 'site-c-rp';
const CLIENT_SECRET = process.env.SITE_C_CLIENT_SECRET || 'site-c-secret';
const COOKIE_NAME = 'site_c_sid';

app.use(express.json());
app.use(cookieParser());

app.get('/', (_req, res) => res.type('text/plain').send('Site C RP'));

app.get('/login', (_req, res) => {
  const state = Math.random().toString(36).slice(2, 12);
  const authUrl = new URL(`${IDP_URL}/authorize`);
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', `${RP_URL}/callback`);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('username', 'alice');
  authUrl.searchParams.set('password', 'password123');
  return res.redirect(authUrl.toString());
});

app.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return fail(res, 400, 'BAD_REQUEST', 'Missing code');

  const tokenResponse = await fetch(`${IDP_URL}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: `${RP_URL}/callback`
    })
  });

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text();
    return fail(res, 401, 'TOKEN_EXCHANGE_FAILED', 'Token exchange failed', text);
  }

  const tokenBody = await tokenResponse.json();
  const session = sessions.createSession(tokenBody.data.user, { ttlMs: 15 * 60 * 1000, idleTimeoutMs: 5 * 60 * 1000, metadata: { accessToken: tokenBody.data.access_token } });
  res.cookie(COOKIE_NAME, session.id, { httpOnly: true, sameSite: 'lax' });
  return res.redirect('/protected');
});

app.get('/me', (req, res) => {
  const session = sessions.getSession(req.cookies[COOKIE_NAME]);
  if (!session) return fail(res, 401, 'UNAUTHENTICATED', 'No RP session');
  return ok(res, { user: session.user });
});

app.get('/protected', (req, res) => {
  const session = sessions.touch(req.cookies[COOKIE_NAME]);
  if (!session) return fail(res, 401, 'UNAUTHENTICATED', 'No RP session');
  return ok(res, { resource: 'site-c-protected', user: session.user });
});

app.post('/logout', (req, res) => {
  sessions.destroy(req.cookies[COOKIE_NAME]);
  res.clearCookie(COOKIE_NAME);
  return res.redirect(`${IDP_URL}/`);
});

function start(port = 3022) {
  return app.listen(port, () => console.log(`Site C RP listening on ${port}`));
}

module.exports = { app, start };
