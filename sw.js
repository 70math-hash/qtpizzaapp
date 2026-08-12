// Service worker do QT PizzApp.
// HTML: rede primeiro, para cada deploy chegar na hora; o cache é reserva
// para abrir offline. Demais arquivos (ícones, fontes): cache primeiro.
// Dados do Supabase nunca passam por aqui — sincronização é sempre rede.
const CACHE = 'qtpizzapp-v2';
const SHELL = ['/', '/qt_pizzapp.html', '/manifest.webmanifest',
  '/icons/negativa/icon-192.png', '/icons/negativa/icon-512.png',
  '/icons/negativa/apple-touch-icon.png', '/icons/negativa/favicon-32.png',
  '/icons/positiva/favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('.supabase.co')) return;

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => {
      const cp = r.clone();
      caches.open(CACHE).then(c => c.put('/', cp));
      return r;
    }).catch(() => caches.match('/')));
    return;
  }

  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok || r.type === 'opaque') {
      const cp = r.clone();
      caches.open(CACHE).then(c => c.put(req, cp));
    }
    return r;
  })));
});
