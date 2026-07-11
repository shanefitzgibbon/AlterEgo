const FIXTURE_USERS = [
  { id: 'u_alice', username: 'alice', password: 'password123', name: 'Alice Example', roles: ['user'] },
  { id: 'u_bob', username: 'bob', password: 'password123', name: 'Bob Example', roles: ['admin'] }
];

const userByUsername = new Map(FIXTURE_USERS.map((u) => [u.username, u]));

function safeUser(user) {
  if (!user) return null;
  return { id: user.id, username: user.username, name: user.name, roles: user.roles };
}

function authenticate(username, password) {
  const user = userByUsername.get(username);
  if (!user || user.password !== password) return null;
  return safeUser(user);
}

module.exports = { FIXTURE_USERS, safeUser, authenticate };
