/**
 * Sessions temporaires via API PHP OVH pour synchroniser deux sauvegardes.
 * Même API publique que shared/backup-sync.js (adaptateur Supabase).
 */
(function (global) {
  "use strict";

  var ns = global.OutilsEPS || (global.OutilsEPS = {});
  var SESSION_MINUTES = 10;

  function bytesToBase64Url(bytes) {
    var str = "";
    Array.prototype.forEach.call(bytes, function (b) {
      str += String.fromCharCode(b);
    });
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function randomToken() {
    var bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return bytesToBase64Url(bytes);
  }

  function hex(buffer) {
    return Array.prototype.map
      .call(new Uint8Array(buffer), function (b) {
        return ("00" + b.toString(16)).slice(-2);
      })
      .join("");
  }

  function sha256(value) {
    if (!global.crypto || !global.crypto.subtle) {
      return Promise.reject(new Error("Chiffrement navigateur indisponible."));
    }
    return global.crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(String(value || "")))
      .then(hex);
  }

  function payloadHash(value) {
    var text = String(value || "");
    var h1 = 2166136261;
    var h2 = 16777619;
    var i;
    for (i = 0; i < text.length; i++) {
      h1 ^= text.charCodeAt(i);
      h1 += (h1 << 1) + (h1 << 4) + (h1 << 7) + (h1 << 8) + (h1 << 24);
      h2 = (h2 + text.charCodeAt(i) + (h2 << 6) + (h2 << 16) - h2) >>> 0;
    }
    return (
      ("00000000" + (h1 >>> 0).toString(16)).slice(-8) +
      ("00000000" + (h2 >>> 0).toString(16)).slice(-8) +
      ("00000000" + text.length.toString(16)).slice(-8) +
      ("00000000" + ((h1 ^ h2 ^ text.length) >>> 0).toString(16)).slice(-8)
    );
  }

  function isSyncHostSupported() {
    var host = (location.hostname || "").toLowerCase();
    if (host === "outilseps.fr" || host === "www.outilseps.fr") return true;
    if (host === "localhost" || host === "127.0.0.1") return true;
    return false;
  }

  function apiBase() {
    if (global.OUTILS_EPS_SYNC_API_BASE) {
      return String(global.OUTILS_EPS_SYNC_API_BASE).replace(/\/+$/, "") + "/";
    }
    var host = (location.hostname || "").toLowerCase();
    if (host === "outilseps.fr" || host === "www.outilseps.fr") {
      return "https://outilseps.fr/api/sync/";
    }
    var script = document.querySelector("script[data-sw]");
    var sw = script && script.getAttribute("data-sw");
    if (sw && sw.indexOf("../") === 0) {
      return "../api/sync/";
    }
    return "/api/sync/";
  }

  function apiPost(endpoint, body) {
    if (!global.fetch) {
      return Promise.reject(new Error("Navigateur incompatible (fetch indisponible)."));
    }
    var url = apiBase() + endpoint;
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    }).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (e) {
            data = { error: text };
          }
        }
        if (!res.ok) {
          var err = new Error(
            (data && data.error) || "Erreur serveur de synchronisation (" + res.status + ")"
          );
          err.status = res.status;
          err.data = data;
          throw err;
        }
        return data || {};
      });
    });
  }

  function expiresAt() {
    return new Date(Date.now() + SESSION_MINUTES * 60 * 1000).toISOString();
  }

  function normalizeRow(row) {
    row = Array.isArray(row) ? row[0] : row;
    if (typeof row === "string") {
      try {
        row = JSON.parse(row);
      } catch (e) {
        /* ignore */
      }
    }
    return row || {};
  }

  function setupError(err) {
    var msg = err && err.message ? String(err.message) : "";
    var status = err && err.status;
    if (status === 404) {
      return new Error(
        "API de synchronisation introuvable. Uploadez le dossier api/sync/ sur outilseps.fr (voir docs/DEPLOIEMENT-SYNC-OVH.md)."
      );
    }
    if (status === 503) {
      return new Error(
        (err.data && err.data.error) ||
          "Serveur de synchronisation non configuré (MySQL / config.php sur OVH)."
      );
    }
    if (
      msg.indexOf("Failed to fetch") >= 0 ||
      msg.indexOf("NetworkError") >= 0 ||
      msg.indexOf("Load failed") >= 0
    ) {
      if (!isSyncHostSupported()) {
        return new Error(
          "La synchronisation fonctionne uniquement depuis https://outilseps.fr (pas depuis GitHub Pages)."
        );
      }
      return new Error(
        "Impossible de joindre api/sync/ sur outilseps.fr. Vérifiez que les fichiers PHP sont en ligne et que la base MySQL est configurée."
      );
    }
    if (msg.indexOf("expire") >= 0 || msg.indexOf("expir") >= 0) {
      return new Error("Session introuvable ou expirée.");
    }
    return err;
  }

  function assertSyncHost() {
    if (!isSyncHostSupported()) {
      return Promise.reject(
        new Error(
          "Ouvrez cette page sur https://outilseps.fr pour synchroniser deux appareils (la version GitHub Pages ne dispose pas du serveur PHP)."
        )
      );
    }
    if (!global.isSecureContext) {
      return Promise.reject(
        new Error("La synchronisation nécessite une connexion sécurisée (HTTPS).")
      );
    }
    return Promise.resolve();
  }

  function createSession() {
    return assertSyncHost().then(function () {
    var token = randomToken();
    return sha256(token)
      .then(function (tokenHash) {
        return apiPost("create.php", {
          tokenHash: tokenHash,
          expiresAt: expiresAt(),
        }).then(function (row) {
          row = normalizeRow(row);
          return {
            sessionId: row.sessionId || row.session_id || row.id,
            token: token,
            tokenHash: tokenHash,
            role: "a",
            expiresAt: row.expiresAt || row.expires_at,
          };
        });
      })
      .catch(function (err) {
        throw setupError(err);
      });
    });
  }

  function joinSession(sessionId, token) {
    return sha256(token)
      .then(function (tokenHash) {
        return apiPost("join.php", {
          sessionId: sessionId,
          tokenHash: tokenHash,
        }).then(function (row) {
          row = normalizeRow(row);
          return {
            sessionId: sessionId,
            token: token,
            tokenHash: tokenHash,
            role: "b",
            expiresAt: row.expiresAt || row.expires_at,
          };
        });
      })
      .catch(function (err) {
        throw setupError(err);
      });
  }

  function uploadPayload(session, payload) {
    var text = BackupSyncCore.stableStringify(payload);
    return apiPost("upload.php", {
      sessionId: session.sessionId,
      tokenHash: session.tokenHash,
      device: session.role,
      payload: payload,
      payloadHash: payloadHash(text),
    }).catch(function (err) {
      throw setupError(err);
    });
  }

  function getSession(session) {
    return apiPost("session.php", {
      sessionId: session.sessionId,
      tokenHash: session.tokenHash,
    })
      .then(normalizeRow)
      .catch(function (err) {
        throw setupError(err);
      });
  }

  function setDecision(session, decision) {
    return apiPost("decision.php", {
      sessionId: session.sessionId,
      tokenHash: session.tokenHash,
      decision: decision || {},
    }).catch(function (err) {
      throw setupError(err);
    });
  }

  function cleanup(session) {
    if (!session || !session.sessionId || !session.tokenHash) {
      return Promise.resolve();
    }
    return apiPost("cleanup.php", {
      sessionId: session.sessionId,
      tokenHash: session.tokenHash,
    }).catch(function () {
      return null;
    });
  }

  function markApplied(session) {
    if (!session || !session.sessionId || !session.tokenHash) {
      return Promise.resolve();
    }
    return apiPost("mark-applied.php", {
      sessionId: session.sessionId,
      tokenHash: session.tokenHash,
      device: session.role,
    }).catch(function () {
      return null;
    });
  }

  function buildPairingText(session) {
    return (
      "outilseps-sync://v1?sid=" +
      encodeURIComponent(session.sessionId) +
      "&token=" +
      encodeURIComponent(session.token)
    );
  }

  function parsePairingText(text) {
    text = String(text || "").trim();
    var url;
    try {
      url = new URL(text);
    } catch (e) {
      return null;
    }
    if (url.protocol !== "outilseps-sync:" || url.hostname !== "v1") return null;
    var sessionId = url.searchParams.get("sid");
    var token = url.searchParams.get("token");
    if (!sessionId || !token) return null;
    return { sessionId: sessionId, token: token };
  }

  ns.BackupSync = {
    SESSION_MINUTES: SESSION_MINUTES,
    createSession: createSession,
    joinSession: joinSession,
    uploadPayload: uploadPayload,
    getSession: getSession,
    setDecision: setDecision,
    cleanup: cleanup,
    markApplied: markApplied,
    buildPairingText: buildPairingText,
    parsePairingText: parsePairingText,
  };
})(typeof window !== "undefined" ? window : global);
