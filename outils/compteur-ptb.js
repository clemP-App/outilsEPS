/**
 * Compteur PTB — Perte / Tir / But pour sports collectifs.
 * Stockage local volontairement autonome via localStorage.
 */
(function () {
  "use strict";

  var TOOL_ID = "compteur-ptb";
  var TEAM_IDS = ["a", "b"];

  var els = {};
  var state = createInitialState();
  var timerId = null;
  var wakeLockSentinel = null;
  var audioCtx = null;
  var lastWarnSec = -1;

  function $(id) {
    return document.getElementById(id);
  }

  function bindEls() {
    [
      "ptb-mode",
      "ptb-min",
      "ptb-sec",
      "ptb-duration-field",
      "ptb-initial-possession",
      "ptb-name-a",
      "ptb-name-b",
      "ptb-color-a",
      "ptb-color-b",
      "ptb-match",
      "ptb-possession-band",
      "ptb-possession-label",
      "ptb-timer-box",
      "ptb-timer-label",
      "ptb-time",
      "ptb-timer-main",
      "ptb-reset-timer",
      "ptb-change-possession",
      "ptb-undo",
      "ptb-finish",
      "ptb-finish-msg",
      "ptb-score-a",
      "ptb-score-b",
      "ptb-panel-name-a",
      "ptb-panel-name-b",
      "ptb-live-stats",
      "ptb-compare",
      "ptb-reset-match",
    ].forEach(function (id) {
      els[id] = $(id);
    });
  }

  function createInitialState() {
    return {
      mode: "none",
      durationMs: 8 * 60 * 1000,
      startedAtIso: null,
      endedAtIso: null,
      running: false,
      paused: false,
      finished: false,
      elapsedMs: 0,
      remainingMs: 8 * 60 * 1000,
      lastTick: 0,
      possession: "a",
      teams: {
        a: { name: "Équipe A", color: "#2563eb", losses: 0, shots: 0, goals: 0, possessionMs: 0 },
        b: { name: "Équipe B", color: "#dc2626", losses: 0, shots: 0, goals: 0, possessionMs: 0 },
      },
      history: [],
    };
  }

  function parseDurationMs() {
    var min = parseInt(els["ptb-min"].value, 10);
    var sec = parseInt(els["ptb-sec"].value, 10);
    if (isNaN(min) || min < 0) min = 0;
    if (isNaN(sec) || sec < 0) sec = 0;
    if (sec > 59) sec = 59;
    return (min * 60 + sec) * 1000;
  }

  function persisterNoms() {
    if (typeof EleveLabels === "undefined") return;
    EleveLabels.saveToolLabels(TOOL_ID, {
      nameA: state.teams.a.name,
      nameB: state.teams.b.name,
    });
  }

  function chargerNoms() {
    if (typeof EleveLabels === "undefined") return;
    var saved = EleveLabels.getToolLabels(TOOL_ID);
    if (saved.nameA) {
      state.teams.a.name = saved.nameA;
      if (els["ptb-name-a"]) els["ptb-name-a"].value = saved.nameA;
    }
    if (saved.nameB) {
      state.teams.b.name = saved.nameB;
      if (els["ptb-name-b"]) els["ptb-name-b"].value = saved.nameB;
    }
  }

  function readConfig() {
    state.mode = ["up", "down"].indexOf(els["ptb-mode"].value) !== -1 ? els["ptb-mode"].value : "none";
    state.durationMs = parseDurationMs();
    if (!state.running && !state.paused) state.remainingMs = state.durationMs;
    state.teams.a.name = els["ptb-name-a"].value.trim() || "Équipe A";
    state.teams.b.name = els["ptb-name-b"].value.trim() || "Équipe B";
    state.teams.a.color = els["ptb-color-a"].value || "#2563eb";
    state.teams.b.color = els["ptb-color-b"].value || "#dc2626";
    if (!state.running && !state.paused && !state.history.length) {
      state.possession = els["ptb-initial-possession"].value === "b" ? "b" : "a";
    }
    persisterNoms();
  }

  function buildExportPayload() {
    readConfig();
    var totalPossMs = Math.max(1, state.teams.a.possessionMs + state.teams.b.possessionMs);
    function pack(id) {
      var t = state.teams[id];
      var st = teamStats(t);
      var hasChrono = state.mode !== "none";
      return {
        name: t.name,
        color: t.color,
        goals: t.goals,
        shots: t.shots,
        losses: t.losses,
        possessions: st.possessions,
        efficiency: st.efficiency,
        lossRate: st.lossRate,
        shotsPerPossession: Math.round(st.shotsPerPossession * 100),
        lossesPerPossession: Math.round(st.lossesPerPossession * 100),
        possessionMs: hasChrono ? t.possessionMs : null,
        possessionLabel: hasChrono
          ? formatTime(t.possessionMs) + " (" + Math.round((t.possessionMs / totalPossMs) * 100) + "%)"
          : null,
      };
    }
    var hasChrono = state.mode !== "none";
    return {
      mode: state.mode,
      finished: state.finished,
      startedAtIso: state.startedAtIso,
      endedAtIso: state.endedAtIso,
      timer: hasChrono
        ? {
            mode: state.mode,
            durationLabel: formatTime(state.durationMs),
            elapsedLabel: formatTime(state.elapsedMs),
            displayLabel: formatTime(displayedTimeMs()),
            statusLabel: state.finished
              ? "Fin du match"
              : state.paused
                ? "En pause"
                : state.running
                  ? state.mode === "down"
                    ? "Temps restant"
                    : "Temps écoulé"
                  : "Prêt",
          }
        : null,
      teams: { a: pack("a"), b: pack("b") },
    };
  }

  function clearNode(node) {
    if (typeof OutilsDom !== "undefined" && OutilsDom.clear) {
      OutilsDom.clear(node);
      return;
    }
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  function syncInitialPossessionLabels() {
    var select = els["ptb-initial-possession"];
    var selected = select.value || "a";
    clearNode(select);
    TEAM_IDS.forEach(function (id) {
      if (typeof OutilsDom !== "undefined" && OutilsDom.option) {
        OutilsDom.option(select, id, state.teams[id].name);
      } else {
        var option = document.createElement("option");
        option.value = id;
        option.textContent = state.teams[id].name;
        select.appendChild(option);
      }
    });
    select.value = selected;
  }

  function formatTime(ms) {
    var total = Math.max(0, Math.floor(ms / 1000));
    var h = Math.floor(total / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total % 60;
    var mm = (m < 10 ? "0" : "") + m;
    var ss = (s < 10 ? "0" : "") + s;
    if (h > 0) return h + ":" + mm + ":" + ss;
    return mm + ":" + ss;
  }

  function displayedTimeMs() {
    return state.mode === "down" ? state.remainingMs : state.elapsedMs;
  }

  function setButtonLabel(btn, label, icon) {
    if (!btn) return;
    var text = btn.querySelector(".btn__text");
    var ic = btn.querySelector(".btn__icon");
    if (text) text.textContent = label;
    if (ic) ic.textContent = icon;
  }

  function teamStats(team) {
    var possessions = team.losses + team.shots;
    return {
      possessions: possessions,
      losses: team.losses,
      shots: team.shots,
      goals: team.goals,
      efficiency: team.shots ? Math.round((team.goals / team.shots) * 100) : 0,
      shotsPerPossession: possessions ? team.shots / possessions : 0,
      lossesPerPossession: possessions ? team.losses / possessions : 0,
      lossRate: possessions ? Math.round((team.losses / possessions) * 100) : 0,
      score: team.goals,
      possessionMs: team.possessionMs || 0,
    };
  }

  function pct(value) {
    return value + "%";
  }

  function decimal(value) {
    return value.toFixed(2).replace(".", ",");
  }

  function pctRatio(value) {
    return Math.round(value * 100) + "%";
  }

  function render() {
    var posTeam = state.teams[state.possession];
    var hasTimer = state.mode !== "none";
    syncInitialPossessionLabels();
    els["ptb-possession-label"].textContent = "Possession : " + posTeam.name;
    els["ptb-possession-band"].style.setProperty("--ptb-possession-color", posTeam.color);
    els["ptb-timer-box"].hidden = !hasTimer;
    els["ptb-timer-main"].hidden = !hasTimer;
    els["ptb-reset-timer"].hidden = !hasTimer || !state.paused;
    var chronoGroup = document.querySelector(".ptb-control-group--chrono");
    if (chronoGroup) chronoGroup.hidden = !hasTimer;
    els["ptb-time"].textContent = hasTimer ? formatTime(displayedTimeMs()) : "—";
    els["ptb-timer-label"].textContent = !hasTimer
      ? "Sans chrono"
      : state.finished
        ? "Fin du match"
        : state.paused
          ? "En pause"
          : state.running
            ? state.mode === "down"
              ? "Temps restant"
              : "Temps écoulé"
            : "Prêt";
    setButtonLabel(
      els["ptb-timer-main"],
      state.paused ? "Reprendre" : state.running ? "Pause" : "Démarrer",
      state.running && !state.paused ? "⏸" : "▶"
    );
    els["ptb-finish-msg"].hidden = !state.finished;

    TEAM_IDS.forEach(function (id) {
      var team = state.teams[id];
      var panel = document.querySelector('.ptb-team-panel[data-team="' + id + '"]');
      if (panel) {
        panel.style.setProperty("--ptb-team-color", team.color);
        panel.classList.toggle("is-possession", state.possession === id);
        panel.hidden = state.possession !== id;
      }
      els["ptb-panel-name-" + id].textContent = team.name;
      els["ptb-score-" + id].textContent = String(team.goals);
    });

    renderStats();
  }

  function renderStats() {
    var a = teamStats(state.teams.a);
    var b = teamStats(state.teams.b);
    var rows = [
      { label: "Score", a: a.score, b: b.score, format: String, best: "high" },
      { label: "Possessions estimées", a: a.possessions, b: b.possessions, format: String, best: "high" },
    ];
    if (state.mode !== "none") {
      var totalPossessionMs = Math.max(1, a.possessionMs + b.possessionMs);
      rows.push({
        label: "Temps de possession",
        a: { ms: a.possessionMs, pct: Math.round((a.possessionMs / totalPossessionMs) * 100) },
        b: { ms: b.possessionMs, pct: Math.round((b.possessionMs / totalPossessionMs) * 100) },
        format: formatPossessionTime,
        best: "high",
        compareValue: function (value) {
          return value.ms;
        },
      });
    }
    rows = rows.concat([
      { label: "Pertes", a: a.losses, b: b.losses, format: String, best: "low" },
      { label: "Tirs", a: a.shots, b: b.shots, format: String, best: "high" },
      { label: "Buts", a: a.goals, b: b.goals, format: String, best: "high" },
      { label: "Efficacité au tir", a: a.efficiency, b: b.efficiency, format: pct, best: "high" },
      { label: "Tirs / possession", a: a.shotsPerPossession, b: b.shotsPerPossession, format: pctRatio, best: "high" },
      { label: "Pertes / possession", a: a.lossesPerPossession, b: b.lossesPerPossession, format: pctRatio, best: "low" },
    ]);

    var statsRoot = els["ptb-live-stats"];
    clearNode(statsRoot);
    var table = document.createElement("div");
    table.className = "ptb-stats-table";
    table.style.setProperty("--ptb-color-a", state.teams.a.color);
    table.style.setProperty("--ptb-color-b", state.teams.b.color);
    var head = document.createElement("div");
    head.className = "ptb-stats-head";
    head.appendChild(document.createElement("span"));
    var headA = document.createElement("strong");
    headA.textContent = state.teams.a.name;
    var headB = document.createElement("strong");
    headB.textContent = state.teams.b.name;
    head.appendChild(headA);
    head.appendChild(headB);
    table.appendChild(head);
    rows.forEach(function (row) {
      appendStatsRow(table, row);
    });
    statsRoot.appendChild(table);
    clearNode(els["ptb-compare"]);
  }

  function appendStatsRow(parent, row) {
    var aCompare = row.compareValue ? row.compareValue(row.a) : row.a;
    var bCompare = row.compareValue ? row.compareValue(row.b) : row.b;
    var best = bestTeam(aCompare, bCompare, row.best);
    var rowEl = document.createElement("div");
    rowEl.className = "ptb-stats-row";
    var label = document.createElement("span");
    label.textContent = row.label;
    var strongA = document.createElement("strong");
    if (best === "a") strongA.className = "is-best";
    appendStatValue(strongA, row.format, row.a);
    var strongB = document.createElement("strong");
    if (best === "b") strongB.className = "is-best";
    appendStatValue(strongB, row.format, row.b);
    rowEl.appendChild(label);
    rowEl.appendChild(strongA);
    rowEl.appendChild(strongB);
    parent.appendChild(rowEl);
  }

  function appendStatValue(strong, format, value) {
    if (format === formatPossessionTime) {
      strong.appendChild(formatPossessionTime(value));
    } else {
      strong.textContent = format(value);
    }
  }

  function formatPossessionTime(value) {
    var span = document.createElement("span");
    span.className = "ptb-stat-stack";
    var bold = document.createElement("b");
    bold.textContent = formatTime(value.ms);
    var small = document.createElement("small");
    small.textContent = value.pct + "%";
    span.appendChild(bold);
    span.appendChild(small);
    return span;
  }

  function bestTeam(aValue, bValue, mode) {
    if (aValue === bValue) return "";
    if (mode === "low") return aValue < bValue ? "a" : "b";
    return aValue > bValue ? "a" : "b";
  }

  function addAction(teamId, action) {
    if (state.finished) return;
    var team = state.teams[teamId];
    if (!team) return;
    var beforePossession = state.possession;
    if (action === "loss") team.losses++;
    if (action === "shot") team.shots++;
    if (action === "goal") {
      team.shots++;
      team.goals++;
    }
    state.history.push({
      team: teamId,
      action: action,
      atMs: state.elapsedMs,
      beforePossession: beforePossession,
      afterPossession: otherTeam(teamId),
    });
    state.possession = otherTeam(teamId);
    render();
  }

  function undoLast() {
    var last = state.history.pop();
    if (!last) return;
    var team = state.teams[last.team];
    if (last.action === "loss") team.losses = Math.max(0, team.losses - 1);
    if (last.action === "shot") team.shots = Math.max(0, team.shots - 1);
    if (last.action === "goal") {
      team.shots = Math.max(0, team.shots - 1);
      team.goals = Math.max(0, team.goals - 1);
    }
    state.possession = last.beforePossession || state.possession;
    render();
  }

  function otherTeam(id) {
    return id === "a" ? "b" : "a";
  }

  function startMatch() {
    readConfig();
    state.startedAtIso = state.startedAtIso || new Date().toISOString();
    state.finished = false;
    render();
    var config = $("ptb-config");
    if (config) config.open = false;
    els["ptb-match"].scrollIntoView({ behavior: "smooth", block: "start" });
    startTimer();
  }

  function startTimer() {
    if (state.finished) return;
    if (state.mode === "none") return;
    if (state.mode === "down" && state.durationMs <= 0) {
      alert("Réglez une durée supérieure à zéro.");
      return;
    }
    var wasPaused = state.paused;
    state.running = true;
    state.paused = false;
    state.lastTick = Date.now();
    lastWarnSec = -1;
    if (!wasPaused) beep("start");
    startTick();
    majWakeLock();
    render();
  }

  function pauseTimer() {
    if (!state.running) return;
    state.paused = true;
    state.running = false;
    stopTick();
    majWakeLock();
    render();
  }

  function resetTimer() {
    if ((state.elapsedMs > 0 || state.history.length) && !confirm("Réinitialiser le chronomètre ? Les statistiques restent conservées.")) {
      return;
    }
    stopTick();
    state.running = false;
    state.paused = false;
    state.elapsedMs = 0;
    state.remainingMs = state.durationMs;
    state.teams.a.possessionMs = 0;
    state.teams.b.possessionMs = 0;
    lastWarnSec = -1;
    majWakeLock();
    render();
  }

  function timerMain() {
    if (state.running) pauseTimer();
    else startTimer();
  }

  function startTick() {
    stopTick();
    timerId = setInterval(tick, 250);
  }

  function stopTick() {
    if (timerId) clearInterval(timerId);
    timerId = null;
  }

  function tick() {
    if (!state.running) return;
    var now = Date.now();
    var delta = now - state.lastTick;
    state.lastTick = now;
    state.elapsedMs += delta;
    state.teams[state.possession].possessionMs += delta;
    if (state.mode === "down") {
      state.remainingMs = Math.max(0, state.remainingMs - delta);
      var secLeft = Math.ceil(state.remainingMs / 1000);
      if (secLeft <= 3 && secLeft > 0 && secLeft !== lastWarnSec) {
        lastWarnSec = secLeft;
        beep("warn");
      }
      if (state.remainingMs <= 0) {
        finishMatch(true);
        return;
      }
    }
    render();
  }

  function finishMatch(fromTimer) {
    if (!fromTimer && !confirm("Terminer le match ?")) return;
    state.running = false;
    state.paused = false;
    state.finished = true;
    state.endedAtIso = new Date().toISOString();
    stopTick();
    majWakeLock();
    if (fromTimer) beep("final");
    render();
    $("ptb-stats").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function matchHasData() {
    if (state.history.length) return true;
    return TEAM_IDS.some(function (id) {
      var t = state.teams[id];
      return t.losses || t.shots || t.goals;
    });
  }

  function renderArchivedStats(snapshot, container) {
    if (!snapshot || !snapshot.teams) return;
    var table = document.createElement("div");
    table.className = "ptb-stats-table";
    table.style.setProperty("--ptb-color-a", snapshot.teams.a.color);
    table.style.setProperty("--ptb-color-b", snapshot.teams.b.color);
    var head = document.createElement("div");
    head.className = "ptb-stats-head";
    head.appendChild(document.createElement("span"));
    var headA = document.createElement("strong");
    headA.textContent = snapshot.teams.a.name;
    var headB = document.createElement("strong");
    headB.textContent = snapshot.teams.b.name;
    head.appendChild(headA);
    head.appendChild(headB);
    table.appendChild(head);
    var rows = [
      { label: "Buts", a: snapshot.teams.a.goals, b: snapshot.teams.b.goals },
      { label: "Tirs", a: snapshot.teams.a.shots, b: snapshot.teams.b.shots },
      { label: "Pertes", a: snapshot.teams.a.losses, b: snapshot.teams.b.losses },
      { label: "Possessions", a: snapshot.teams.a.possessions, b: snapshot.teams.b.possessions },
      { label: "Efficacité au tir", a: snapshot.teams.a.efficiency + "%", b: snapshot.teams.b.efficiency + "%" },
    ];
    if (snapshot.timer) {
      var meta = document.createElement("p");
      meta.className = "hint";
      meta.textContent =
        snapshot.timer.statusLabel +
        " · " +
        (snapshot.timer.displayLabel || snapshot.timer.elapsedLabel || "");
      container.appendChild(meta);
    }
    rows.forEach(function (row) {
      var rowEl = document.createElement("div");
      rowEl.className = "ptb-stats-row";
      var label = document.createElement("span");
      label.textContent = row.label;
      var strongA = document.createElement("strong");
      strongA.textContent = String(row.a);
      var strongB = document.createElement("strong");
      strongB.textContent = String(row.b);
      rowEl.appendChild(label);
      rowEl.appendChild(strongA);
      rowEl.appendChild(strongB);
      table.appendChild(rowEl);
    });
    container.appendChild(table);
  }

  var resultsHistory = null;

  function resetMatch() {
    function doClear() {
      state = createInitialState();
      readConfig();
      stopTick();
      lastWarnSec = -1;
      majWakeLock();
      render();
    }
    if (resultsHistory) {
      resultsHistory.archiveAndClear({
        hasData: matchHasData,
        getSnapshot: buildExportPayload,
        clearFn: doClear,
        confirmMessage:
          "Réinitialiser le match ? Une copie des statistiques sera conservée dans l’historique.",
      });
      return;
    }
    if (!confirm("Réinitialiser tout le match ? Les données non enregistrées seront perdues.")) return;
    doClear();
  }

  function beep(kind) {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      var duration = kind === "final" ? 0.6 : kind === "start" ? 0.3 : 0.2;
      osc.frequency.value = kind === "final" ? 920 : kind === "start" ? 520 : 700;
      gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration + 0.03);
    } catch (e) {
      /* audio indisponible */
    }
  }

  function activerWakeLock() {
    if (!("wakeLock" in navigator) || wakeLockSentinel) return;
    navigator.wakeLock
      .request("screen")
      .then(function (sentinel) {
        wakeLockSentinel = sentinel;
        sentinel.addEventListener("release", function () {
          if (wakeLockSentinel === sentinel) wakeLockSentinel = null;
        });
      })
      .catch(function () {});
  }

  function libererWakeLock() {
    if (!wakeLockSentinel) return;
    var sentinel = wakeLockSentinel;
    wakeLockSentinel = null;
    try {
      sentinel.release();
    } catch (e) {
      /* ignore */
    }
  }

  function majWakeLock() {
    if (state.running) activerWakeLock();
    else libererWakeLock();
  }

  function bindEvents() {
    els["ptb-mode"].addEventListener("change", function () {
      els["ptb-duration-field"].hidden = els["ptb-mode"].value !== "down";
      readConfig();
      render();
    });
    ["ptb-name-a", "ptb-name-b", "ptb-color-a", "ptb-color-b", "ptb-min", "ptb-sec", "ptb-initial-possession"].forEach(function (id) {
      els[id].addEventListener("input", function () {
        readConfig();
        render();
      });
      els[id].addEventListener("change", function () {
        readConfig();
        render();
      });
    });
    els["ptb-timer-main"].addEventListener("click", timerMain);
    els["ptb-reset-timer"].addEventListener("click", resetTimer);
    els["ptb-change-possession"].addEventListener("click", function () {
      state.possession = otherTeam(state.possession);
      render();
    });
    els["ptb-undo"].addEventListener("click", undoLast);
    els["ptb-finish"].addEventListener("click", function () {
      finishMatch(false);
    });
    els["ptb-reset-match"].addEventListener("click", resetMatch);
    document.querySelectorAll(".ptb-action").forEach(function (btn) {
      btn.addEventListener("click", function () {
        addAction(btn.getAttribute("data-team"), btn.getAttribute("data-action"));
      });
    });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") majWakeLock();
    });
  }

  bindEls();
  bindEvents();
  if (typeof ToolResultsHistory !== "undefined") {
    resultsHistory = ToolResultsHistory.mount({
      toolId: TOOL_ID,
      buildTitle: function (snap) {
        return snap.teams.a.name + " — " + snap.teams.b.name;
      },
      buildSummary: function (snap) {
        return snap.teams.a.goals + " - " + snap.teams.b.goals;
      },
      getSharePayload: function (entry) {
        return entry.data;
      },
      getShareParticipantLabel: function (entry) {
        var d = entry.data;
        if (d && d.teams) {
          return d.teams.a.name + " — " + d.teams.b.name;
        }
        return entry.title;
      },
      renderView: function (entry, container) {
        renderArchivedStats(entry.data, container);
      },
    });
  }
  els["ptb-duration-field"].hidden = true;
  chargerNoms();
  readConfig();
  render();

  if (typeof EleveQrShare !== "undefined") {
    EleveQrShare.mountButton(document.getElementById("eleve-share-bar"), {
      toolId: TOOL_ID,
      getParticipantLabel: function () {
        readConfig();
        return state.teams.a.name + " — " + state.teams.b.name;
      },
      getPayload: buildExportPayload,
      validateBeforeShare: function () {
        if (!state.history.length && !state.finished) {
          return "Enregistrez au moins une action ou terminez le match avant de partager.";
        }
        return null;
      },
    });
  }
})();
