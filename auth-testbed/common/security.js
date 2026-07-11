const crypto = require('crypto');

function escapeHtml(input) {
  return String(input)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function installCsrf(app, { cookieName = 'csrf_token' } = {}) {
  app.get('/csrf', (_req, res) => {
    const token = crypto.randomBytes(16).toString('hex');
    res.cookie(cookieName, token, { httpOnly: false, sameSite: 'lax' });
    res.json({ ok: true, data: { csrfToken: token }, error: null });
  });

  app.use((req, res, next) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();

    const cookieToken = req.cookies?.[cookieName];
    const headerToken = req.get('x-csrf-token');
    const bodyToken = req.body?.csrf;
    const token = headerToken || bodyToken;

    const cookieBuf = cookieToken ? Buffer.from(cookieToken) : null;
    const tokenBuf = token ? Buffer.from(token) : null;
    const isValid =
      cookieBuf &&
      tokenBuf &&
      cookieBuf.length === tokenBuf.length &&
      crypto.timingSafeEqual(cookieBuf, tokenBuf);

    if (!isValid) {
      return res.status(403).json({ ok: false, data: null, error: { code: 'CSRF_INVALID', message: 'CSRF token mismatch', details: null } });
    }

    next();
  });
}

function safeRedirect(target, allowedOrigins = [], fallback = '/') {
  try {
    if (target.startsWith('/')) return target;
    const url = new URL(target);
    if (allowedOrigins.includes(url.origin)) return url.toString();
  } catch {
    // ignore
  }
  return fallback;
}

module.exports = { escapeHtml, installCsrf, safeRedirect };
