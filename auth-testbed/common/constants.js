const ROUTES = {
  login: '/login',
  logout: '/logout',
  me: '/me',
  protected: '/protected'
};

const DEFAULT_POLICY = {
  sessionTtlMs: 15 * 60 * 1000,
  rememberMeTtlMs: 7 * 24 * 60 * 60 * 1000,
  idleTimeoutMs: 5 * 60 * 1000
};

module.exports = { ROUTES, DEFAULT_POLICY };
