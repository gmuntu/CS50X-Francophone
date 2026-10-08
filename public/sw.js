/* Savoiria — service worker (application installable + mode hors ligne).
 * - Pages : réseau d'abord, copie en cache en secours (hors ligne).
 * - Fichiers techniques (/_next/static, icônes) : cache d'abord.
 * - Podcasts : uniquement ceux que l'élève a téléchargés, lus depuis le cache
 *   avec prise en charge des requêtes "Range" (nécessaires aux lecteurs audio).
 */
const VERSION = 'v1'; // ne pas changer sans raison : les cours enregistrés en dépendent
const PAGES = `savoiria-pages-${VERSION}`;
// Fichiers techniques : à augmenter quand le logo ou les icônes changent (ne touche pas aux cours enregistrés).
const STATIC_VERSION = 'v2-logo-bleu';
const STATIC = `savoiria-static-${STATIC_VERSION}`;
const AUDIO = 'savoiria-audio'; // non versionné : on garde les podcasts téléchargés entre les mises à jour
const OFFLINE_URL = '/hors-ligne';
const PRECACHE = [OFFLINE_URL, '/icons/icon-192.png', '/icons/icon-512.png', '/icons/favicon-64.png', '/brand/logo-mark.png', '/brand/logo-mark-light.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => ![PAGES, STATIC, AUDIO].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const NAV_TIMEOUT = 4000;

async function navigate(req, url) {
  const key = pageKey(req.url);
  const cached = await caches.match(key);
  const network = fetch(req).then((res) => {
    if (res.ok && !res.redirected && !url.pathname.startsWith('/auth') && !url.pathname.startsWith('/admin')) {
      const copy = res.clone();
      caches.open(PAGES).then((c) => c.put(key, copy));
    }
    return res;
  });
  if (!cached) return network.catch(async () => (await caches.match(OFFLINE_URL)) || Response.error());
  const timeout = new Promise((resolve) => setTimeout(() => resolve(cached), NAV_TIMEOUT));
  return Promise.race([network.catch(() => cached), timeout]);
}

const pageKey = (url) => {
  const u = new URL(url, self.location.origin);
  return u.origin + u.pathname;
};

async function rangeResponse(request, cached) {
  const range = request.headers.get('range');
  if (!range) return cached;
  const buf = await cached.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  const size = buf.byteLength;
  let start = m && m[1] ? parseInt(m[1], 10) : 0;
  let end = m && m[2] ? parseInt(m[2], 10) : size - 1;
  if (m && !m[1] && m[2]) { start = size - parseInt(m[2], 10); end = size - 1; }
  end = Math.min(end, size - 1);
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      'Content-Type': cached.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
    },
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 1) Podcasts téléchargés (même domaine ou externe)
  if (req.destination === 'audio' || /\.(mp3|m4a|ogg|wav)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(AUDIO).then(async (c) => {
        const hit = await c.match(req.url, { ignoreSearch: true });
        return hit ? rangeResponse(req, hit) : fetch(req);
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // 2) Pages (navigation) : réseau d'abord, mais si une copie existe et que le réseau
  //    met plus de NAV_TIMEOUT ms (réseau lent / 2G), on affiche la copie tout de suite.
  if (req.mode === 'navigate') {
    event.respondWith(navigate(req, url));
    return;
  }

  // 3a) Logo et icônes : copie affichée tout de suite, puis mise à jour en arrière-plan
  //     (un nouveau logo apparaît dès la visite suivante).
  if (url.pathname.startsWith('/icons/') || url.pathname.startsWith('/brand/')) {
    event.respondWith(
      caches.open(STATIC).then(async (c) => {
        const hit = await c.match(req);
        const fresh = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; });
        if (hit) { event.waitUntil(fresh.catch(() => {})); return hit; }
        return fresh;
      })
    );
    return;
  }

  // 3b) Fichiers techniques immuables
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/_next/image')) {
    event.respondWith(
      caches.match(req).then((hit) =>
        hit || fetch(req).then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(STATIC).then((c) => c.put(req, copy)); }
          return res;
        })
      )
    );
  }
});

// Messages envoyés par le site (bouton « Disponible hors ligne », déconnexion)
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'CLEAR_USER_DATA') {
    event.waitUntil(Promise.all([caches.delete(PAGES), caches.delete(AUDIO), caches.delete('savoiria-meta')]));
  }
});
