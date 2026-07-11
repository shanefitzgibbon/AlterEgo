const crypto = require('crypto');

function escapeHtml(input) {
  return String(input)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function createRateLimiter({ windowMs = 60_000, max = 30 } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    const key = `${req.ip || 'unknown'}:${req.path}`;
    const now = Date.now();
    const entry = hits.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }
    entry.count += 1;
    hits.set(key, entry);

    if (entry.count > max) {
      res.status(429).json({ ok: false, data: null, error: { code: 'RATE_LIMITED', message: 'Too many requests', details: null } });
      return;
    }

    next();
  };
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

    if (!cookieToken || !token || cookieToken !== token) {
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

module.exports = { escapeHtml, createRateLimiter, installCsrf, safeRedirect };
