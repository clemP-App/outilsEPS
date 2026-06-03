/**
 * Envoie les grilles du JSON vers Supabase (API REST, clé anon).
 * Usage: node scripts/push-catalog-grids-seed.mjs
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const SUPABASE_URL = "https://gnlgojlbwjibgnkxwjgd.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubGdvamxid2ppYmdua3h3amdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0OTE1NTIsImV4cCI6MjA5NjA2NzU1Mn0.TDNKOZSbCl9t-lppajhUO9-H-hB5iXAbuoQ82UPAGrk";

function cleanName(s) {
  return String(s == null ? "" : s)
    .replace(/\s+/g, " ")
    .trim();
}

function norm(s) {
  return cleanName(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function gridFromInput(grid) {
  const g = grid && typeof grid === "object" ? grid : {};
  return {
    title: cleanName(g.title || g.label || ""),
    apsa: cleanName(g.apsa || g.activity || ""),
    cycle: cleanName(g.cycle || ""),
    niveau: cleanName(g.niveau || g.level || ""),
    levels: Array.isArray(g.levels) ? g.levels : [],
    items: Array.isArray(g.items) ? g.items : [],
  };
}

function canonicalGridForHash(grid) {
  const g = gridFromInput(grid);
  const levels = g.levels
    .map((level, index) => {
      level = level && typeof level === "object" ? level : {};
      return {
        label: norm(level.label || "niveau " + (index + 1)),
        cellsOrder: index,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));

  const items = g.items
    .map((item, rowIndex) => {
      item = item && typeof item === "object" ? item : {};
      const cells = Array.isArray(item.cells) ? item.cells : [];
      return {
        label: norm(item.label || "item " + (rowIndex + 1)),
        cells: cells.map((cell, colIndex) => {
          cell = cell && typeof cell === "object" ? cell : {};
          const pts = parseFloat(
            String(cell.points == null ? colIndex : cell.points).replace(",", ".")
          );
          return {
            text: norm(cell.text || ""),
            points: Number.isNaN(pts) ? colIndex : pts,
          };
        }),
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));

  return {
    title: norm(g.title),
    activity: norm(g.apsa),
    level: norm(g.niveau || g.cycle),
    levels,
    items,
  };
}

function generateGridHash(grid) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalGridForHash(grid)), "utf8")
    .digest("hex");
}

function gridDataForDb(r) {
  return {
    id: r.id,
    title: cleanName(r.title),
    apsa: cleanName(r.apsa),
    cycle: cleanName(r.cycle),
    niveau: cleanName(r.niveau),
    levels: r.levels,
    items: r.items,
    max: 20,
    source: "catalog",
  };
}

const catalogPath = join(root, "shared", "evaluation-rubrics-catalog.json");
const data = JSON.parse(readFileSync(catalogPath, "utf8"));
const rubrics = Array.isArray(data) ? data : data.rubrics || [];

let ok = 0;
let skip = 0;
let err = 0;

for (const r of rubrics) {
  const payload = {
    title: cleanName(r.title),
    activity: cleanName(r.apsa),
    level: cleanName(r.niveau || r.cycle || ""),
    author_name: "Outils EPS",
    source: "outilseps",
    grid_data: gridDataForDb(r),
    grid_hash: generateGridHash(r),
    rows_count: r.items.length,
    columns_count: r.levels.length,
    status: "published",
    upvotes: 0,
    downvotes: 0,
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/catalog_grids`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 201) {
    ok++;
    console.log("OK:", r.title);
  } else if (res.status === 409) {
    skip++;
    console.log("Doublon (déjà présent):", r.title);
  } else {
    err++;
    const body = await res.text();
    console.error("Erreur", res.status, r.title, body.slice(0, 200));
  }
}

console.log(`\nTerminé: ${ok} ajoutée(s), ${skip} doublon(s), ${err} erreur(s).`);
process.exit(err > 0 ? 1 : 0);
