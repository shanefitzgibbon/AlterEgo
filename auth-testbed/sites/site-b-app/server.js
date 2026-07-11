const express = require('express');

const app = express();
const AUTH_LOGIN_URL = process.env.SITE_B_AUTH_LOGIN_URL || 'http://localhost:3011/login';
const API_URL = process.env.SITE_B_API_URL || 'http://localhost:3013';
const APP_URL = process.env.SITE_B_APP_URL || 'http://localhost:3012';

app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html><html><body>
<h1>Site B App</h1>
<p>Simulated cross-subdomain flow (app/auth/api).</p>
<a href="${AUTH_LOGIN_URL}?returnTo=${encodeURIComponent(APP_URL + '/after-login')}">Login via auth service</a>
<p><a href="/after-login">After login page</a></p>
</body></html>`);
});

app.get('/after-login', async (req, res) => {
  const meRes = await fetch(`${API_URL}/me`, {
    headers: { cookie: req.headers.cookie || '', accept: 'application/json' }
  });
  const text = await meRes.text();
  res.type('html').send(`<!doctype html><html><body><h2>After login</h2><pre>${text}</pre></body></html>`);
});

function start(port = 3012) {
  return app.listen(port, () => console.log(`Site B app listening on ${port}`));
}

module.exports = { app, start };
