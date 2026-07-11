const { test, expect } = require('@playwright/test');

test('site a login/me/logout smoke', async ({ request }) => {
  const csrf = await request.get('http://localhost:3001/csrf');
  const csrfBody = await csrf.json();
  const login = await request.post('http://localhost:3001/login', {
    data: { username: 'alice', password: 'password123', rememberMe: true },
    headers: { 'x-csrf-token': csrfBody.data.csrfToken }
  });
  expect(login.ok()).toBeTruthy();

  const me = await request.get('http://localhost:3001/me');
  expect(me.ok()).toBeTruthy();

  const protectedRes = await request.get('http://localhost:3001/protected');
  expect(protectedRes.ok()).toBeTruthy();

  const logout = await request.post('http://localhost:3001/logout', {
    headers: { 'x-csrf-token': csrfBody.data.csrfToken }
  });
  expect(logout.ok()).toBeTruthy();
});

test('site d mfa flow smoke', async ({ request }) => {
  const csrf = await request.get('http://localhost:3031/csrf');
  const csrfBody = await csrf.json();
  const login = await request.post('http://localhost:3031/login', {
    data: { username: 'alice', password: 'password123' },
    headers: { 'x-csrf-token': csrfBody.data.csrfToken }
  });
  const body = await login.json();
  expect(body.data.mfaRequired).toBeTruthy();

  const verify = await request.post('http://localhost:3031/mfa/verify', {
    data: { challengeId: body.data.challengeId, code: '000999', rememberDevice: true },
    headers: { 'x-csrf-token': csrfBody.data.csrfToken }
  });
  expect(verify.ok()).toBeTruthy();

  const me = await request.get('http://localhost:3031/me');
  expect(me.ok()).toBeTruthy();
});
