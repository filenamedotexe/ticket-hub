if (!self.define) {
  let e,
    s = {};
  const n = (n, t) => (
    (n = new URL(n + '.js', t).href),
    s[n] ||
      new Promise(s => {
        if ('document' in self) {
          const e = document.createElement('script');
          (e.src = n), (e.onload = s), document.head.appendChild(e);
        } else (e = n), importScripts(n), s();
      }).then(() => {
        let e = s[n];
        if (!e) throw new Error(`Module ${n} didn’t register its module`);
        return e;
      })
  );
  self.define = (t, a) => {
    const i =
      e ||
      ('document' in self ? document.currentScript.src : '') ||
      location.href;
    if (s[i]) return;
    let c = {};
    const r = e => n(e, i),
      o = { module: { uri: i }, exports: c, require: r };
    s[i] = Promise.all(t.map(e => o[e] || r(e))).then(e => (a(...e), c));
  };
}
define(['./workbox-49f2c8c8'], function (e) {
  'use strict';
  importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: '/_next/app-build-manifest.json',
          revision: '2f53ba5d450870a8aa1ae99efe641720',
        },
        {
          url: '/_next/static/QH5UxpsdRqYNLO1RryLPv/_buildManifest.js',
          revision: '6677a9e066694954fb910a86581826c5',
        },
        {
          url: '/_next/static/QH5UxpsdRqYNLO1RryLPv/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933',
        },
        {
          url: '/_next/static/chunks/101-9bc9b9c54e1ee3c0.js',
          revision: 'QH5UxpsdRqYNLO1RryLPv',
        },
        {
          url: '/_next/static/chunks/223-92a831c0edb1f09d.js',
          revision: 'QH5UxpsdRqYNLO1RryLPv',
        },
        {
          url: '/_next/static/chunks/315-e3bab6619bc4606e.js',
          revision: 'QH5UxpsdRqYNLO1RryLPv',
        },
        {
          url: '/_next/static/chunks/87c73c54-8463ef93e2ca3d77.js',
          revision: 'QH5UxpsdRqYNLO1RryLPv',
        },
        {
          url: '/_next/static/chunks/app/_not-found/page-3285b7f71ecb259b.js',
          revision: 'QH5UxpsdRqYNLO1RryLPv',
        },
        {
          url: '/_next/static/chunks/app/api/auth/%5B...nextauth%5D/route-868edef032695ec7.js',
          revision: 'QH5UxpsdRqYNLO1RryLPv',
        },
        {
          url: '/_next/static/chunks/app/auth/signin/page-f36f48409c6085e3.js',
          revision: 'QH5UxpsdRqYNLO1RryLPv',
        },
        {
          url: '/_next/static/chunks/app/auth/verify-request/page-dc0031c7b50e4310.js',
          revision: 'QH5UxpsdRqYNLO1RryLPv',
        },
        {
          url: '/_next/static/chunks/app/dashboard/page-423b2c6bd3e9a2d9.js',
          revision: 'QH5UxpsdRqYNLO1RryLPv',
        },
        {
          url: '/_next/static/chunks/app/layout-e089b70ce1db121c.js',
          revision: 'QH5UxpsdRqYNLO1RryLPv',
        },
        {
          url: '/_next/static/chunks/app/page-abd14c95b7a322b6.js',
          revision: 'QH5UxpsdRqYNLO1RryLPv',
        },
        {
          url: '/_next/static/chunks/framework-a306ef668059fb4f.js',
          revision: 'QH5UxpsdRqYNLO1RryLPv',
        },
        {
          url: '/_next/static/chunks/main-79a4b73cc4fc64f9.js',
          revision: 'QH5UxpsdRqYNLO1RryLPv',
        },
        {
          url: '/_next/static/chunks/main-app-7785ed86b585df77.js',
          revision: 'QH5UxpsdRqYNLO1RryLPv',
        },
        {
          url: '/_next/static/chunks/pages/_app-a48f070af90c9683.js',
          revision: 'QH5UxpsdRqYNLO1RryLPv',
        },
        {
          url: '/_next/static/chunks/pages/_error-b8c2e08355edc3b4.js',
          revision: 'QH5UxpsdRqYNLO1RryLPv',
        },
        {
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
          revision: '846118c33b2c0e922d7b3a7676f81f6f',
        },
        {
          url: '/_next/static/chunks/webpack-724b7060e3e55f5f.js',
          revision: 'QH5UxpsdRqYNLO1RryLPv',
        },
        {
          url: '/_next/static/css/c718ec260c9e93ad.css',
          revision: 'c718ec260c9e93ad',
        },
        { url: '/manifest.json', revision: 'f7052c9d8907710d400ac4946869a094' },
      ],
      { ignoreURLParametersMatching: [] }
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      '/',
      new e.NetworkFirst({
        cacheName: 'start-url',
        plugins: [
          {
            cacheWillUpdate: async ({
              request: e,
              response: s,
              event: n,
              state: t,
            }) =>
              s && 'opaqueredirect' === s.type
                ? new Response(s.body, {
                    status: 200,
                    statusText: 'OK',
                    headers: s.headers,
                  })
                : s,
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      new e.CacheFirst({
        cacheName: 'google-fonts-webfonts',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      new e.StaleWhileRevalidate({
        cacheName: 'google-fonts-stylesheets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-font-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-image-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\/_next\/image\?url=.+$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'next-image',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:mp3|wav|ogg)$/i,
      new e.CacheFirst({
        cacheName: 'static-audio-assets',
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:mp4)$/i,
      new e.CacheFirst({
        cacheName: 'static-video-assets',
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:js)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-js-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:css|less)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-style-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\/_next\/data\/.+\/.+\.json$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'next-data',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:json|xml|csv)$/i,
      new e.NetworkFirst({
        cacheName: 'static-data-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      ({ url: e }) => {
        if (!(self.origin === e.origin)) return !1;
        const s = e.pathname;
        return !s.startsWith('/api/auth/') && !!s.startsWith('/api/');
      },
      new e.NetworkFirst({
        cacheName: 'apis',
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      ({ url: e }) => {
        if (!(self.origin === e.origin)) return !1;
        return !e.pathname.startsWith('/api/');
      },
      new e.NetworkFirst({
        cacheName: 'others',
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      ({ url: e }) => !(self.origin === e.origin),
      new e.NetworkFirst({
        cacheName: 'cross-origin',
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 }),
        ],
      }),
      'GET'
    );
});
