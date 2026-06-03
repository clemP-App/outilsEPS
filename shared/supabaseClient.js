/**
 * Client HTTP minimal pour l'API REST Supabase (PostgREST + RPC).
 * N'utilise que l'URL projet et la clé anon publique.
 */
(function (global) {
  "use strict";

  var ns = global.OutilsEPS || (global.OutilsEPS = {});

  function requireConfig() {
    if (!ns.isSupabaseConfigured || !ns.isSupabaseConfigured()) {
      throw new Error("Supabase non configuré. Renseignez SUPABASE_URL et SUPABASE_ANON_KEY dans shared/supabase-config.js");
    }
  }

  function baseHeaders(extra) {
    requireConfig();
    var headers = {
      apikey: ns.SUPABASE_ANON_KEY,
      Authorization: "Bearer " + ns.SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    };
    if (extra) {
      Object.keys(extra).forEach(function (k) {
        headers[k] = extra[k];
      });
    }
    return headers;
  }

  /**
   * @param {string} path - ex. "/rest/v1/catalog_grids" ou "/rest/v1/rpc/vote_catalog_grid"
   * @param {object} options - method, body, headers
   */
  ns.supabaseFetch = function (path, options) {
    options = options || {};
    var url = ns.SUPABASE_URL.replace(/\/$/, "") + path;
    return fetch(url, {
      method: options.method || "GET",
      headers: baseHeaders(options.headers),
      body: options.body != null ? JSON.stringify(options.body) : undefined,
    }).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (e) {
            data = text;
          }
        }
        if (!res.ok) {
          var err = new Error(
            (data && data.message) ||
              (data && data.error) ||
              "Erreur Supabase (" + res.status + ")"
          );
          err.status = res.status;
          err.data = data;
          err.code = data && data.code;
          throw err;
        }
        return data;
      });
    });
  };

  ns.supabaseRest = function (table, query, options) {
    var q = query ? (query.indexOf("?") === 0 ? query : "?" + query) : "";
    return ns.supabaseFetch("/rest/v1/" + table + q, options || {});
  };

  ns.supabaseRpc = function (fnName, params) {
    return ns.supabaseFetch("/rest/v1/rpc/" + fnName, {
      method: "POST",
      body: params || {},
    });
  };
})(typeof window !== "undefined" ? window : global);
