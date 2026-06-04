/* Défi ATP */
(function () {
  "use strict";

  var BADGES = [
    { id: "streak3", label: "Série 3 victoires", unique: false, icon: "🔥", color: "badge--orange" },
    { id: "streak5", label: "Série 5 victoires", unique: false, icon: "🚀", color: "badge--orange" },
    { id: "streak10", label: "Série 10 victoires", unique: false, icon: "👑", color: "badge--orange" },
    { id: "beat1", label: "Battez le 1er", unique: false, icon: "🎯", color: "badge--purple" },
    { id: "beatTop3", label: "Battez un top 3", unique: false, icon: "🥊", color: "badge--purple" },
    { id: "top3", label: "Entrer dans le top 3", unique: true, icon: "🥉", color: "badge--blue" },
    { id: "top5", label: "Entrer dans le top 5", unique: true, icon: "🏅", color: "badge--blue" },
    { id: "rank1", label: "Devenir n°1", unique: true, icon: "🥇", color: "badge--yellow" },
    { id: "m10", label: "10 matchs joués", unique: true, icon: "🧱", color: "badge--green" },
    { id: "m25", label: "25 matchs joués", unique: true, icon: "🏋️", color: "badge--green" },
    { id: "m50", label: "50 matchs joués", unique: true, icon: "🏟️", color: "badge--green" },
    { id: "r10", label: "10 arbitrages", unique: true, icon: "🧑‍⚖️", color: "badge--teal" },
    { id: "r25", label: "25 arbitrages", unique: true, icon: "📣", color: "badge--teal" },
    { id: "r50", label: "50 arbitrages", unique: true, icon: "🦉", color: "badge--teal" },
    { id: "stopstreak", label: "Fin de série adverse", unique: false, icon: "🛑", color: "badge--red" },
    { id: "closeWin", label: "Victoire serrée (1 point)", unique: false, icon: "😮‍💨", color: "badge--gray" },
    { id: "bigWin", label: "Large victoire", unique: false, icon: "💥", color: "badge--red" },
    { id: "comeback", label: "Remontée de 5 places", unique: false, icon: "📈", color: "badge--green" },
  ];

  var DEFAULT_SETTINGS = {
    formula: "sports-co",
    initialPoints: 1000,
    refereeMode: "none",
    scoreMode: "none",
    bonusOffEnabled: false,
    bonusDefEnabled: false,
    bonusOffGap: 7,
    bonusOffPoints: 1,
    bonusDefGap: 2,
    bonusDefPoints: 1,
    formulas: {
      "sports-co": { win: 3, loss: -1, referee: 0 },
      "tennis-atp": {
        winVsBetter: 15,
        winVsLower: 5,
        loss: -1,
        lossVsBetter: -1,
        lossVsLower: -2,
        referee: 0,
      },
      participation: { win: 3, loss: 1, referee: 0 },
      differential: {
        betterPerPlace: 5,
        lowerPerPlace: 1,
        loss: -1,
        lossVsBetter: -1,
        lossVsLower: -2,
        referee: 0,
      },
      "swap-only": { referee: 0 },
    },
  };

  var state = { players: [], matches: [], ladder: [], settings: clone(DEFAULT_SETTINGS) };
  var activePlayerId = null;
  var editingMatchId = null;

  var FORMULA_HELP = {
    "sports-co": "Sports co : victoire +3, défaite -1, arbitre paramétrable (0 par défaut).",
    "tennis-atp": "ATP : battre mieux classé rapporte plus que battre moins bien classé.",
    participation: "Participation : gagner rapporte plus, mais perdre rapporte aussi.",
    differential: "Écart différentiel : points selon l’écart de places entre les joueurs.",
    "swap-only": "Échange de place : pas de points, inversion des rangs uniquement.",
  };

  var ids = [
    "defi-msg","defi-players-raw","defi-standings","defi-hof","defi-add-dialog","defi-open-add","defi-winner","defi-loser","defi-referee","defi-score-w","defi-score-l","defi-save-match","defi-ref-wrap","defi-score-wrap","defi-player-dialog","defi-player-title","defi-player-stats","defi-player-kpis","defi-player-perfs","defi-player-badges-earned","defi-player-badges-locked","defi-player-history","defi-match-history","defi-history-filter","defi-popup","defi-popup-winner-name","defi-popup-loser-name","defi-popup-winner-rank","defi-popup-loser-rank","defi-popup-winner-rank-big","defi-popup-loser-rank-big","defi-popup-winner-rank-chip","defi-popup-loser-rank-chip","defi-popup-winner-stats","defi-popup-loser-stats","defi-popup-badges","defi-formule","defi-initial-points","defi-ref-mode","defi-score-mode","defi-off-enabled","defi-off-gap","defi-off-points","defi-def-enabled","defi-def-gap","defi-def-points","defi-point-win","defi-point-loss","defi-point-ref","defi-point-better","defi-point-lower","defi-point-loss-better","defi-point-loss-lower","defi-point-better-per-place","defi-point-lower-per-place"
  ];
  var el = {};
  ids.forEach(function (id) { el[id] = document.getElementById(id); });

  var listeSaisieMeta =
    typeof ListeSaisieUi !== "undefined" && el["defi-players-raw"]
      ? ListeSaisieUi.bind({
          metaEl: document.getElementById("defi-players-raw-meta"),
          textareaEl: el["defi-players-raw"],
          getSessionCount: function () {
            return state.players.length;
          },
        })
      : null;

  if (typeof ListeManuellePanel !== "undefined" && el["defi-players-raw"]) {
    ListeManuellePanel.bind({
      toggleBtnId: "btn-ajouter-manuel-defi",
      panelId: "liste-manuelle-panel-defi",
      textareaEl: el["defi-players-raw"],
    });
  }

  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function id(prefix) { return (DataManager && DataManager.genererId ? DataManager.genererId(prefix) : prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8)); }
  function msg(t, ok) { if (!el["defi-msg"]) return; el["defi-msg"].hidden = !t; el["defi-msg"].textContent = t || ""; el["defi-msg"].classList.toggle("msg-ok", !!ok); el["defi-msg"].classList.toggle("msg-error", !ok); }
  function byId(pid) { return state.players.filter(function (p) { return p.id === pid; })[0] || null; }
  function ladderRankOf(pid) { return state.ladder.indexOf(pid) + 1; }
  function rankOf(pid) {
    var ladderRank = ladderRankOf(pid);
    if (ladderRank <= 0) return 0;
    if (state.settings && state.settings.formula === "swap-only") return ladderRank;
    var p = byId(pid);
    if (!p) return 0;
    var points = Number(p.points || 0);
    for (var i = 0; i < state.ladder.length; i++) {
      var other = byId(state.ladder[i]);
      if (other && Number(other.points || 0) === points) return i + 1;
    }
    return ladderRank;
  }

  function ensureState() {
    state.settings = Object.assign({}, clone(DEFAULT_SETTINGS), state.settings || {});
    state.settings.formulas = Object.assign({}, clone(DEFAULT_SETTINGS.formulas), state.settings.formulas || {});
    if (!Array.isArray(state.ladder)) state.ladder = [];
    var existing = {};
    state.players.forEach(function (p) { existing[p.id] = true; });
    state.ladder = state.ladder.filter(function (pid) { return !!existing[pid]; });
    state.players.forEach(function (p) {
      if (state.ladder.indexOf(p.id) < 0) state.ladder.push(p.id);
      p.points = Number(p.points || 0);
      p.wins = Number(p.wins || 0);
      p.losses = Number(p.losses || 0);
      p.refereed = Number(p.refereed || 0);
      p.matches = Number(p.matches || 0);
      p.currentStreak = Number(p.currentStreak || 0);
      p.bestStreak = Number(p.bestStreak || 0);
      p.badges = p.badges || {};
    });
  }

  function save() {
    return SessionManager.requireSessionId().then(function (sid) {
      return DataManager.saveDefiAtpForSession(sid, state);
    }).catch(function () { msg("Impossible d’enregistrer.", false); });
  }

  function load() {
    return SessionManager.requireSessionId().then(function (sid) {
      return DataManager.getDefiAtpForSession(sid);
    }).then(function (s) {
      state = s || state;
      ensureState();
      renderAll();
      syncParamsAccordionOpenState();
    }).catch(function () { renderAll(); });
  }

  function isFirstUseState() {
    return (!state.players || state.players.length === 0) && (!state.matches || state.matches.length === 0);
  }

  function syncParamsAccordionOpenState() {
    var paramsAccordion = document.getElementById("defi-params-accordion");
    if (!paramsAccordion) return;
    paramsAccordion.open = isFirstUseState();
  }

  function badgeCount(p) {
    return Object.keys(p.badges || {}).reduce(function (a, k) { return a + Number(p.badges[k] || 0); }, 0);
  }
  function grantBadge(p, badgeId) {
    var b = BADGES.filter(function (x) { return x.id === badgeId; })[0];
    if (!b) return;
    var current = Number(p.badges[badgeId] || 0);
    if (b.unique && current > 0) return;
    p.badges[badgeId] = current + 1;
  }

  function cloneBadgesMap(p) {
    var out = {};
    Object.keys(p.badges || {}).forEach(function (k) {
      out[k] = Number(p.badges[k] || 0);
    });
    return out;
  }

  function computeBadgeDiff(beforeMap, player) {
    var diff = [];
    BADGES.forEach(function (b) {
      var before = Number((beforeMap && beforeMap[b.id]) || 0);
      var after = Number((player.badges && player.badges[b.id]) || 0);
      if (after > before) {
        diff.push({ badge: b, gain: after - before, total: after });
      }
    });
    return diff;
  }

  function resetAddForm() {
    if (!el["defi-add-dialog"]) return;
    if (el["defi-add-dialog"].open) el["defi-add-dialog"].close();
    editingMatchId = null;
    if (el["defi-save-match"]) el["defi-save-match"].textContent = "Valider";
    el["defi-winner"].value = "";
    el["defi-loser"].value = "";
    el["defi-referee"].value = "";
    el["defi-score-w"].value = "";
    el["defi-score-l"].value = "";
    refreshAddDialog();
  }

  function resetPlayersForReplay() {
    state.players.forEach(function (p) {
      p.points = Number(state.settings.initialPoints || 0);
      p.wins = 0;
      p.losses = 0;
      p.matches = 0;
      p.refereed = 0;
      p.currentStreak = 0;
      p.bestStreak = 0;
      p.badges = {};
    });
    state.ladder = state.players.map(function (p) { return p.id; });
  }

  function formulaPreview(formulaKey, cfg) {
    cfg = cfg || {};
    if (formulaKey === "sports-co") return "Exemple: victoire +" + Number(cfg.win || 0) + ", défaite " + Number(cfg.loss || 0) + ", arbitre +" + Number(cfg.referee || 0) + ".";
    if (formulaKey === "tennis-atp") return "Exemple: victoire vs mieux classé +" + Number(cfg.winVsBetter || 0) + ", vs moins bien classé +" + Number(cfg.winVsLower || 0) + ".";
    if (formulaKey === "participation") return "Exemple: victoire +" + Number(cfg.win || 0) + ", défaite +" + Number(cfg.loss || 0) + ".";
    if (formulaKey === "differential") return "Exemple: vs mieux classé " + Number(cfg.betterPerPlace || 0) + " pts/place, vs moins bien classé " + Number(cfg.lowerPerPlace || 0) + " pts/place.";
    return "Exemple: points inchangés, seules les places sont échangées.";
  }

  function showWrap(id, visible) {
    var node = document.getElementById(id);
    if (node) node.hidden = !visible;
  }

  function applyFormulaVisibility() {
    var f = state.settings.formula;
    var isSwap = f === "swap-only";
    var isSports = f === "sports-co";
    var isPart = f === "participation";
    var isAtp = f === "tennis-atp";
    var isDiff = f === "differential";

    showWrap("defi-bonus-row", !isSwap);

    showWrap("defi-point-win-wrap", isSports || isPart);
    showWrap("defi-point-loss-wrap", isSports || isPart);
    showWrap("defi-point-ref-wrap", !isSwap);
    showWrap("defi-point-better-wrap", isAtp);
    showWrap("defi-point-lower-wrap", isAtp);
    showWrap("defi-point-loss-better-wrap", isAtp || isDiff);
    showWrap("defi-point-loss-lower-wrap", isAtp || isDiff);
    showWrap("defi-point-better-per-place-wrap", isDiff);
    showWrap("defi-point-lower-per-place-wrap", isDiff);
    updateBonusEnableUi();
  }

  function updateBonusEnableUi() {
    var offOn = el["defi-off-enabled"] && el["defi-off-enabled"].value === "1";
    var defOn = el["defi-def-enabled"] && el["defi-def-enabled"].value === "1";
    var offGapWrap = document.getElementById("defi-off-gap-wrap");
    var offPointsWrap = document.getElementById("defi-off-points-wrap");
    var defGapWrap = document.getElementById("defi-def-gap-wrap");
    var defPointsWrap = document.getElementById("defi-def-points-wrap");
    if (offGapWrap) offGapWrap.hidden = !offOn;
    if (offPointsWrap) offPointsWrap.hidden = !offOn;
    if (defGapWrap) defGapWrap.hidden = !defOn;
    if (defPointsWrap) defPointsWrap.hidden = !defOn;
  }

  function renderSettings() {
    var sel = el["defi-formule"];
    OutilsDom.clear(sel);
    [
      { k: "sports-co", t: "Type Sports co" },
      { k: "tennis-atp", t: "Type Tennis ATP" },
      { k: "participation", t: "Participation récompensée" },
      { k: "differential", t: "Écart différentiel" },
      { k: "swap-only", t: "Échange de place" },
    ].forEach(function (x) {
      var o = document.createElement("option");
      o.value = x.k;
      o.textContent = x.t;
      if (state.settings.formula === x.k) o.selected = true;
      sel.appendChild(o);
    });
    el["defi-initial-points"].value = String(state.settings.initialPoints);
    el["defi-ref-mode"].value = state.settings.refereeMode;
    el["defi-score-mode"].value = state.settings.scoreMode;
    el["defi-off-enabled"].value = state.settings.bonusOffEnabled ? "1" : "0";
    el["defi-def-enabled"].value = state.settings.bonusDefEnabled ? "1" : "0";
    el["defi-off-gap"].value = String(state.settings.bonusOffGap);
    el["defi-off-points"].value = String(state.settings.bonusOffPoints);
    el["defi-def-gap"].value = String(state.settings.bonusDefGap);
    el["defi-def-points"].value = String(state.settings.bonusDefPoints);
    var cfg = state.settings.formulas[state.settings.formula] || {};
    el["defi-point-win"].value = String(Number(cfg.win || 0));
    el["defi-point-loss"].value = String(Number(cfg.loss || 0));
    el["defi-point-ref"].value = String(Number(cfg.referee || 0));
    el["defi-point-better"].value = String(Number(cfg.winVsBetter || 0));
    el["defi-point-lower"].value = String(Number(cfg.winVsLower || 0));
    el["defi-point-loss-better"].value = String(Number(cfg.lossVsBetter != null ? cfg.lossVsBetter : cfg.loss || 0));
    el["defi-point-loss-lower"].value = String(Number(cfg.lossVsLower != null ? cfg.lossVsLower : cfg.loss || 0));
    el["defi-point-better-per-place"].value = String(Number(cfg.betterPerPlace || 0));
    el["defi-point-lower-per-place"].value = String(Number(cfg.lowerPerPlace || 0));
    var help = document.getElementById("defi-formule-help");
    var preview = document.getElementById("defi-formula-preview");
    if (help) help.textContent = FORMULA_HELP[state.settings.formula] || "";
    if (preview) {
      preview.textContent =
        formulaPreview(state.settings.formula, state.settings.formulas[state.settings.formula]) +
        " Bonus offensif: " + (state.settings.bonusOffEnabled ? "activé" : "désactivé") +
        " · Bonus défensif: " + (state.settings.bonusDefEnabled ? "activé" : "désactivé") + ".";
    }
    applyFormulaVisibility();
  }

  function renderStandings() {
    var tbody = el["defi-standings"];
    OutilsDom.clear(tbody);
    if (!state.players.length) {
      var tr0 = document.createElement("tr");
      var td0 = document.createElement("td");
      td0.colSpan = 8;
      td0.textContent = "Aucun joueur.";
      tr0.appendChild(td0);
      tbody.appendChild(tr0);
      return;
    }
    state.ladder.forEach(function (pid) {
      var p = byId(pid);
      if (!p) return;
      var tr = document.createElement("tr");
      var series = p.currentStreak >= 2 ? "🔥 " + p.currentStreak + " victoires" : "—";
      [rankOf(pid), p.name, p.points, p.wins, p.losses, "🏅 " + badgeCount(p), series].forEach(function (v) {
        var td = document.createElement("td");
        td.textContent = String(v);
        tr.appendChild(td);
      });
      var tda = document.createElement("td");
      var b = document.createElement("button");
      b.type = "button";
      b.className = "btn btn--ghost btn--small";
      b.textContent = "Voir";
      b.addEventListener("click", function () { openPlayer(p.id); });
      tda.appendChild(b);
      tr.appendChild(tda);
      tbody.appendChild(tr);
    });
  }

  function renderHof() {
    var list = el["defi-hof"];
    OutilsDom.clear(list);
    if (!state.players.length) {
      list.appendChild(OutilsDom.emptyState("Aucune donnée."));
      return;
    }
    var leaders = [
      { icon: "🔥", label: "Plus longue série", p: state.players.slice().sort(function (a, b) { return b.bestStreak - a.bestStreak; })[0], v: function (p) { return p.bestStreak + " victoires"; } },
      { icon: "🥇", label: "Plus de victoires", p: state.players.slice().sort(function (a, b) { return b.wins - a.wins; })[0], v: function (p) { return p.wins; } },
      { icon: "🎮", label: "Plus de matchs", p: state.players.slice().sort(function (a, b) { return b.matches - a.matches; })[0], v: function (p) { return p.matches; } },
      { icon: "🧑‍⚖️", label: "Plus d’arbitrages", p: state.players.slice().sort(function (a, b) { return b.refereed - a.refereed; })[0], v: function (p) { return p.refereed; } },
      { icon: "🏅", label: "Plus de badges", p: state.players.slice().sort(function (a, b) { return badgeCount(b) - badgeCount(a); })[0], v: function (p) { return badgeCount(p); } },
    ];
    leaders.forEach(function (x) {
      var card = document.createElement("article");
      card.className = "defi-hof-card";
      var top = document.createElement("div");
      top.className = "defi-hof-card__top";
      top.textContent = x.icon + " " + x.label;
      var name = document.createElement("div");
      name.className = "defi-hof-card__name";
      name.textContent = x.p ? x.p.name : "—";
      var val = document.createElement("div");
      val.className = "defi-hof-card__value";
      val.textContent = x.p ? String(x.v(x.p)) : "—";
      card.appendChild(top);
      card.appendChild(name);
      card.appendChild(val);
      list.appendChild(card);
    });
  }

  function replayMatches(records) {
    var src = Array.isArray(records) ? records.slice() : [];
    var ordered = src.sort(function (a, b) {
      return new Date(a.at || 0).getTime() - new Date(b.at || 0).getTime();
    });
    resetPlayersForReplay();
    state.matches = [];
    ordered.forEach(function (m) {
      addMatch(
        m.winnerId,
        m.loserId,
        m.refereeId || null,
        m.winnerScore,
        m.loserScore,
        { silent: true, noPopup: true, recordAt: m.at, recordId: m.id }
      );
    });
  }

  function renderMatchHistory() {
    var list = el["defi-match-history"];
    if (!list) return;
    OutilsDom.clear(list);
    var q = ((el["defi-history-filter"] && el["defi-history-filter"].value) || "").trim().toLowerCase();
    var filtered = state.matches.filter(function (m) {
      if (!q) return true;
      var w = byId(m.winnerId), l = byId(m.loserId), r = byId(m.refereeId);
      return ((w && w.name) || "").toLowerCase().indexOf(q) >= 0 ||
             ((l && l.name) || "").toLowerCase().indexOf(q) >= 0 ||
             ((r && r.name) || "").toLowerCase().indexOf(q) >= 0;
    });
    if (!filtered.length) {
      list.appendChild(OutilsDom.emptyState(q ? "Aucun match pour ce joueur." : "Aucun match enregistré."));
      return;
    }
    filtered.forEach(function (m) {
      var li = document.createElement("li");
      li.className = "defi-history-card defi-history-card--global";
      var w = byId(m.winnerId), l = byId(m.loserId), r = byId(m.refereeId);
      var row = document.createElement("div");
      row.className = "defi-history-card__line";
      var mainText = (w ? w.name : "?") + (m.winnerScore == null || m.loserScore == null ? " vs " : " " + m.winnerScore + "/" + m.loserScore + " ") + (l ? l.name : "?");
      row.innerHTML =
        '<span class="defi-history-name defi-history-name--winner">' + (w ? w.name : "?") + "</span>" +
        (m.winnerScore == null || m.loserScore == null
          ? '<span class="defi-history-score">vs</span>'
          : '<span class="defi-history-score">' + m.winnerScore + "/" + m.loserScore + "</span>") +
        '<span class="defi-history-name defi-history-name--loser">' + (l ? l.name : "?") + "</span>" +
        '<span class="defi-history-meta">📅 ' + new Date(m.at).toLocaleString("fr-FR") + "</span>" +
        (r ? ('<span class="defi-history-meta">🧑‍⚖️ ' + r.name + "</span>") : "");
      var actions = document.createElement("div");
      actions.className = "defi-history-card__actions";
      var bEdit = document.createElement("button");
      bEdit.type = "button";
      bEdit.className = "btn btn--ghost btn--small btn--icon-only";
      bEdit.textContent = "✏️";
      bEdit.setAttribute("aria-label", "Modifier " + mainText);
      bEdit.addEventListener("click", function () {
        editingMatchId = m.id;
        if (el["defi-save-match"]) el["defi-save-match"].textContent = "Mettre à jour";
        refreshAddDialog();
        el["defi-winner"].value = m.winnerId || "";
        el["defi-loser"].value = m.loserId || "";
        el["defi-referee"].value = m.refereeId || "";
        el["defi-score-w"].value = m.winnerScore == null ? "" : String(m.winnerScore);
        el["defi-score-l"].value = m.loserScore == null ? "" : String(m.loserScore);
        if (el["defi-add-dialog"].showModal) el["defi-add-dialog"].showModal();
      });
      var bDel = document.createElement("button");
      bDel.type = "button";
      bDel.className = "btn btn--danger btn--small btn--icon-only";
      bDel.textContent = "🗑️";
      bDel.setAttribute("aria-label", "Supprimer " + mainText);
      bDel.addEventListener("click", function () {
        if (!confirm("Supprimer ce résultat ? Le classement sera recalculé.")) return;
        var remaining = state.matches.filter(function (x) { return x.id !== m.id; });
        replayMatches(remaining);
        renderAll();
        save();
      });
      actions.appendChild(bEdit);
      actions.appendChild(bDel);
      li.appendChild(row);
      li.appendChild(actions);
      list.appendChild(li);
    });
  }

  function renderAll() {
    ensureState();
    renderSettings();
    renderStandings();
    renderHof();
    renderMatchHistory();
    refreshAddDialog();
    if (listeSaisieMeta) listeSaisieMeta.refresh();
  }

  function addPlayers(names) {
    var added = 0;
    var ignores = 0;
    names.forEach(function (n) {
      var name = (n || "").trim().replace(/\s+/g, " ");
      if (!name) return;
      var exists = state.players.some(function (p) {
        return p.name.toLowerCase() === name.toLowerCase();
      });
      if (exists) {
        ignores++;
        return;
      }
      var p = {
        id: id("player"),
        name: name,
        points: Number(state.settings.initialPoints || 0),
        wins: 0,
        losses: 0,
        matches: 0,
        refereed: 0,
        currentStreak: 0,
        bestStreak: 0,
        badges: {},
      };
      state.players.push(p);
      state.ladder.push(p.id);
      added++;
    });
    return { added: added, ignores: ignores };
  }

  function moveWinnerLoser(winnerId, loserId, formula) {
    var wIdx = state.ladder.indexOf(winnerId);
    var lIdx = state.ladder.indexOf(loserId);
    if (wIdx < 0 || lIdx < 0) return;
    if (formula === "swap-only") {
      state.ladder[wIdx] = loserId;
      state.ladder[lIdx] = winnerId;
      return;
    }
    state.ladder.splice(wIdx, 1);
    var nw = Math.max(0, wIdx - 1);
    state.ladder.splice(nw, 0, winnerId);
    var currentLoserIdx = state.ladder.indexOf(loserId);
    state.ladder.splice(currentLoserIdx, 1);
    var nl = Math.min(state.ladder.length, currentLoserIdx + 1);
    state.ladder.splice(nl, 0, loserId);
  }

  function reorderLadderByPoints() {
    var previousOrder = {};
    state.ladder.forEach(function (pid, idx) {
      previousOrder[pid] = idx;
    });
    state.ladder = state.ladder
      .slice()
      .sort(function (a, b) {
        var pa = byId(a);
        var pb = byId(b);
        var ptsA = pa ? Number(pa.points || 0) : 0;
        var ptsB = pb ? Number(pb.points || 0) : 0;
        if (ptsB !== ptsA) return ptsB - ptsA;
        return (previousOrder[a] || 0) - (previousOrder[b] || 0);
      });
  }

  function formatOpponentList(ids) {
    return ids
      .map(function (pid) {
        var p = byId(pid);
        return p ? p.name : "";
      })
      .filter(Boolean)
      .join(", ");
  }

  function formatMatchCount(n, singular, plural) {
    return n + " " + (n > 1 ? plural : singular);
  }

  function playerNemesisStats(pid) {
    var lostTo = {};
    var beaten = {};
    state.matches.forEach(function (m) {
      if (m.loserId === pid && m.winnerId) {
        lostTo[m.winnerId] = Number(lostTo[m.winnerId] || 0) + 1;
      }
      if (m.winnerId === pid && m.loserId) {
        beaten[m.loserId] = Number(beaten[m.loserId] || 0) + 1;
      }
    });

    function best(map) {
      var max = 0;
      Object.keys(map).forEach(function (id) {
        if (map[id] > max) max = map[id];
      });
      return {
        count: max,
        ids: Object.keys(map).filter(function (id) { return map[id] === max && max > 0; }),
      };
    }

    return {
      nemesis: best(lostTo),
      prey: best(beaten),
    };
  }

  function scoreDelta(winnerRank, loserRank) {
    var f = state.settings.formula;
    var cfg = state.settings.formulas[f] || {};
    if (f === "swap-only") return { w: 0, l: 0, r: 0 };
    if (f === "sports-co") return { w: Number(cfg.win || 0), l: Number(cfg.loss || 0), r: Number(cfg.referee || 0) };
    if (f === "participation") return { w: Number(cfg.win || 0), l: Number(cfg.loss || 0), r: Number(cfg.referee || 0) };
    if (f === "tennis-atp") {
      var better = loserRank < winnerRank;
      var loserLostToBetter = winnerRank < loserRank;
      var lossValueAtp = loserLostToBetter
        ? Number(cfg.lossVsBetter != null ? cfg.lossVsBetter : cfg.loss || 0)
        : Number(cfg.lossVsLower != null ? cfg.lossVsLower : cfg.loss || 0);
      return { w: better ? Number(cfg.winVsBetter || 0) : Number(cfg.winVsLower || 0), l: lossValueAtp, r: Number(cfg.referee || 0) };
    }
    if (f === "differential") {
      var gap = Math.abs(winnerRank - loserRank) || 1;
      var wb = loserRank < winnerRank;
      var loserLostToBetterDiff = winnerRank < loserRank;
      var lossValueDiff = loserLostToBetterDiff
        ? Number(cfg.lossVsBetter != null ? cfg.lossVsBetter : cfg.loss || 0)
        : Number(cfg.lossVsLower != null ? cfg.lossVsLower : cfg.loss || 0);
      return { w: gap * Number(wb ? cfg.betterPerPlace : cfg.lowerPerPlace), l: lossValueDiff, r: Number(cfg.referee || 0) };
    }
    return { w: 0, l: 0, r: 0 };
  }

  function parseMaybeInt(v) {
    if (v === "" || v == null) return null;
    var n = parseInt(String(v), 10);
    return isNaN(n) ? null : n;
  }

  function formatPositionFr(rank) {
    var n = Number(rank || 0);
    if (n <= 0) return "—";
    return n === 1 ? "1re" : n + "e";
  }

  function formatPlaceForPopup(rank) {
    var n = Number(rank || 0);
    if (n <= 0) return "—";
    return n === 1 ? "1er" : n + "eme";
  }

  function deltaPlaceHtml(delta, positiveDirection) {
    if (!delta) return '<span class="defi-delta-chip">= 0 place</span>';
    if (positiveDirection === "up") {
      return delta > 0
        ? '<span class="defi-delta-chip defi-delta-chip--up">⬆ +' + delta + " place(s)</span>"
        : '<span class="defi-delta-chip defi-delta-chip--down">⬇ ' + Math.abs(delta) + " place(s)</span>";
    }
    return delta > 0
      ? '<span class="defi-delta-chip defi-delta-chip--down">⬇ ' + delta + " place(s)</span>"
      : '<span class="defi-delta-chip defi-delta-chip--up">⬆ +' + Math.abs(delta) + " place(s)</span>";
  }

  function addMatch(wid, lid, rid, ws, ls, options) {
    options = options || {};
    var w = byId(wid), l = byId(lid), r = rid ? byId(rid) : null;
    function fail(text) {
      if (!options.silent) msg(text, false);
      return false;
    }
    if (!w || !l || wid === lid) return fail("Choisissez un gagnant et un perdant différents.");
    if (state.settings.refereeMode === "required" && !r) return fail("Arbitre obligatoire.");
    if (state.settings.scoreMode === "required" && (ws == null || ls == null)) return fail("Score obligatoire.");
    if (state.settings.scoreMode !== "none" && ws != null && ls != null && ws <= ls) {
      return fail("Le score du gagnant doit être supérieur.");
    }
    var wrBefore = rankOf(wid), lrBefore = rankOf(lid);
    var del = scoreDelta(wrBefore, lrBefore);
    var wBadgesBefore = cloneBadgesMap(w);
    var lBadgesBefore = cloneBadgesMap(l);
    var rBadgesBefore = r ? cloneBadgesMap(r) : {};
    var offBonus = 0, defBonus = 0;
    if (state.settings.scoreMode !== "none" && ws != null && ls != null) {
      var gap = ws - ls;
      if (state.settings.bonusOffEnabled && gap >= Number(state.settings.bonusOffGap || 0)) {
        offBonus = Number(state.settings.bonusOffPoints || 0);
      }
      if (state.settings.bonusDefEnabled && gap <= Number(state.settings.bonusDefGap || 0)) {
        defBonus = Number(state.settings.bonusDefPoints || 0);
      }
      if (gap === 1) grantBadge(w, "closeWin");
      if (gap >= 7) grantBadge(w, "bigWin");
    }
    w.points += del.w + offBonus;
    l.points += del.l + defBonus;
    if (r) r.points += del.r;
    w.wins++; l.losses++;
    w.matches++; l.matches++;
    if (r) r.refereed++;
    w.currentStreak += 1;
    if (w.currentStreak > w.bestStreak) w.bestStreak = w.currentStreak;
    if (l.currentStreak >= 3) grantBadge(w, "stopstreak");
    l.currentStreak = 0;
    moveWinnerLoser(wid, lid, state.settings.formula);
    if (state.settings.formula !== "swap-only") {
      reorderLadderByPoints();
    }
    var wrAfter = rankOf(wid), lrAfter = rankOf(lid);
    if (lrBefore === 1) grantBadge(w, "beat1");
    if (lrBefore <= 3) grantBadge(w, "beatTop3");
    if (wrAfter <= 3) grantBadge(w, "top3");
    if (wrAfter <= 5) grantBadge(w, "top5");
    if (wrAfter === 1) grantBadge(w, "rank1");
    if (w.currentStreak >= 3) grantBadge(w, "streak3");
    if (w.currentStreak >= 5) grantBadge(w, "streak5");
    if (w.currentStreak >= 10) grantBadge(w, "streak10");
    if (w.matches >= 10) grantBadge(w, "m10");
    if (w.matches >= 25) grantBadge(w, "m25");
    if (w.matches >= 50) grantBadge(w, "m50");
    if (l.matches >= 10) grantBadge(l, "m10");
    if (l.matches >= 25) grantBadge(l, "m25");
    if (l.matches >= 50) grantBadge(l, "m50");
    if (r && r.refereed >= 10) grantBadge(r, "r10");
    if (r && r.refereed >= 25) grantBadge(r, "r25");
    if (r && r.refereed >= 50) grantBadge(r, "r50");
    if (wrBefore - wrAfter >= 5) grantBadge(w, "comeback");
    state.matches.unshift({
      id: options.recordId || id("match"),
      at: options.recordAt || new Date().toISOString(),
      winnerId: wid,
      loserId: lid,
      refereeId: rid || null,
      winnerScore: ws, loserScore: ls, winnerRankBefore: wrBefore, loserRankBefore: lrBefore, winnerRankAfter: wrAfter, loserRankAfter: lrAfter,
      winnerPointsDelta: del.w + offBonus, loserPointsDelta: del.l + defBonus, refereePointsDelta: r ? del.r : 0
    });
    var wDiff = computeBadgeDiff(wBadgesBefore, w);
    var lDiff = computeBadgeDiff(lBadgesBefore, l);
    var rDiff = r ? computeBadgeDiff(rBadgesBefore, r) : [];
    el["defi-popup-winner-name"].textContent = w.name;
    el["defi-popup-loser-name"].textContent = l.name;
    var winnerPlace = formatPlaceForPopup(wrAfter);
    var loserPlace = formatPlaceForPopup(lrAfter);
    if (el["defi-popup-winner-rank"]) el["defi-popup-winner-rank"].textContent = "Position actuelle : " + winnerPlace;
    if (el["defi-popup-loser-rank"]) el["defi-popup-loser-rank"].textContent = "Position actuelle : " + loserPlace;
    if (el["defi-popup-winner-rank-chip"]) el["defi-popup-winner-rank-chip"].textContent = winnerPlace;
    if (el["defi-popup-loser-rank-chip"]) el["defi-popup-loser-rank-chip"].textContent = loserPlace;
    if (el["defi-popup-winner-rank-big"]) el["defi-popup-winner-rank-big"].textContent = String(wrAfter);
    if (el["defi-popup-loser-rank-big"]) el["defi-popup-loser-rank-big"].textContent = String(lrAfter);
    el["defi-popup-winner-stats"].innerHTML =
      '<span class="defi-delta-chip defi-delta-chip--up">+' + (del.w + offBonus) + " pts</span> " +
      deltaPlaceHtml(wrBefore - wrAfter, "up");
    el["defi-popup-loser-stats"].innerHTML =
      '<span class="defi-delta-chip ' + ((del.l + defBonus) >= 0 ? "defi-delta-chip--up" : "defi-delta-chip--down") + '">' +
      ((del.l + defBonus) >= 0 ? "+" : "") + (del.l + defBonus) + " pts</span> " +
      deltaPlaceHtml(lrAfter - lrBefore, "down");
    OutilsDom.clear(el["defi-popup-badges"]);
    function appendBadgeLine(owner, badgeGain) {
      var li = document.createElement("li");
      li.className = "defi-victory__badge";
      li.textContent = (badgeGain.badge.icon || "🏅") + " " + owner + " débloque " + badgeGain.badge.label + (badgeGain.gain > 1 ? " (+" + badgeGain.gain + ")" : "");
      el["defi-popup-badges"].appendChild(li);
    }
    wDiff.forEach(function (b) { appendBadgeLine(w.name, b); });
    lDiff.forEach(function (b) { appendBadgeLine(l.name, b); });
    rDiff.forEach(function (b) { appendBadgeLine(r.name, b); });
    if (!el["defi-popup-badges"].children.length) {
      var none = document.createElement("li");
      none.className = "defi-victory__badge defi-victory__badge--none";
      none.textContent = "Aucun nouveau badge sur ce match.";
      el["defi-popup-badges"].appendChild(none);
    }
    if (!options.silent) {
      if (!options.noPopup && el["defi-popup"].showModal) el["defi-popup"].showModal();
      msg("Résultat enregistré.", true);
      renderAll();
      save();
      var paramsAccordion = document.getElementById("defi-params-accordion");
      if (paramsAccordion) paramsAccordion.open = false;
    }
    return true;
  }

  function refreshAddDialog() {
    var oldWinner = el["defi-winner"].value || "";
    var oldLoser = el["defi-loser"].value || "";
    var oldRef = el["defi-referee"].value || "";
    function fillSelect(node, includeBlank, filterFn) {
      OutilsDom.clear(node);
      if (includeBlank) {
        var o0 = document.createElement("option");
        o0.value = "";
        o0.textContent = "—";
        node.appendChild(o0);
      }
      state.ladder.forEach(function (pid) {
        var p = byId(pid);
        if (!p) return;
        if (typeof filterFn === "function" && !filterFn(p.id)) return;
        var o = document.createElement("option");
        o.value = p.id;
        o.textContent = rankOf(pid) + ". " + p.name;
        node.appendChild(o);
      });
    }
    fillSelect(el["defi-winner"], true);
    if (oldWinner) el["defi-winner"].value = oldWinner;
    var selectedWinner = el["defi-winner"].value || "";
    fillSelect(el["defi-loser"], true, function (pid) { return pid !== selectedWinner; });
    if (oldLoser && oldLoser !== selectedWinner) el["defi-loser"].value = oldLoser;
    var selectedLoser = el["defi-loser"].value || "";
    fillSelect(el["defi-referee"], true, function (pid) { return pid !== selectedWinner && pid !== selectedLoser; });
    if (oldRef && oldRef !== selectedWinner && oldRef !== selectedLoser) el["defi-referee"].value = oldRef;
    var rm = state.settings.refereeMode;
    var sm = state.settings.scoreMode;
    el["defi-ref-wrap"].hidden = rm === "none";
    el["defi-score-wrap"].hidden = sm === "none";
    el["defi-referee"].required = rm === "required";
    el["defi-score-w"].required = sm === "required";
    el["defi-score-l"].required = sm === "required";
    selectedLoser = el["defi-loser"].value || "";
    fillSelect(el["defi-referee"], true, function (pid) { return pid !== selectedWinner && pid !== selectedLoser; });
  }

  function openPlayer(pid) {
    activePlayerId = pid;
    var p = byId(pid);
    if (!p) return;
    el["defi-player-title"].textContent = p.name;
    el["defi-player-stats"].textContent = "Rang " + rankOf(p.id) + " · " + p.points + " pts";
    var winBtn = document.getElementById("defi-declare-win");
    var lossBtn = document.getElementById("defi-declare-loss");
    if (winBtn) winBtn.textContent = "🥇 " + p.name + " a gagné";
    if (lossBtn) lossBtn.textContent = "💥 " + p.name + " a perdu";

    OutilsDom.clear(el["defi-player-kpis"]);
    [
      { label: "Victoires", value: p.wins, icon: "🥇" },
      { label: "Défaites", value: p.losses, icon: "💥" },
      { label: "Arbitrages", value: p.refereed, icon: "🧑‍⚖️" },
      { label: "Matchs joués", value: p.matches, icon: "🎮" },
    ].forEach(function (k) {
      var card = document.createElement("article");
      card.className = "defi-kpi-card";
      card.innerHTML = '<div class="defi-kpi-card__label">' + k.icon + " " + k.label + '</div><div class="defi-kpi-card__value">' + k.value + "</div>";
      el["defi-player-kpis"].appendChild(card);
    });

    OutilsDom.clear(el["defi-player-perfs"]);
    var nemesisStats = playerNemesisStats(p.id);
    [
      { label: "Série en cours", value: p.currentStreak + " victoires", icon: "🔥" },
      { label: "Série la plus longue", value: p.bestStreak + " victoires", icon: "🚀" },
      { label: "Badges obtenus", value: badgeCount(p), icon: "🏅" },
      {
        label: "Ma bête noire",
        value: nemesisStats.nemesis.count
          ? formatOpponentList(nemesisStats.nemesis.ids) + " (" + formatMatchCount(nemesisStats.nemesis.count, "défaite", "défaites") + ")"
          : "Aucune défaite",
        icon: "🎯",
      },
      {
        label: "Je suis la bête noire de",
        value: nemesisStats.prey.count
          ? formatOpponentList(nemesisStats.prey.ids) + " (" + formatMatchCount(nemesisStats.prey.count, "victoire", "victoires") + ")"
          : "Aucune victoire",
        icon: "🥇",
      },
    ].forEach(function (k) {
      var card2 = document.createElement("article");
      card2.className = "defi-kpi-card defi-kpi-card--sub";
      var label = document.createElement("div");
      label.className = "defi-kpi-card__label";
      label.textContent = k.icon + " " + k.label;
      var value = document.createElement("div");
      value.className = "defi-kpi-card__value";
      value.textContent = k.value;
      card2.appendChild(label);
      card2.appendChild(value);
      el["defi-player-perfs"].appendChild(card2);
    });
    OutilsDom.clear(el["defi-player-badges-earned"]);
    OutilsDom.clear(el["defi-player-badges-locked"]);
    BADGES.forEach(function (b) {
      var n = Number(p.badges[b.id] || 0);
      var li = document.createElement("li");
      li.className = "defi-badge " + (b.color || "") + (n ? " defi-badge--earned" : " defi-badge--locked");
      li.textContent = (n ? (b.icon || "🏅") : "🔒") + " " + b.label + (n ? " ×" + n : "");
      if (n) el["defi-player-badges-earned"].appendChild(li);
      else el["defi-player-badges-locked"].appendChild(li);
    });
    OutilsDom.clear(el["defi-player-history"]);
    state.matches.slice(0, 30).forEach(function (m) {
      if (m.winnerId !== pid && m.loserId !== pid && m.refereeId !== pid) return;
      var li = document.createElement("li");
      li.className = "defi-history-card defi-history-card--global";
      var w = byId(m.winnerId), l = byId(m.loserId), r = byId(m.refereeId);
      li.innerHTML =
        '<div class="defi-history-card__line">' +
        '<span class="defi-history-name defi-history-name--winner">' + (w ? w.name : "?") + "</span>" +
        (m.winnerScore == null || m.loserScore == null
          ? '<span class="defi-history-score">vs</span>'
          : '<span class="defi-history-score">' + m.winnerScore + "/" + m.loserScore + "</span>") +
        '<span class="defi-history-name defi-history-name--loser">' + (l ? l.name : "?") + "</span>" +
        '<span class="defi-history-meta">📅 ' + new Date(m.at).toLocaleString("fr-FR") + "</span>" +
        (r ? ('<span class="defi-history-meta">🧑‍⚖️ ' + r.name + "</span>") : "") +
        "</div>";
      el["defi-player-history"].appendChild(li);
    });
    if (el["defi-player-dialog"].showModal) el["defi-player-dialog"].showModal();
  }

  function exportCsv(kind) {
    var lines = [];
    if (kind === "standings") {
      lines.push("Rang;Joueur;Points;Victoires;Defaites;Badges;Serie");
      state.ladder.forEach(function (pid) {
        var p = byId(pid);
        lines.push([rankOf(pid), p.name, p.points, p.wins, p.losses, badgeCount(p), p.currentStreak].join(";"));
      });
    } else {
      lines.push("Date;Gagnant;Perdant;Arbitre;Score;Delta gagnant;Delta perdant");
      state.matches.forEach(function (m) {
        var w = byId(m.winnerId), l = byId(m.loserId), r = byId(m.refereeId);
        var sc = m.winnerScore == null || m.loserScore == null ? "" : m.winnerScore + "-" + m.loserScore;
        lines.push([m.at, w ? w.name : "", l ? l.name : "", r ? r.name : "", sc, m.winnerPointsDelta, m.loserPointsDelta].join(";"));
      });
    }
    var blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = kind === "standings" ? "defi-atp-classement.csv" : "defi-atp-resultats.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function bind() {
    document.getElementById("defi-add-players").addEventListener("click", function () {
      var raw = (el["defi-players-raw"].value || "").split(/\r?\n/);
      var stats = addPlayers(raw);
      el["defi-players-raw"].value = "";
      renderAll();
      save();
      msg(
        typeof ImportElevePresence !== "undefined"
          ? ImportElevePresence.messageImportEleves({
              ajoutes: stats.added,
              ignores: stats.ignores,
            })
          : stats.added + " joueur(s) ajouté(s).",
        stats.added > 0
      );
    });
    document.getElementById("defi-import-classe").addEventListener("click", function () {
      if (typeof ClassImport === "undefined") return;
      ClassImport.open({
        title: "Importer des élèves",
        hint: "Les joueurs déjà dans le défi sont grisés. Cochez les nouveaux élèves à ajouter.",
        dejaPresent: function (e) {
          return (
            typeof ImportElevePresence !== "undefined" &&
            ImportElevePresence.eleveEstDansListe(state.players, e)
          );
        },
        defaultChecked: true,
        onConfirm: function (eleves, classe, metaImport) {
          var stats = addPlayers(
            eleves.map(function (e) {
              return typeof ImportElevePresence !== "undefined"
                ? ImportElevePresence.labelEleveImport(e)
                : (EleveDisplay && EleveDisplay.formatEleveListe
                    ? EleveDisplay.formatEleveListe(e, "")
                    : [e.nom, e.prenom].filter(Boolean).join(" ")
                  ).trim();
            })
          );
          var ignores = metaImport && metaImport.ignores ? metaImport.ignores : 0;
          renderAll();
          save();
          msg(
            typeof ImportElevePresence !== "undefined"
              ? ImportElevePresence.messageImportEleves({
                  ajoutes: stats.added,
                  ignores: ignores,
                  contexte: "« " + classe.nom + " »",
                })
              : stats.added + " joueur(s) importé(s) depuis « " + classe.nom + " ».",
            stats.added > 0
          );
        },
      });
    });
    document.getElementById("defi-open-add").addEventListener("click", function () {
      var paramsAccordion = document.getElementById("defi-params-accordion");
      if (paramsAccordion) paramsAccordion.open = false;
      refreshAddDialog();
      if (el["defi-add-dialog"].showModal) el["defi-add-dialog"].showModal();
    });
    document.getElementById("defi-winner").addEventListener("change", function () {
      refreshAddDialog();
    });
    document.getElementById("defi-loser").addEventListener("change", function () {
      refreshAddDialog();
    });
    document.getElementById("defi-formule").addEventListener("change", function () {
      state.settings.formula = el["defi-formule"].value;
      refreshAddDialog();
      renderSettings();
    });
    document.getElementById("defi-off-enabled").addEventListener("change", updateBonusEnableUi);
    document.getElementById("defi-def-enabled").addEventListener("change", updateBonusEnableUi);
    document.getElementById("defi-save-match").addEventListener("click", function () {
      if (editingMatchId) {
        var current = state.matches.find(function (m) { return m.id === editingMatchId; });
        if (!current) {
          editingMatchId = null;
          if (el["defi-save-match"]) el["defi-save-match"].textContent = "Valider";
          return;
        }
        var updated = Object.assign({}, current, {
          winnerId: el["defi-winner"].value,
          loserId: el["defi-loser"].value,
          refereeId: el["defi-referee"].value || null,
          winnerScore: parseMaybeInt(el["defi-score-w"].value),
          loserScore: parseMaybeInt(el["defi-score-l"].value),
        });
        var rebuilt = state.matches.map(function (m) { return m.id === editingMatchId ? updated : m; });
        replayMatches(rebuilt);
        editingMatchId = null;
        if (el["defi-save-match"]) el["defi-save-match"].textContent = "Valider";
        if (el["defi-add-dialog"] && el["defi-add-dialog"].open) el["defi-add-dialog"].close();
        msg("Résultat modifié.", true);
        renderAll();
        save();
        return;
      }
      addMatch(
        el["defi-winner"].value,
        el["defi-loser"].value,
        el["defi-referee"].value || null,
        parseMaybeInt(el["defi-score-w"].value),
        parseMaybeInt(el["defi-score-l"].value)
      );
    });
    document.getElementById("defi-save-settings").addEventListener("click", function () {
      state.settings.formula = el["defi-formule"].value;
      state.settings.initialPoints = Number(el["defi-initial-points"].value || 0);
      state.settings.refereeMode = el["defi-ref-mode"].value;
      state.settings.scoreMode = el["defi-score-mode"].value;
      state.settings.bonusOffEnabled = el["defi-off-enabled"].value === "1";
      state.settings.bonusDefEnabled = el["defi-def-enabled"].value === "1";
      state.settings.bonusOffGap = Number(el["defi-off-gap"].value || 0);
      state.settings.bonusOffPoints = Number(el["defi-off-points"].value || 0);
      state.settings.bonusDefGap = Number(el["defi-def-gap"].value || 0);
      state.settings.bonusDefPoints = Number(el["defi-def-points"].value || 0);
      var f = state.settings.formula;
      var cfg = state.settings.formulas[f] || {};
      if (f === "sports-co" || f === "participation") {
        cfg.win = Number(el["defi-point-win"].value || 0);
        cfg.loss = Number(el["defi-point-loss"].value || 0);
        cfg.referee = Number(el["defi-point-ref"].value || 0);
      } else if (f === "tennis-atp") {
        cfg.winVsBetter = Number(el["defi-point-better"].value || 0);
        cfg.winVsLower = Number(el["defi-point-lower"].value || 0);
        cfg.lossVsBetter = Number(el["defi-point-loss-better"].value || 0);
        cfg.lossVsLower = Number(el["defi-point-loss-lower"].value || 0);
        cfg.loss = Number(el["defi-point-loss"].value || 0);
        cfg.referee = Number(el["defi-point-ref"].value || 0);
      } else if (f === "differential") {
        cfg.betterPerPlace = Number(el["defi-point-better-per-place"].value || 0);
        cfg.lowerPerPlace = Number(el["defi-point-lower-per-place"].value || 0);
        cfg.lossVsBetter = Number(el["defi-point-loss-better"].value || 0);
        cfg.lossVsLower = Number(el["defi-point-loss-lower"].value || 0);
        cfg.loss = Number(el["defi-point-loss"].value || 0);
        cfg.referee = Number(el["defi-point-ref"].value || 0);
      } else if (f === "swap-only") {
        cfg.referee = 0;
      }
      state.settings.formulas[f] = cfg;
      msg("Paramètres enregistrés.", true);
      renderAll();
      save();
    });
    document.getElementById("defi-apply-initial").addEventListener("click", function () {
      var v = Number(el["defi-initial-points"].value || 0);
      if (
        !confirm(
          "Appliquer " +
            v +
            " point(s) à tous les joueurs ?\n\n" +
            "Cette action remplace les points actuels de chaque joueur, " +
            "sans modifier l’historique des matchs."
        )
      ) {
        return;
      }
      state.players.forEach(function (p) { p.points = v; });
      msg("Points initiaux appliqués à tous.", true);
      renderAll();
      save();
    });
    document.getElementById("defi-export-classement").addEventListener("click", function () { exportCsv("standings"); });
    document.getElementById("defi-export-matchs").addEventListener("click", function () { exportCsv("matches"); });
    if (el["defi-history-filter"]) {
      el["defi-history-filter"].addEventListener("input", function () {
        renderMatchHistory();
      });
    }
    document.getElementById("defi-declare-win").addEventListener("click", function () {
      refreshAddDialog();
      el["defi-winner"].value = activePlayerId || "";
      if (el["defi-player-dialog"] && el["defi-player-dialog"].open) el["defi-player-dialog"].close();
      if (el["defi-add-dialog"].showModal) el["defi-add-dialog"].showModal();
    });
    document.getElementById("defi-declare-loss").addEventListener("click", function () {
      refreshAddDialog();
      el["defi-loser"].value = activePlayerId || "";
      if (el["defi-player-dialog"] && el["defi-player-dialog"].open) el["defi-player-dialog"].close();
      if (el["defi-add-dialog"].showModal) el["defi-add-dialog"].showModal();
    });
    if (el["defi-popup"]) {
      el["defi-popup"].addEventListener("close", function () {
        resetAddForm();
      });
    }
    if (el["defi-add-dialog"]) {
      el["defi-add-dialog"].querySelectorAll('[data-action="close-add-dialog"]').forEach(function (btn) {
        btn.addEventListener("click", function () {
          el["defi-add-dialog"].close();
        });
      });
      el["defi-add-dialog"].addEventListener("close", function () {
        editingMatchId = null;
        if (el["defi-save-match"]) el["defi-save-match"].textContent = "Valider";
      });
    }
  }

  SessionManager.init({
    toolId: DataManager.SESSION_TOOLS.DEFI_ATP,
    toolLabel: "Défi ATP",
    onSessionReady: function () { return load(); },
    onSessionCleared: function () {
      state = { players: [], matches: [], ladder: [], settings: clone(DEFAULT_SETTINGS) };
      renderAll();
      syncParamsAccordionOpenState();
    },
  });
  bind();
})();
