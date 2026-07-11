const mapping = {
  'site-a': { module: './sites/site-a/server', defaultPort: 3001 },
  'site-b-auth': { module: './sites/site-b-auth/server', defaultPort: 3011 },
  'site-b-app': { module: './sites/site-b-app/server', defaultPort: 3012 },
  'site-b-api': { module: './sites/site-b-api/server', defaultPort: 3013 },
  'site-c-idp': { module: './sites/site-c-idp/server', defaultPort: 3021 },
  'site-c-rp': { module: './sites/site-c-rp/server', defaultPort: 3022 },
  'site-d': { module: './sites/site-d/server', defaultPort: 3031 },
  'site-e-api': { module: './sites/site-e-api/server', defaultPort: 3041 },
  'site-e-spa': { module: './sites/site-e-spa/server', defaultPort: 3042 },
  'site-f': { module: './sites/site-f/server', defaultPort: 3051 }
};

const site = process.env.SITE || process.argv[2];
if (!site || !mapping[site]) {
  console.error(`Unknown SITE. Use one of: ${Object.keys(mapping).join(', ')}`);
  process.exit(1);
}

const port = Number(process.env.PORT || mapping[site].defaultPort);
const mod = require(mapping[site].module);
mod.start(port);
