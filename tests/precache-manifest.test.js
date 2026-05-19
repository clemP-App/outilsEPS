"use strict";

var test = require("node:test");
var assert = require("node:assert/strict");
var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var manifestPath = path.join(ROOT, "precache-manifest.js");
var versionPath = path.join(ROOT, "app-version.js");

test("precache-manifest aligné sur APP_VERSION", function () {
  var versionSrc = fs.readFileSync(versionPath, "utf8");
  var match = versionSrc.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
  assert.ok(match, "APP_VERSION introuvable");
  var manifestSrc = fs.readFileSync(manifestPath, "utf8");
  assert.match(manifestSrc, new RegExp('APP_CACHE_VERSION = "' + match[1] + '"'));
  assert.match(manifestSrc, /var PRECACHE = \[/);
});

test("precache contient les entrées PWA essentielles", function () {
  var manifestSrc = fs.readFileSync(manifestPath, "utf8");
  var required = ["./index.html", "./style.css", "./dom-utils.js", "./script.js"];
  required.forEach(function (entry) {
    assert.ok(manifestSrc.indexOf('"' + entry + '"') >= 0, "manquant: " + entry);
  });
});
