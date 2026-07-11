function ok(res, data) {
  return res.json({ ok: true, data, error: null });
}

function fail(res, status, code, message, details = null) {
  return res.status(status).json({
    ok: false,
    data: null,
    error: { code, message, details }
  });
}

module.exports = { ok, fail };
