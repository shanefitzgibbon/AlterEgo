const crypto = require('crypto');

class SessionStore {
  constructor() {
    this.sessions = new Map();
  }

  createSession(user, { ttlMs, idleTimeoutMs, remember = false, metadata = {} }) {
    const id = crypto.randomUUID();
    const now = Date.now();
    const session = {
      id,
      user,
      remember,
      createdAt: now,
      lastActivityAt: now,
      expiresAt: now + ttlMs,
      idleTimeoutMs,
      metadata
    };
    this.sessions.set(id, session);
    return session;
  }

  getSession(id) {
    if (!id) return null;
    const session = this.sessions.get(id);
    if (!session) return null;

    const now = Date.now();
    if (now > session.expiresAt) {
      this.sessions.delete(id);
      return null;
    }

    if (session.idleTimeoutMs && now > session.lastActivityAt + session.idleTimeoutMs) {
      this.sessions.delete(id);
      return null;
    }

    return session;
  }

  touch(id) {
    const session = this.getSession(id);
    if (!session) return null;
    session.lastActivityAt = Date.now();
    return session;
  }

  destroy(id) {
    this.sessions.delete(id);
  }

  forceExpire(id) {
    const session = this.sessions.get(id);
    if (!session) return;
    session.expiresAt = Date.now() - 1;
  }
}

module.exports = { SessionStore };
