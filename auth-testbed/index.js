const { start: startA } = require('./sites/site-a/server');
const { start: startBAuth } = require('./sites/site-b-auth/server');
const { start: startBApp } = require('./sites/site-b-app/server');
const { start: startBApi } = require('./sites/site-b-api/server');
const { start: startCIdp } = require('./sites/site-c-idp/server');
const { start: startCRp } = require('./sites/site-c-rp/server');
const { start: startD } = require('./sites/site-d/server');
const { start: startEApi } = require('./sites/site-e-api/server');
const { start: startESpa } = require('./sites/site-e-spa/server');
const { start: startF } = require('./sites/site-f/server');

function startAll() {
  const servers = [
    startA(3001),
    startBAuth(3011),
    startBApp(3012),
    startBApi(3013),
    startCIdp(3021),
    startCRp(3022),
    startD(3031),
    startEApi(3041),
    startESpa(3042),
    startF(3051)
  ];

  process.on('SIGINT', () => {
    servers.forEach((server) => server.close());
    process.exit(0);
  });

  console.log('Auth test-bed started.');
}

if (require.main === module) {
  startAll();
}

module.exports = { startAll };
