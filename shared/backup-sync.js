/**
 * Sessions temporaires Supabase pour synchroniser deux sauvegardes.
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

  function requireSupabase() {
    if (!ns.supabaseRpc) {
      throw new Error("Module Supabase indisponible.");
    }
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

  function createSession() {
    requireSupabase();
    var token = randomToken();
    return sha256(token).then(function (tokenHash) {
      return ns
        .supabaseRpc("create_backup_sync_session", {
          p_token_hash: tokenHash,
          p_expires_at: expiresAt(),
        })
        .then(function (row) {
          row = normalizeRow(row);
          return {
            sessionId: row.session_id || row.id,
            token: token,
            tokenHash: tokenHash,
            role: "a",
            expiresAt: row.expires_at,
          };
        });
    });
  }

  function joinSession(sessionId, token) {
    requireSupabase();
    return sha256(token).then(function (tokenHash) {
      return ns
        .supabaseRpc("join_backup_sync_session", {
          p_session_id: sessionId,
          p_token_hash: tokenHash,
        })
        .then(function (row) {
          row = normalizeRow(row);
          return {
            sessionId: sessionId,
            token: token,
            tokenHash: tokenHash,
            role: "b",
            expiresAt: row.expires_at,
          };
        });
    });
  }

  function uploadPayload(session, payload) {
    requireSupabase();
    var text = BackupSyncCore.stableStringify(payload);
    return sha256(text).then(function (payloadHash) {
      return ns.supabaseRpc("upload_backup_sync_payload", {
        p_session_id: session.sessionId,
        p_token_hash: session.tokenHash,
        p_device: session.role,
        p_payload: payload,
        p_payload_hash: payloadHash,
      });
    });
  }

  function getSession(session) {
    requireSupabase();
    return ns
      .supabaseRpc("get_backup_sync_session", {
        p_session_id: session.sessionId,
        p_token_hash: session.tokenHash,
      })
      .then(normalizeRow);
  }

  function setDecision(session, decision) {
    requireSupabase();
    return ns.supabaseRpc("set_backup_sync_decision", {
      p_session_id: session.sessionId,
      p_token_hash: session.tokenHash,
      p_decision: decision || {},
    });
  }

  function cleanup(session) {
    if (!session || !session.sessionId || !session.tokenHash || !ns.supabaseRpc) {
      return Promise.resolve();
    }
    return ns
      .supabaseRpc("delete_backup_sync_session", {
        p_session_id: session.sessionId,
        p_token_hash: session.tokenHash,
      })
      .catch(function () {
        return null;
      });
  }

  function markApplied(session) {
    if (!session || !session.sessionId || !session.tokenHash || !ns.supabaseRpc) {
      return Promise.resolve();
    }
    return ns.supabaseRpc("mark_backup_sync_applied", {
      p_session_id: session.sessionId,
      p_token_hash: session.tokenHash,
      p_device: session.role,
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
