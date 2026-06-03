(function () {
  "use strict";

  var STORAGE_KEY = "outils_eps_championnat_poule_unique_v1";
  var SESSIONS_INDEX_KEY = "outils_eps_championnat_poule_unique_sessions_v1";
  var SESSION_DATA_PREFIX = "outils_eps_championnat_poule_unique_session_";
  var BYE = "__BYE__";
  var state = { teams: [], matches: [], source: null };
  var sessionsIndex = { activeId: null, sessions: [] };

  var addInput = document.getElementById("champ-eleve-team");
  var addBtn = document.getElementById("champ-eleve-add");
  var teamsEl = document.getElementById("champ-eleve-teams");
  var standingsEl = document.getElementById("champ-eleve-standings");
  var matchesEl = document.getElementById("champ-eleve-matches");
  var accordionEleveMatchsTitleEl = document.getElementById("accordion-eleve-matchs-title");
  var matchSearchEl = document.getElementById("champ-eleve-match-search");
  var clearMatchSearchBtnEl = document.getElementById("champ-eleve-clear-match-search");
  var msgEl = document.getElementById("champ-eleve-msg");
  var accordionEleveGestionEl = document.getElementById("accordion-eleve-gestion");
  var importInputEl = document.getElementById("champ-eleve-import-input");
  var importBtnEl = document.getElementById("champ-eleve-import-btn");
  var sessionSelectEl = document.getElementById("champ-eleve-session-select");
  var sessionLoadBtnEl = document.getElementById("champ-eleve-session-load-btn");
  var sessionNewBtnEl = document.getElementById("champ-eleve-session-new-btn");
  var sessionDeleteBtnEl = document.getElementById("champ-eleve-session-delete-btn");
  var importScanBtnEl = document.getElementById("champ-eleve-import-scan-btn");
  var importStopScanBtnEl = document.getElementById("champ-eleve-import-stop-scan-btn");
  var importReaderEl = document.getElementById("champ-eleve-import-reader");
  var shareLinkEl = document.getElementById("champ-eleve-share-link");
  var shareQrHostEl = document.getElementById("champ-eleve-share-qr-host");
  var generateShareBtnEl = document.getElementById("champ-eleve-generate-share-btn");
  var copyShareBtnEl = document.getElementById("champ-eleve-copy-share-btn");
  var importScanner = null;
  var importScanning = false;

  function id() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "e_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function defaultSessionName() {
    var n = (sessionsIndex.sessions || []).length + 1;
    return "Championnat " + n;
  }

  function buildImportedSessionName(payload) {
    var base = (payload && payload.pouleName ? String(payload.pouleName) : "").trim();
    if (!base) base = defaultSessionName();
    var name = "Import " + base;
    var used = {};
    (sessionsIndex.sessions || []).forEach(function (s) {
      used[String(s.name || "").toLowerCase()] = true;
    });
    if (!used[name.toLowerCase()]) return name;
    var idx = 2;
    while (used[(name + " (" + idx + ")").toLowerCase()]) idx++;
    return name + " (" + idx + ")";
  }

  function hasSessionWithSourceExportId(exportId) {
    if (!exportId) return false;
    return (sessionsIndex.sessions || []).some(function (s) {
      try {
        var raw = localStorage.getItem(sessionDataKey(s.id));
        if (!raw) return false;
        var parsed = JSON.parse(raw);
        return (
          parsed &&
          parsed.source &&
          parsed.source.exportId &&
          parsed.source.exportId === exportId
        );
      } catch (_e) {
        return false;
      }
    });
  }

  function sessionDataKey(sessionId) {
    return SESSION_DATA_PREFIX + sessionId;
  }

  function saveIndex() {
    try {
      localStorage.setItem(SESSIONS_INDEX_KEY, JSON.stringify(sessionsIndex));
    } catch (_e) {}
  }

  function saveLegacyBackup() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_e) {}
  }

  function saveSessionState(sessionId, payload) {
    try {
      localStorage.setItem(sessionDataKey(sessionId), JSON.stringify(payload));
    } catch (_e) {}
  }

  function getSessionMetaById(sessionId) {
    return (sessionsIndex.sessions || []).find(function (s) { return s.id === sessionId; }) || null;
  }

  function ensureActiveSessionMeta() {
    var sid = sessionsIndex.activeId;
    if (!sid) return null;
    var meta = getSessionMetaById(sid);
    if (!meta) {
      sessionsIndex.activeId = null;
      return null;
    }
    return meta;
  }

  function save() {
    var meta = ensureActiveSessionMeta();
    if (!meta) return;
    meta.updatedAt = nowIso();
    saveSessionState(meta.id, {
      id: meta.id,
      name: meta.name,
      teams: state.teams || [],
      matches: state.matches || [],
      source: state.source || null,
      updatedAt: meta.updatedAt,
    });
    saveIndex();
    saveLegacyBackup();
  }

  function createSession(name, initialState) {
    var sid = id();
    var createdAt = nowIso();
    var meta = {
      id: sid,
      name: String(name || defaultSessionName()).trim() || defaultSessionName(),
      createdAt: createdAt,
      updatedAt: createdAt,
    };
    sessionsIndex.sessions.push(meta);
    sessionsIndex.activeId = sid;
    state = initialState || { teams: [], matches: [], source: null };
    save();
    renderSessionSelect();
    return meta;
  }

  function loadSessionById(sessionId) {
    var meta = getSessionMetaById(sessionId);
    if (!meta) return false;
    try {
      var raw = localStorage.getItem(sessionDataKey(sessionId));
      var parsed = raw ? JSON.parse(raw) : {};
      state.teams = Array.isArray(parsed.teams) ? parsed.teams : [];
      state.matches = Array.isArray(parsed.matches) ? parsed.matches : [];
      state.source = parsed.source && typeof parsed.source === "object" ? parsed.source : null;
      sessionsIndex.activeId = sessionId;
      meta.updatedAt = nowIso();
      saveIndex();
      saveLegacyBackup();
      clearResultShareOutput();
      render();
      renderSessionSelect();
      return true;
    } catch (_e) {}
    return false;
  }

  function deleteSessionById(sessionId) {
    if (!sessionId) return false;
    var idx = (sessionsIndex.sessions || []).findIndex(function (s) { return s.id === sessionId; });
    if (idx < 0) return false;
    try {
      localStorage.removeItem(sessionDataKey(sessionId));
    } catch (_e) {}
    sessionsIndex.sessions.splice(idx, 1);
    if (!sessionsIndex.sessions.length) {
      saveIndex();
      createSession("Championnat 1", { teams: [], matches: [], source: null });
      return true;
    }
    if (sessionsIndex.activeId === sessionId) {
      sessionsIndex.activeId = sessionsIndex.sessions[0].id;
      loadSessionById(sessionsIndex.activeId);
    } else {
      saveIndex();
      renderSessionSelect();
    }
    return true;
  }

  function migrateLegacyIfNeeded() {
    try {
      var rawIndex = localStorage.getItem(SESSIONS_INDEX_KEY);
      if (rawIndex) return;
      var rawLegacy = localStorage.getItem(STORAGE_KEY);
      if (!rawLegacy) return;
      var parsedLegacy = JSON.parse(rawLegacy);
      var legacyState = {
        teams: Array.isArray(parsedLegacy.teams) ? parsedLegacy.teams : [],
        matches: Array.isArray(parsedLegacy.matches) ? parsedLegacy.matches : [],
        source: parsedLegacy.source && typeof parsedLegacy.source === "object" ? parsedLegacy.source : null,
      };
      createSession("Championnat 1", legacyState);
    } catch (_e) {}
  }

  function load() {
    migrateLegacyIfNeeded();
    try {
      var rawIndex = localStorage.getItem(SESSIONS_INDEX_KEY);
      var parsedIndex = rawIndex ? JSON.parse(rawIndex) : null;
      if (parsedIndex && Array.isArray(parsedIndex.sessions)) {
        sessionsIndex = {
          activeId: parsedIndex.activeId || null,
          sessions: parsedIndex.sessions
            .map(function (s) {
              return {
                id: s.id,
                name: s.name || "Championnat",
                createdAt: s.createdAt || nowIso(),
                updatedAt: s.updatedAt || s.createdAt || nowIso(),
              };
            })
            .filter(function (s) { return !!s.id; }),
        };
      }
    } catch (_e) {}
    if (!sessionsIndex.sessions.length) {
      createSession("Championnat 1", { teams: [], matches: [], source: null });
      return;
    }
    if (!sessionsIndex.activeId || !getSessionMetaById(sessionsIndex.activeId)) {
      sessionsIndex.activeId = sessionsIndex.sessions[0].id;
      saveIndex();
    }
    loadSessionById(sessionsIndex.activeId);
  }

  function msg(text) {
    if (!msgEl) return;
    msgEl.hidden = !text;
    msgEl.textContent = text || "";
  }

  function renderSessionSelect() {
    if (!sessionSelectEl) return;
    OutilsDom.clear(sessionSelectEl);
    (sessionsIndex.sessions || []).forEach(function (s) {
      var option = document.createElement("option");
      option.value = s.id;
      option.textContent = s.name;
      sessionSelectEl.appendChild(option);
    });
    if (sessionsIndex.activeId) sessionSelectEl.value = sessionsIndex.activeId;
  }

  function closeGestionAccordionsOnScoreEntry() {
    if (!accordionEleveGestionEl) return;
    accordionEleveGestionEl.open = false;
    var nested = accordionEleveGestionEl.querySelectorAll("details[open]");
    Array.prototype.forEach.call(nested, function (d) {
      d.open = false;
    });
  }

  function parseScore(v) {
    if (v === "" || v == null) return null;
    var n = parseInt(String(v), 10);
    return isNaN(n) || n < 0 ? null : n;
  }

  function pairScore(homeId, awayId, old) {
    for (var i = 0; i < old.length; i++) {
      var m = old[i];
      if (m.homeId === homeId && m.awayId === awayId) return { homeScore: m.homeScore, awayScore: m.awayScore };
      if (m.homeId === awayId && m.awayId === homeId) return { homeScore: m.awayScore, awayScore: m.homeScore };
    }
    return { homeScore: null, awayScore: null };
  }

  function rounds(ids) {
    if (ids.length < 2) return [];
    var arr = ids.slice();
    if (arr.length % 2 === 1) arr.push(BYE);
    var n = arr.length;
    var out = [];
    var c = arr.slice();
    for (var r = 0; r < n - 1; r++) {
      var day = [];
      for (var i = 0; i < n / 2; i++) {
        var a = c[i];
        var b = c[n - 1 - i];
        if (a !== BYE && b !== BYE) day.push({ homeId: a, awayId: b });
      }
      out.push(day);
      var fixed = c[0];
      var last = c[n - 1];
      for (var j = n - 1; j >= 2; j--) c[j] = c[j - 1];
      c[1] = last;
      c[0] = fixed;
    }
    return out;
  }

  function rebuildMatches() {
    var ids = state.teams.map(function (t) { return t.id; });
    var old = state.matches.slice();
    var out = [];
    rounds(ids).forEach(function (day, di) {
      day.forEach(function (p) {
        var sc = pairScore(p.homeId, p.awayId, old);
        out.push({
          id: id(),
          homeId: p.homeId,
          awayId: p.awayId,
          journee: di + 1,
          homeScore: sc.homeScore,
          awayScore: sc.awayScore,
        });
      });
    });
    state.matches = out;
  }

  function addTeam(name) {
    var n = (name || "").trim();
    if (!n) {
      msg("Indiquez un nom.");
      return;
    }
    state.teams.push({ id: id(), name: n, eleveId: null });
    rebuildMatches();
    clearResultShareOutput();
    save();
    render();
  }

  function removeTeam(teamId) {
    if (!confirm("Supprimer ce participant ?")) return;
    state.teams = state.teams.filter(function (t) { return t.id !== teamId; });
    rebuildMatches();
    clearResultShareOutput();
    save();
    render();
  }

  function teamName(teamId) {
    var t = state.teams.find(function (x) { return x.id === teamId; });
    return t ? t.name : "?";
  }

  function normalizeSearchText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function renameTeam(teamId) {
    var t = state.teams.find(function (x) { return x.id === teamId; });
    if (!t) return;
    var next = prompt("Nouveau nom :", t.name);
    if (next === null) return;
    next = String(next || "").trim();
    if (!next) {
      msg("Indiquez un nom.");
      return;
    }
    t.name = next;
    clearResultShareOutput();
    save();
    render();
  }

  function setScore(matchId, side, value) {
    var m = state.matches.find(function (x) { return x.id === matchId; });
    if (!m) return;
    var val = parseScore(value);
    if (side === "home") m.homeScore = val;
    else m.awayScore = val;
    if (val == null && side === "home" && m.awayScore === 0) {
      m.awayScore = null;
      var awayInput = matchesEl.querySelector('input.match-row__score[data-match-id="' + matchId + '"][data-side="away"]');
      if (awayInput) awayInput.value = "";
    } else if (val == null && side === "away" && m.homeScore === 0) {
      m.homeScore = null;
      var homeInput = matchesEl.querySelector('input.match-row__score[data-match-id="' + matchId + '"][data-side="home"]');
      if (homeInput) homeInput.value = "";
    }
    if (m.homeScore != null || m.awayScore != null) {
      closeGestionAccordionsOnScoreEntry();
    }
    clearResultShareOutput();
    save();
    renderStandings();
  }

  function renderTeams() {
    OutilsDom.clear(teamsEl);
    if (!state.teams.length) {
      var empty = document.createElement("li");
      empty.className = "champ-team-empty";
      empty.textContent = "Aucun participant.";
      teamsEl.appendChild(empty);
      return;
    }
    state.teams.forEach(function (t) {
      var li = document.createElement("li");
      li.className = "champ-team-row";
      var span = document.createElement("span");
      span.className = "champ-team-name";
      span.textContent = t.name;
      var actions = document.createElement("div");
      actions.className = "champ-team-actions";
      var edit = document.createElement("button");
      edit.type = "button";
      edit.className = "btn btn--ghost btn--icon-only btn--small";
      edit.setAttribute("aria-label", "Renommer " + t.name);
      OutilsDom.setIconButton(edit, "✏️", "Renommer " + t.name);
      edit.addEventListener("click", function () { renameTeam(t.id); });
      var del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn--danger btn--icon-only btn--small";
      OutilsDom.setIconButton(del, "🗑️", "Supprimer " + t.name);
      del.addEventListener("click", function () { removeTeam(t.id); });
      actions.appendChild(edit);
      actions.appendChild(del);
      li.appendChild(span);
      li.appendChild(actions);
      teamsEl.appendChild(li);
    });
  }

  function renderMatches() {
    OutilsDom.clear(matchesEl);
    var query = normalizeSearchText(matchSearchEl ? matchSearchEl.value : "");
    var filteredMatches = state.matches.filter(function (m) {
      if (!query) return true;
      return (
        normalizeSearchText(teamName(m.homeId)).indexOf(query) !== -1 ||
        normalizeSearchText(teamName(m.awayId)).indexOf(query) !== -1
      );
    });
    var remaining = filteredMatches.filter(function (m) {
      return m.homeScore == null && m.awayScore == null;
    }).length;
    if (accordionEleveMatchsTitleEl) {
      accordionEleveMatchsTitleEl.textContent = "Matchs (" + remaining + " restants)";
    }
    if (state.teams.length < 2) {
      var p = document.createElement("p");
      p.className = "hint";
      p.textContent = "Ajoutez au moins deux participants.";
      matchesEl.appendChild(p);
      return;
    }
    if (!filteredMatches.length) {
      var empty = document.createElement("p");
      empty.className = "hint champ-match-filter__empty";
      empty.textContent = "Aucun match ne correspond à ce filtre.";
      matchesEl.appendChild(empty);
      return;
    }
    var byDay = {};
    var max = 0;
    filteredMatches.forEach(function (m) {
      var d = m.journee || 1;
      if (!byDay[d]) byDay[d] = [];
      byDay[d].push(m);
      if (d > max) max = d;
    });
    for (var day = 1; day <= max; day++) {
      var list = byDay[day] || [];
      if (!list.length) continue;
      var sec = document.createElement("section");
      sec.className = "champ-journee";
      var h = document.createElement("h3");
      h.className = "champ-journee__title";
      h.textContent = "Journée " + day;
      sec.appendChild(h);
      list.forEach(function (m) {
        var row = document.createElement("div");
        row.className = "match-row";
        var home = document.createElement("span");
        home.className = "match-row__name";
        home.textContent = teamName(m.homeId);
        var hs = document.createElement("input");
        hs.type = "number"; hs.min = "0"; hs.className = "match-row__score";
        hs.value = m.homeScore == null ? "" : String(m.homeScore);
        hs.dataset.matchId = m.id; hs.dataset.side = "home";
        var sep = document.createElement("span");
        sep.className = "match-row__sep"; sep.textContent = "—";
        var as = document.createElement("input");
        as.type = "number"; as.min = "0"; as.className = "match-row__score";
        as.value = m.awayScore == null ? "" : String(m.awayScore);
        as.dataset.matchId = m.id; as.dataset.side = "away";
        var away = document.createElement("span");
        away.className = "match-row__name match-row__name--away";
        away.textContent = teamName(m.awayId);
        row.appendChild(home); row.appendChild(hs); row.appendChild(sep); row.appendChild(as); row.appendChild(away);
        sec.appendChild(row);
      });
      matchesEl.appendChild(sec);
    }
  }

  function renderStandings() {
    var rows = ChampionnatStandings.computeStandingsFromData(state.teams, state.matches);
    OutilsDom.clear(standingsEl);
    if (!rows.length) {
      var tr = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = 10;
      td.className = "champ-table-empty";
      td.textContent = "Ajoutez des participants pour voir le classement.";
      tr.appendChild(td);
      standingsEl.appendChild(tr);
      return;
    }
    rows.forEach(function (r) {
      var tr = document.createElement("tr");
      [r.rang, r.name, r.mj, r.v, r.n, r.d, r.pour, r.contre, (r.diff >= 0 ? "+" : "") + r.diff, r.pts].forEach(function (v) {
        var td = document.createElement("td");
        td.textContent = String(v);
        tr.appendChild(td);
      });
      standingsEl.appendChild(tr);
    });
  }

  function buildQrPayload() {
    var entries = state.matches
      .filter(function (m) { return m.homeScore != null || m.awayScore != null; })
      .map(function (m) {
        var home = state.teams.find(function (t) { return t.id === m.homeId; });
        var away = state.teams.find(function (t) { return t.id === m.awayId; });
        return {
          homeTeamId: home ? home.id : null,
          awayTeamId: away ? away.id : null,
          homeProfTeamId: home ? home.id : null,
          awayProfTeamId: away ? away.id : null,
          homeName: home ? home.name : "",
          awayName: away ? away.name : "",
          homeEleveId: home ? home.eleveId || null : null,
          awayEleveId: away ? away.eleveId || null : null,
          homeScore: m.homeScore == null ? 0 : m.homeScore,
          awayScore: m.awayScore == null ? 0 : m.awayScore,
        };
      });
    if (!entries.length) throw new Error("Aucun match complété à partager.");
    return {
      type: "results",
      schemaVersion: 2,
      source: state.source || null,
      exportedAt: new Date().toISOString(),
      entries: entries,
    };
  }

  function clearResultShareOutput() {
    if (shareQrHostEl) OutilsDom.clear(shareQrHostEl);
    if (shareLinkEl) shareLinkEl.value = "";
    if (copyShareBtnEl) copyShareBtnEl.hidden = true;
  }

  function stopImportScanner() {
    if (!importScanner || !importScanning) return Promise.resolve();
    return importScanner
      .stop()
      .then(function () {
        importScanning = false;
        if (importScanBtnEl) importScanBtnEl.hidden = false;
        if (importStopScanBtnEl) importStopScanBtnEl.hidden = true;
        if (importReaderEl) importReaderEl.hidden = true;
      })
      .catch(function () {
        importScanning = false;
        if (importScanBtnEl) importScanBtnEl.hidden = false;
        if (importStopScanBtnEl) importStopScanBtnEl.hidden = true;
        if (importReaderEl) importReaderEl.hidden = true;
      });
  }

  function startImportScanner() {
    if (typeof Html5Qrcode === "undefined") {
      msg("Scanner QR indisponible sur cet appareil.");
      return;
    }
    if (!importReaderEl) return;
    if (!importScanner) importScanner = new Html5Qrcode("champ-eleve-import-reader");
    if (importScanning) return;
    var config = { fps: 8, qrbox: { width: 260, height: 260 } };
    Html5Qrcode.getCameras()
      .then(function (cameras) {
        if (!cameras || !cameras.length) throw new Error("Aucune caméra détectée.");
        var back = cameras.find(function (c) {
          return /back|rear|arriere|environment/i.test(c.label || "");
        });
        var camId = (back || cameras[cameras.length - 1]).id;
        importReaderEl.hidden = false;
        return importScanner.start(camId, config, function (decodedText) {
          if (importInputEl) importInputEl.value = decodedText;
          importAssignmentFromQr((decodedText || "").trim());
          stopImportScanner();
        }, function () {});
      })
      .then(function () {
        importScanning = true;
        if (importScanBtnEl) importScanBtnEl.hidden = true;
        if (importStopScanBtnEl) importStopScanBtnEl.hidden = false;
      })
      .catch(function (e) {
        msg((e && e.message) || "Impossible d'accéder à la caméra.");
        if (importReaderEl) importReaderEl.hidden = true;
      });
  }

  function generateResultShareLink() {
    if (typeof QrExchangeCore === "undefined") throw new Error("Partage QR indisponible.");
    var payload = buildQrPayload();
    var record = QrExchangeCore.buildExportRecord("championnat-poule-unique", payload, {});
    return QrExchangeCore.encodeRecord(record);
  }

  function renderResultShareQr(link) {
    if (shareQrHostEl) OutilsDom.clear(shareQrHostEl);
    if (!shareQrHostEl || !link || typeof QRCode === "undefined") return;
    new QRCode(shareQrHostEl, {
      text: link,
      width: 220,
      height: 220,
      correctLevel: QRCode.CorrectLevel.L,
      margin: 1,
    });
  }

  function copyResultShareLink() {
    if (!shareLinkEl || !shareLinkEl.value) {
      msg("Générez d'abord un lien de partage.");
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareLinkEl.value).then(
        function () {
          msg("Lien copié.");
        },
        function () {
          msg("Copie impossible.");
        }
      );
      return;
    }
    var tmp = document.createElement("textarea");
    tmp.value = shareLinkEl.value;
    tmp.setAttribute("readonly", "readonly");
    tmp.style.position = "fixed";
    tmp.style.left = "-9999px";
    document.body.appendChild(tmp);
    tmp.select();
    try {
      document.execCommand("copy");
      msg("Lien copié.");
    } catch (_e) {
      msg("Copie impossible.");
    } finally {
      document.body.removeChild(tmp);
    }
  }

  function assignmentPayloadHasScores(payload) {
    var matches = Array.isArray(payload.matches) ? payload.matches : [];
    return matches.some(function (m) {
      return m.homeScore != null || m.awayScore != null;
    });
  }

  function importAssignmentFromQr(raw) {
    if (!raw || typeof QrExchangeCore === "undefined") return;
    var parsed = QrExchangeCore.parseQrUrl(raw);
    if (parsed.error) {
      msg(parsed.error);
      return;
    }
    var record = parsed.record || {};
    if (record.toolId !== "championnat-poule-unique") {
      msg("Ce QR n'est pas compatible avec l'outil championnat élève.");
      return;
    }
    var payload = record.payload || {};
    if (payload.type !== "assignment") {
      msg("Ce QR ne contient pas une poule à charger.");
      return;
    }
    if (assignmentPayloadHasScores(payload)) {
      msg("Ce lien contient des scores : le professeur ne partage que les noms des participants.");
      return;
    }
    var teams = Array.isArray(payload.teams) ? payload.teams : [];
    if (teams.length < 2) {
      msg("Poule incomplète : au moins deux participants sont nécessaires.");
      return;
    }
    var importedState = {
      teams: teams.map(function (t) {
        return {
          id: t.teamId || id(),
          name: t.name || "Participant",
          eleveId: t.eleveId || null,
        };
      }),
      matches: [],
      source: {
        exportId: record.exportId || null,
        pouleId: payload.pouleId || null,
        pouleName: payload.pouleName || null,
        exportedAt: payload.exportedAt || record.createdAt || null,
      },
    };
    var duplicateImport = hasSessionWithSourceExportId(importedState.source.exportId);
    state = importedState;
    rebuildMatches();
    createSession(buildImportedSessionName(payload), {
      teams: state.teams.slice(),
      matches: state.matches.slice(),
      source: state.source,
    });
    clearResultShareOutput();
    save();
    render();
    msg(
      duplicateImport
        ? "Ce QR a déjà été importé auparavant. Nouveau championnat créé sans écraser l'ancien."
        : "Poule importée dans un nouveau championnat. Les matchs ont été créés sur cet appareil."
    );
  }

  function render() {
    renderTeams();
    renderMatches();
    renderStandings();
  }

  if (matchesEl) {
    matchesEl.addEventListener("input", function (e) {
      var el = e.target;
      if (!el.classList || !el.classList.contains("match-row__score")) return;
      setScore(el.dataset.matchId, el.dataset.side, el.value);
    });
  }
  if (matchSearchEl) {
    matchSearchEl.addEventListener("input", renderMatches);
  }
  if (clearMatchSearchBtnEl && matchSearchEl) {
    clearMatchSearchBtnEl.addEventListener("click", function () {
      matchSearchEl.value = "";
      renderMatches();
      matchSearchEl.focus();
    });
  }
  if (addBtn) {
    addBtn.addEventListener("click", function () {
      addTeam(addInput.value);
      addInput.value = "";
      addInput.focus();
    });
  }
  if (addInput) {
    addInput.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      e.preventDefault();
      addTeam(addInput.value);
      addInput.value = "";
    });
  }
  if (importBtnEl && importInputEl) {
    importBtnEl.addEventListener("click", function () {
      importAssignmentFromQr((importInputEl.value || "").trim());
    });
  }
  if (sessionNewBtnEl) {
    sessionNewBtnEl.addEventListener("click", function () {
      var asked = prompt("Nom du nouveau championnat :", defaultSessionName());
      if (asked == null) return;
      var name = String(asked || "").trim() || defaultSessionName();
      createSession(name, { teams: [], matches: [], source: null });
      clearResultShareOutput();
      render();
      msg("Nouveau championnat créé : " + name + ".");
    });
  }
  if (sessionLoadBtnEl && sessionSelectEl) {
    sessionLoadBtnEl.addEventListener("click", function () {
      var sid = sessionSelectEl.value;
      if (!sid) return;
      if (loadSessionById(sid)) {
        var meta = getSessionMetaById(sid);
        msg("Championnat chargé : " + (meta ? meta.name : "session"));
      } else {
        msg("Impossible de charger ce championnat.");
      }
    });
  }
  if (sessionDeleteBtnEl && sessionSelectEl) {
    sessionDeleteBtnEl.addEventListener("click", function () {
      var sid = sessionSelectEl.value;
      if (!sid) return;
      var meta = getSessionMetaById(sid);
      var label = meta ? meta.name : "ce championnat";
      if (!confirm('Supprimer "' + label + '" ?')) return;
      if (deleteSessionById(sid)) {
        msg('Championnat supprimé : "' + label + '".');
      } else {
        msg("Suppression impossible.");
      }
    });
  }
  if (generateShareBtnEl && shareLinkEl) {
    generateShareBtnEl.addEventListener("click", function () {
      try {
        var link = generateResultShareLink();
        shareLinkEl.value = link;
        renderResultShareQr(link);
        if (copyShareBtnEl) copyShareBtnEl.hidden = false;
        msg("Résultats prêts à envoyer (QR + lien).");
      } catch (e) {
        if (copyShareBtnEl) copyShareBtnEl.hidden = true;
        msg(e && e.message ? e.message : "Impossible de générer le partage.");
      }
    });
  }
  if (copyShareBtnEl) copyShareBtnEl.addEventListener("click", copyResultShareLink);
  if (importScanBtnEl) importScanBtnEl.addEventListener("click", startImportScanner);
  if (importStopScanBtnEl) importStopScanBtnEl.addEventListener("click", stopImportScanner);

  load();
  renderSessionSelect();
  clearResultShareOutput();
  render();
})();
