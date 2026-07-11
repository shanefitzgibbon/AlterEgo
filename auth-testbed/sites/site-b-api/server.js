const express = require('express');
const cookieParser = require('cookie-parser');
const { ok, fail } = require('../../common/response');

const app = express();
app.use(cookieParser());

const AUTH_SERVICE_URL = process.env.SITE_B_AUTH_URL || 'http://localhost:3011';

async function fetchSession(req) {
  const cookie = req.headers.cookie || '';
  const response = await fetch(`${AUTH_SERVICE_URL}/session`, {
    headers: { cookie, accept: 'application/json' }
  });
  if (!response.ok) return null;
  const body = await response.json();
  return body.data;
}

app.get('/', (_req, res) => res.type('text/plain').send('Site B API service'));

app.get('/me', async (req, res) => {
  const data = await fetchSession(req);
  if (!data) return fail(res, 401, 'UNAUTHENTICATED', 'No active cross-domain session');
  return ok(res, data);
});

app.get('/protected', async (req, res) => {
  const data = await fetchSession(req);
  if (!data) return fail(res, 401, 'UNAUTHENTICATED', 'No active cross-domain session');
  return ok(res, { user: data.user, resource: 'site-b-cross-domain-resource' });
});

function start(port = 3013) {
  return app.listen(port, () => console.log(`Site B API listening on ${port}`));
}

module.exports = { app, start };
