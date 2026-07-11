const { test, expect } = require('@playwright/test');

test('site c oauth redirect callback', async ({ request }) => {
  const login = await request.get('http://localhost:3022/login', { maxRedirects: 5 });
  expect(login.ok()).toBeTruthy();

  const protectedRes = await request.get('http://localhost:3022/protected');
  expect(protectedRes.ok()).toBeTruthy();
});

test('site e refresh rotation', async ({ request }) => {
  const login = await request.post('http://localhost:3041/login', {
    data: { username: 'alice', password: 'password123' }
  });
  const loginBody = await login.json();
  expect(loginBody.ok).toBeTruthy();

  const me = await request.get('http://localhost:3041/me', {
    headers: { authorization: 'Bearer ' + loginBody.data.accessToken }
  });
  expect(me.ok()).toBeTruthy();

  const refresh = await request.post('http://localhost:3041/refresh');
  const refreshBody = await refresh.json();
  expect(refreshBody.ok).toBeTruthy();

  const me2 = await request.get('http://localhost:3041/me', {
    headers: { authorization: 'Bearer ' + refreshBody.data.accessToken }
  });
  expect(me2.ok()).toBeTruthy();
});
