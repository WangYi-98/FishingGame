// Offline support: keeps a copy of the game on the iPad.
// Change VERSION whenever you update any file, so iPads pick up the new version.
const VERSION = 'fishing-v6';
const FILES = [
  "./",
  "index.html",
  "game.js",
  "trials.js",
  "manifest.webmanifest",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "images/1_1.png",
  "images/1_2.png",
  "images/1_3.png",
  "images/1_4.png",
  "images/2_1.png",
  "images/2_2.png",
  "images/2_3.png",
  "images/3_1.png",
  "images/3_2.png",
  "images/4_1.png",
  "images/basket_blue.png",
  "images/basket_brown.png",
  "images/basket_orange.png",
  "images/how_step1.png",
  "images/how_step2.png",
  "images/how_step3.png",
  "images/how_step4.png",
  "images/lb_panel.png",
  "images/lb_ranks.png",
  "images/medal_1.png",
  "images/medal_2.png",
  "images/medal_3.png",
  "images/medal_4.png",
  "images/net_narrow.png",
  "images/net_wide.png",
  "images/pick_panel.png",
  "images/player_1.png",
  "images/player_2.png",
  "images/player_3.png",
  "images/player_4.png",
  "images/player_5.png",
  "images/player_6.png",
  "images/player_7.png",
  "images/player_8.png",
  "images/player_you.png",
  "images/pond.png",
  "images/row_highlight.png",
  "images/splash.png",
  "images/stars_h10.png",
  "images/stars_h2.png",
  "images/stars_h3.png",
  "images/stars_h4.png",
  "images/stars_h5.png",
  "images/stars_h6.png",
  "images/stars_h7.png",
  "images/stars_h8.png",
  "images/stars_h9.png"
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// cached copy first (works offline); fall back to the network
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(hit => hit || fetch(event.request))
  );
});
