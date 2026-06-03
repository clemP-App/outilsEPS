/**
 * Remet upvotes/downvotes à 0 pour les grilles source=outilseps (nécessite droits UPDATE).
 * Si échec, exécutez supabase/catalog-grids-reset-votes.sql dans le SQL Editor.
 */
const SUPABASE_URL = "https://gnlgojlbwjibgnkxwjgd.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubGdvamxid2ppYmdua3h3amdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTE1NTIsImV4cCI6MjA5NjA2NzU1Mn0.TDNKOZSbCl9t-lppajhUO9-H-hB5iXAbuoQ82UPAGrk";

const res = await fetch(
  `${SUPABASE_URL}/rest/v1/catalog_grids?source=eq.outilseps`,
  {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ upvotes: 0, downvotes: 0 }),
  }
);

if (!res.ok) {
  const body = await res.text();
  console.error("Échec PATCH (", res.status, ") — exécutez supabase/catalog-grids-reset-votes.sql");
  console.error(body.slice(0, 300));
  process.exit(1);
}

const rows = await res.json();
console.log("Votes remis à zéro pour", Array.isArray(rows) ? rows.length : "?", "grille(s) outilseps.");
