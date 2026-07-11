const express = require('express');

const app = express();
const API_URL = process.env.SITE_E_API_URL || 'http://localhost:3041';

app.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html><html><body>
<h1>Site E SPA</h1>
<p>Use this to test access-token refresh behavior.</p>
<script>
let accessToken = null;
async function login(){
  const res = await fetch('${API_URL}/login', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({username:'alice', password:'password123'})});
  const body = await res.json();
  accessToken = body.data.accessToken;
  document.getElementById('out').textContent = JSON.stringify(body, null, 2);
}
async function me(){
  const res = await fetch('${API_URL}/me', {headers:{authorization: 'Bearer ' + accessToken}});
  document.getElementById('out').textContent = await res.text();
}
async function refresh(){
  const res = await fetch('${API_URL}/refresh', {method:'POST'});
  const body = await res.json();
  if (body.ok) accessToken = body.data.accessToken;
  document.getElementById('out').textContent = JSON.stringify(body, null, 2);
}
</script>
<button onclick="login()">Login</button>
<button onclick="me()">/me</button>
<button onclick="refresh()">Refresh</button>
<pre id="out"></pre>
</body></html>`);
});

function start(port = 3042) {
  return app.listen(port, () => console.log(`Site E SPA listening on ${port}`));
}

module.exports = { app, start };
