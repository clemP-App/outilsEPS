#!/usr/bin/env node
/**
 * Génère precache-manifest.js à partir des fichiers du projet.
 * Usage : node scripts/generate-precache.js
 */
"use strict";

var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var VERSION_FILE = path.join(ROOT, "app-version.js");
var OUT_FILE = path.join(ROOT, "precache-manifest.js");

var ALLOWED_EXT = {
  ".html": true,
  ".css": true,
  ".js": true,
  ".webmanifest": true,
  ".png": true,
  ".json": true,
};

var SKIP_DIRS = new Set([
  "scripts",
  "tests",
  "node_modules",
  ".git",
  ".cursor",
  "assets",
]);

var SKIP_FILES = new Set(["precache-manifest.js", "sw.js"]);

var ROOT_ASSETS = ["assets/icon-192.png", "assets/icon-512.png", "assets/apple-touch-icon.png"];

function readAppVersion() {
  var src = fs.readFileSync(VERSION_FILE, "utf8");
  var match = src.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
  if (!match) {
    throw new Error("APP_VERSION introuvable dans app-version.js");
  }
  return match[1];
}

function shouldInclude(relPosix) {
  if (!relPosix || relPosix.indexOf("..") >= 0) return false;
  var base = path.posix.basename(relPosix);
  if (SKIP_FILES.has(base)) return false;
  if (base.startsWith("_") || base.endsWith(".bak")) return false;
  var ext = path.posix.extname(relPosix).toLowerCase();
  if (!ALLOWED_EXT[ext]) return false;
  var parts = relPosix.split("/");
  if (parts[0] === "vendor" && ext === ".js") return true;
  if (parts[0] === "shared" && ext === ".js") return true;
  if (parts[0] === "outils" && (ext === ".html" || ext === ".js" || ext === ".json")) return true;
  if (parts.length === 1 && (ext === ".html" || ext === ".css" || ext === ".js" || ext === ".webmanifest")) {
    return true;
  }
  if (ROOT_ASSETS.indexOf(relPosix) >= 0) return true;
  return false;
}

function walk(dir, list, prefix) {
  var entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach(function (entry) {
    var rel = prefix ? prefix + "/" + entry.name : entry.name;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) return;
      if (prefix === "" && entry.name === "assets") {
        ROOT_ASSETS.forEach(function (a) {
          if (fs.existsSync(path.join(ROOT, a))) list.push(a);
        });
        return;
      }
      walk(path.join(dir, entry.name), list, rel);
      return;
    }
    if (shouldInclude(rel.replace(/\\/g, "/"))) {
      list.push(rel.replace(/\\/g, "/"));
    }
  });
}

function main() {
  var version = readAppVersion();
  var files = ["./"];
  walk(ROOT, files, "");
  ROOT_ASSETS.forEach(function (a) {
    if (fs.existsSync(path.join(ROOT, a))) files.push(a);
  });

  var unique = {};
  files.forEach(function (f) {
    unique[f] = true;
  });
  var sorted = Object.keys(unique).sort();

  var lines = [
    "/**",
    " * Fichier généré — ne pas éditer à la main.",
    " * Régénérer : node scripts/generate-precache.js",
    " */",
    'var APP_CACHE_VERSION = "' + version + '";',
    'var CACHE_BUNDLE_NAME = "outils-eps-v" + APP_CACHE_VERSION;',
    "var PRECACHE = [",
  ];
  sorted.forEach(function (f) {
    lines.push('  "./' + f.replace(/^\.\//, "") + '",');
  });
  lines.push("];");
  lines.push("");

  fs.writeFileSync(OUT_FILE, lines.join("\n"), "utf8");
  console.log("precache-manifest.js généré (" + sorted.length + " entrées, v" + version + ").");
}

main();
