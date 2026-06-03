/**
 * Génère supabase/catalog-grids-seed.sql depuis shared/evaluation-rubrics-catalog.json
 * Usage: node scripts/generate-catalog-grids-seed.mjs
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const catalogPath = join(root, "shared", "evaluation-rubrics-catalog.json");
const outPath = join(root, "supabase", "catalog-grids-seed.sql");

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
  const payload = JSON.stringify(canonicalGridForHash(grid));
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

function sqlEscape(s) {
  return String(s).replace(/'/g, "''");
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

const data = JSON.parse(readFileSync(catalogPath, "utf8"));
const rubrics = Array.isArray(data) ? data : data.rubrics || [];

const lines = [
  "-- Grilles prêtes Outils EPS — à exécuter dans Supabase (SQL Editor)",
  "-- Généré par: node scripts/generate-catalog-grids-seed.mjs",
  "-- Idempotent : ON CONFLICT (grid_hash) DO NOTHING",
  "",
];

for (const r of rubrics) {
  const gridData = gridDataForDb(r);
  const hash = generateGridHash(r);
  const levelText = cleanName(r.niveau || r.cycle || "");
  const rowsCount = r.items.length;
  const colsCount = r.levels.length;
  const upvotes = 0;
  const downvotes = 0;
  const gridJson = sqlEscape(JSON.stringify(gridData));

  lines.push(
    `insert into public.catalog_grids (` +
      `title, activity, level, author_name, source, grid_data, grid_hash, rows_count, columns_count, status, upvotes, downvotes` +
      `) values (` +
      `'${sqlEscape(r.title)}', ` +
      `'${sqlEscape(r.apsa)}', ` +
      `'${sqlEscape(levelText)}', ` +
      `'Outils EPS', ` +
      `'outilseps', ` +
      `'${gridJson}'::jsonb, ` +
      `'${hash}', ` +
      `${rowsCount}, ${colsCount}, ` +
      `'published', ${upvotes}, ${downvotes}` +
      `) on conflict (grid_hash) do nothing;`
  );
  lines.push("");
}

writeFileSync(outPath, lines.join("\n"), "utf8");
console.log("Écrit:", outPath, "(" + rubrics.length + " grilles)");
