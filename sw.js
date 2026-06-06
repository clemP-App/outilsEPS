/**
 * Service worker — cache PWA (precache tolérant, navigation network-first).
 */
/* global importScripts, caches, fetch, self */
importScripts("./precache-manifest.js");

var CACHE_NAME = CACHE_BUNDLE_NAME;
var DEV = self.location && self.location.hostname === "localhost";

function logWarn() {
  if (DEV && typeof console !== "undefined" && console.warn) {
    console.warn.apply(console, arguments);
  }
}

function precacheTolerant(cache, urls) {
  return Promise.all(
    urls.map(function (url) {
      return cache.add(url).catch(function (err) {
        logWarn("[SW] Precache ignoré:", url, err && err.message ? err.message : err);
      });
    })
  );
}

function isNavigationRequest(request) {
  if (request.mode === "navigate") return true;
  var accept = request.headers.get("Accept") || "";
  return request.method === "GET" && accept.indexOf("text/html") !== -1;
}

function isStaticAsset(url) {
  if (url.pathname.indexOf("/vendor/") !== -1) return true;
  if (url.pathname.indexOf("/assets/") !== -1) return true;
  return /\.(css|js|png|jpe?g|webp|svg|woff2?|webmanifest)$/i.test(url.pathname);
}

function isNetworkFirstToolScript(url) {
  return /\/outils\/photo-finish\.js$/i.test(url.pathname);
}

function isOnlineOnlyEvalCatalog(url) {
  return (
    url.pathname.endsWith("/outils/catalogue-evaluations.html") ||
    url.pathname.endsWith("/outils/catalogue-evaluations.js") ||
    url.pathname.endsWith("/shared/evaluation-rubrics-catalog.json")
  );
}

function onlineOnlyResponse() {
  return new Response(
    "<!doctype html><html lang=\"fr\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Connexion nécessaire</title><body style=\"font-family:system-ui,sans-serif;margin:2rem;line-height:1.5\"><h1>Connexion nécessaire</h1><p>Le catalogue des évaluations est disponible uniquement en ligne.</p></body></html>",
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

function putInCache(request, response) {
  if (!response || response.status !== 200 || response.type !== "basic") return;
  caches.open(CACHE_NAME).then(function (cache) {
    cache.put(request, response.clone());
  });
}

function networkFirstNavigation(request) {
  return fetch(request)
    .then(function (response) {
      putInCache(request, response);
      return response;
    })
    .catch(function () {
      return caches.match(request).then(function (cached) {
        if (cached) return cached;
        return caches.match("./index.html").then(function (indexCached) {
          return indexCached || caches.match("index.html");
        });
      });
    });
}

function staleWhileRevalidate(request) {
  return caches.open(CACHE_NAME).then(function (cache) {
    return cache.match(request).then(function (cached) {
      var networkPromise = fetch(request)
        .then(function (response) {
          if (response && response.status === 200 && response.type === "basic") {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(function () {
          return cached;
        });
      return cached || networkPromise;
    });
  });
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return precacheTolerant(cache, PRECACHE);
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

  if (isOnlineOnlyEvalCatalog(url)) {
    event.respondWith(fetch(event.request).catch(onlineOnlyResponse));
    return;
  }

  if (isNavigationRequest(event.request)) {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  if (isStaticAsset(url)) {
    if (isNetworkFirstToolScript(url)) {
      event.respondWith(
        fetch(event.request)
          .then(function (response) {
            if (response && response.status === 200 && response.type === "basic") {
              putInCache(event.request, response);
            }
            return response;
          })
          .catch(function () {
            return caches.match(event.request);
          })
      );
      return;
    }
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      return (
        cached ||
        fetch(event.request).then(function (response) {
          putInCache(event.request, response);
          return response;
        })
      );
    })
  );
});
