// Service worker: deixa o app abrir mesmo sem internet.
// Os dados das vendas ficam no cache do Firestore (enablePersistence).
const VERSAO = 'grafica-v2';
const ARQUIVOS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
    e.waitUntil(caches.open(VERSAO).then(function (c) { return c.addAll(ARQUIVOS); }));
    self.skipWaiting();
});

self.addEventListener('activate', function (e) {
    e.waitUntil(
        caches.keys().then(function (nomes) {
            return Promise.all(nomes.filter(function (n) { return n !== VERSAO; }).map(function (n) { return caches.delete(n); }));
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', function (e) {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);

    // Chamadas ao Firebase (dados e login) nunca passam pelo cache do service worker
    if (/firestore\.googleapis\.com|identitytoolkit|securetoken|firebaseinstallations/.test(url.hostname)) return;

    // Estratégia: tenta a rede e guarda cópia; se falhar (offline), usa o cache
    e.respondWith(
        fetch(req).then(function (resp) {
            if (resp && (resp.status === 200 || resp.type === 'opaque')) {
                const copia = resp.clone();
                caches.open(VERSAO).then(function (c) { c.put(req, copia); });
            }
            return resp;
        }).catch(function () {
            return caches.match(req).then(function (hit) {
                return hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined);
            });
        })
    );
});
