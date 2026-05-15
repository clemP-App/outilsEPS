/**
 * Service worker — cache des pages et assets pour installation PWA.
 */
var CACHE_NAME = "outils-eps-v11";

var PRECACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./data-manager.js",
  "./class-import.js",
  "./tool-info.js",
  "./pwa-register.js",
  "./pwa-install-banner.js",
  "./manifest.webmanifest",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/apple-touch-icon.png",
  "./outils/ecartement-plots.html",
  "./outils/convertisseur-allure.html",
  "./outils/vitesse-course.html",
  "./outils/vitesse-course.js",
  "./outils/composition-equipes.html",
  "./outils/composition-equipes.js",
  "./outils/dispenses-eps.html",
  "./outils/dispenses-eps.js",
  "./outils/championnat-poule.html",
  "./outils/championnat-poule.js",
  "./outils/timer-hiit-tabata.html",
  "./outils/timer-hiit-tabata.js",
  "./outils/classes.html",
  "./outils/classes.js",
  "./outils/tirage-au-sort.html",
  "./outils/tirage-au-sort.js",
  "./outils/calcul-1rm.html",
  "./outils/calcul-1rm.js",
  "./outils/compteur-bonus.html",
  "./outils/compteur-bonus.js",
  "./outils/sauvegarde.html",
  "./outils/sauvegarde.js",
  "./vendor/jspdf.umd.min.js",
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) {
            return key !== CACHE_NAME;
          })
          .map(function (key) {
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var network = fetch(event.request)
        .then(function (response) {
          if (response && response.status === 200 && response.type === "basic") {
            var copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(event.request, copy);
            });
          }
          return response;
        })
        .catch(function () {
          return cached;
        });

      if (event.request.mode === "navigate") {
        return network.catch(function () {
          return cached || caches.match("./index.html");
        });
      }

      return cached || network;
    })
  );
});
