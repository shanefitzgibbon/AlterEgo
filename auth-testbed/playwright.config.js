/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3001'
  },
  fullyParallel: false,
  workers: 1
};
