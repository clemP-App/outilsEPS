#!/usr/bin/env node
/**
 * Génère outils/textes-officiels-resources.js depuis textes-officiels-resources.json
 * Usage : node scripts/build-textes-officiels-data.js
 */
"use strict";

var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var JSON_FILE = path.join(ROOT, "outils", "textes-officiels-resources.json");
var OUT_FILE = path.join(ROOT, "outils", "textes-officiels-resources.js");

var data = JSON.parse(fs.readFileSync(JSON_FILE, "utf8"));
var out =
  "/* Généré par scripts/build-textes-officiels-data.js — ne pas modifier à la main */\n" +
  "(function (global) {\n" +
  '  "use strict";\n' +
  "  global.TEXTES_OFFICIELS_EPS_DATA = " +
  JSON.stringify(data, null, 2) +
  ";\n" +
  "})(typeof window !== \"undefined\" ? window : this);\n";

fs.writeFileSync(OUT_FILE, out, "utf8");
console.log("Écrit : outils/textes-officiels-resources.js");
