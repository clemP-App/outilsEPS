#!/usr/bin/env node
"use strict";

var fs = require("fs");
var path = require("path");
var cp = require("child_process");

var ROOT = path.join(__dirname, "..");
var SKIP_DIRS = new Set(["node_modules", ".git", "vendor"]);

function walk(dir, files) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
    var full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) return;
      walk(full, files);
      return;
    }
    if (entry.name.endsWith(".js")) files.push(full);
  });
}

var files = [];
walk(ROOT, files);
files = files.filter(function (f) {
  return f.indexOf("precache-manifest.js") < 0;
});

var failed = 0;
files.forEach(function (file) {
  try {
    cp.execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (err) {
    failed++;
    console.error("Syntaxe invalide:", path.relative(ROOT, file));
    if (err.stderr) console.error(String(err.stderr));
  }
});

if (failed) {
  console.error(failed + " fichier(s) en erreur sur " + files.length + ".");
  process.exit(1);
}
console.log("OK — " + files.length + " fichiers JS vérifiés.");
