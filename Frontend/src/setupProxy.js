/*
  Create React App development proxy configuration.
  This forwards API and file requests to the backend while running `npm start`.

  Why add this if package.json already has "proxy": "http://localhost:4000"?
  - On some Windows setups, CRA’s simple proxy can hiccup (IPv6 ::1 vs 127.0.0.1, port binding race, etc.).
  - http-proxy-middleware gives us explicit routes, changeOrigin, and better logs.

  You can override the backend target via one of these environment vars:
  - REACT_APP_BACKEND_URL
  - BACKEND_URL
  - BACKEND_PORT (number; default 4000)
*/

const { createProxyMiddleware } = require('http-proxy-middleware');

function pickTarget() {
  const envUrl =
    process.env.REACT_APP_BACKEND_URL ||
    process.env.BACKEND_URL ||
    '';

  if (envUrl) return envUrl;

  const port = String(process.env.BACKEND_PORT || '4000').replace(/^:+/, '');
  // Prefer 127.0.0.1 to avoid potential IPv6/localhost issues on Windows.
  return `http://127.0.0.1:${port}`;
}

/** @param {import('http').ServerResponse} res */
function onProxyRes(proxyRes, req) {
  // Helpful when debugging proxy issues
  proxyRes.headers['x-dev-proxy'] = 'setupProxy.js';
}

module.exports = function (app) {
  const target = pickTarget();
  const commonOptions = {
    target,
    changeOrigin: true,
    ws: false,
    logLevel: 'silent',
    onProxyRes,
    secure: false,
  };

  // API endpoints
  app.use(
    '/api',
    createProxyMiddleware({
      ...commonOptions,
      // Do not rewrite paths; backend expects /api/...
    })
  );

  // File downloads and media served by backend
  app.use(
    ['/uploads', '/files'],
    createProxyMiddleware({
      ...commonOptions,
    })
  );
};

