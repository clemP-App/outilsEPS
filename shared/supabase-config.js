/**
 * Configuration Supabase (clé anon publique uniquement — jamais la service role).
 *
 * Collez vos valeurs depuis Supabase : Projet → Settings → API
 *   - Project URL  → SUPABASE_URL
 *   - anon public  → SUPABASE_ANON_KEY
 *
 * Vous pouvez aussi définir avant le chargement des scripts :
 *   window.OUTILS_EPS_SUPABASE_URL = "https://….supabase.co";
 *   window.OUTILS_EPS_SUPABASE_ANON_KEY = "eyJ…";
 */
(function (global) {
  "use strict";

  var SUPABASE_URL = "https://gnlgojlbwjibgnkxwjgd.supabase.co/rest/v1/";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubGdvamxid2ppYmdua3h3amdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTE1NTIsImV4cCI6MjA5NjA2NzU1Mn0.TDNKOZSbCl9t-lppajhUO9-H-hB5iXAbuoQ82UPAGrk";

  var ns = global.OutilsEPS || (global.OutilsEPS = {});

  ns.SUPABASE_URL = global.OUTILS_EPS_SUPABASE_URL || SUPABASE_URL;
  ns.SUPABASE_ANON_KEY = global.OUTILS_EPS_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

  ns.isSupabaseConfigured = function () {
    return !!(ns.SUPABASE_URL && ns.SUPABASE_ANON_KEY);
  };
})(typeof window !== "undefined" ? window : global);
