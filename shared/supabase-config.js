/**
 * Configuration Supabase (clé anon publique uniquement — jamais la service role).
 *
 * Collez vos valeurs depuis Supabase : Projet → Settings → API
 *   - Project URL  → SUPABASE_URL (ex. https://xxx.supabase.co, sans /rest/v1)
 *   - anon public  → SUPABASE_ANON_KEY
 *
 * Vous pouvez aussi définir avant le chargement des scripts :
 *   window.OUTILS_EPS_SUPABASE_URL = "https://….supabase.co";
 *   window.OUTILS_EPS_SUPABASE_ANON_KEY = "eyJ…";
 */
(function (global) {
  "use strict";

  /** URL projet uniquement (sans /rest/v1 — ajouté automatiquement par supabaseClient.js). */
  var SUPABASE_URL = "https://gnlgojlbwjibgnkxwjgd.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubGdvamxid2ppYmdua3h3amdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTE1NTIsImV4cCI6MjA5NjA2NzU1Mn0.TDNKOZSbCl9t-lppajhUO9-H-hB5iXAbuoQ82UPAGrk";

  function normalizeSupabaseProjectUrl(url) {
    url = String(url || "").trim();
    if (!url) return "";
    url = url.replace(/\/+$/, "");
    url = url.replace(/\/rest\/v1$/i, "");
    return url;
  }

  var ns = global.OutilsEPS || (global.OutilsEPS = {});

  ns.SUPABASE_URL = normalizeSupabaseProjectUrl(
    global.OUTILS_EPS_SUPABASE_URL || SUPABASE_URL
  );
  ns.SUPABASE_ANON_KEY = global.OUTILS_EPS_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

  ns.isSupabaseConfigured = function () {
    return !!(ns.SUPABASE_URL && ns.SUPABASE_ANON_KEY);
  };
})(typeof window !== "undefined" ? window : global);
