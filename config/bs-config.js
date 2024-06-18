const { createProxyMiddleware } = require('http-proxy-middleware');

const apiProxy = createProxyMiddleware({
  target: 'https://api.dhangodemo.com/v1',
  changeOrigin: true, // for vhosted sites
  pathFilter: '/api',
  pathRewrite: {
    '^/api': '', // remove /api from the path
  }
});

module.exports = {
  server: {
    port: 3000,
    // Start from key `10` in order to NOT overwrite the default 2 middleware provided
    // by `lite-server` or any future ones that might be added.
    // Reference: https://github.com/johnpapa/lite-server/blob/master/lib/config-defaults.js#L16
    middleware: {
      10: apiProxy,
    },
  },
};
