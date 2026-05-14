/**
 * Championnat à poule unique — stockage local, poule aller simple.
 *
 * Calendrier : matchs ordonnés par « journées » (méthode du cercle) : chaque équipe
 * joue au plus une fois par journée, répartition équilibrée entre les tours.
 *
 * Règles : 3 pts (V), 1 pt (N), 0 (D). Tri : points → diff → pour → nom (fr).
 */
(function () {
  "use strict";

  var STORAGE_KEY = "outils_eps_championnat_poule_v1";
  var SAVE_DELAY_MS = 400;

  /**
   * @type {{
   *   teams: Array<{id:string,name:string}>,
   *   matches: Array<{id:string,homeId:string,awayId:string,homeScore:number|null,awayScore:number|null,journee:number}>
   * }}
   */
  var state = { teams: [], matches: [] };

  var newTeamEl = document.getElementById("new-team");
  var btnAdd = document.getElementById("btn-add-team");
  var teamListEl = document.getElementById("team-list");
  var matchListEl = document.getElementById("match-list");
  var standingsBody = document.getElementById("standings-body");
  var msgEl = document.getElementById("champ-msg");
  var btnResetScores = document.getElementById("btn-reset-scores");
  var btnExport = document.getElementById("btn-export-csv");
  var btnDeleteAll = document.getElementById("btn-delete-all");

  var saveTimer = null;

  function genererId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return "c_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
  }

  function montrerMsg(text) {
    if (!msgEl) return;
    msgEl.hidden = !text;
    msgEl.textContent = text || "";
  }

  function charger() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { teams: [], matches: [] };
      var data = JSON.parse(raw);
      if (!data || !Array.isArray(data.teams)) return { teams: [], matches: [] };
      return {
        teams: data.teams,
        matches: Array.isArray(data.matches) ? data.matches : [],
      };
    } catch (e) {
      return { teams: [], matches: [] };
    }
  }

  function sauverImmediate() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      montrerMsg("");
    } catch (e) {
      montrerMsg("Impossible d’enregistrer (stockage plein ?). Libérez de l’espace.");
    }
  }

  function sauverDebounced() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveTimer = null;
      sauverImmediate();
    }, SAVE_DELAY_MS);
  }

  function nomEquipe(id) {
    var t = state.teams.find(function (x) {
      return x.id === id;
    });
    return t ? t.name : "?";
  }

  var BYE = "__BYE__";

  /**
   * Récupère les scores pour une paire (home/away comme dans le nouveau calendrier),
   * en consultant l’ancienne liste (même paire, ordre domicile/extérieur indifférent).
   */
  function trouverScoresPourPaires(homeId, awayId, anciennes) {
    for (var i = 0; i < anciennes.length; i++) {
      var m = anciennes[i];
      if (m.homeId === homeId && m.awayId === awayId) {
        return { homeScore: m.homeScore, awayScore: m.awayScore };
      }
      if (m.homeId === awayId && m.awayId === homeId) {
        return { homeScore: m.awayScore, awayScore: m.homeScore };
      }
    }
    return { homeScore: null, awayScore: null };
  }

  /**
   * Génère les journées (aller simple) : chaque équipe rencontre chaque autre une fois,
   * au plus un match par équipe et par journée — méthode du cercle (Berger).
   * @returns {Array<Array<{homeId:string,awayId:string}>>}
   */
  function genererJourneesPoule(ids) {
    if (ids.length < 2) return [];
    var arr = ids.slice();
    var n = arr.length;
    var odd = n % 2 === 1;
    if (odd) arr.push(BYE);
    var N = arr.length;
    var nbJournees = N - 1;
    var journees = [];
    var copie = arr.slice();
    for (var r = 0; r < nbJournees; r++) {
      var round = [];
      for (var i = 0; i < N / 2; i++) {
        var a = copie[i];
        var b = copie[N - 1 - i];
        if (a !== BYE && b !== BYE) {
          round.push({ homeId: a, awayId: b });
        }
      }
      journees.push(round);
      var fixed = copie[0];
      var last = copie[N - 1];
      for (var j = N - 1; j >= 2; j--) {
        copie[j] = copie[j - 1];
      }
      copie[1] = last;
      copie[0] = fixed;
    }
    return journees;
  }

  /** Reconstruit tous les matchs (ordre par journée) en conservant les scores des paires déjà jouées. */
  function reconstruireMatchsDepuisEquipes() {
    var ids = state.teams.map(function (t) {
      return t.id;
    });
    var anciennes = state.matches.slice();
    if (ids.length < 2) {
      state.matches = [];
      return;
    }
    var journees = genererJourneesPoule(ids);
    var out = [];
    journees.forEach(function (round, jIdx) {
      round.forEach(function (pair) {
        var sc = trouverScoresPourPaires(pair.homeId, pair.awayId, anciennes);
        out.push({
          id: genererId(),
          homeId: pair.homeId,
          awayId: pair.awayId,
          homeScore: sc.homeScore,
          awayScore: sc.awayScore,
          journee: jIdx + 1,
        });
      });
    });
    state.matches = out;
  }

  function calendrierCoherent() {
    var n = state.teams.length;
    var attendu = n >= 2 ? (n * (n - 1)) / 2 : 0;
    if (state.matches.length !== attendu) return false;
    for (var i = 0; i < state.matches.length; i++) {
      if (typeof state.matches[i].journee !== "number" || state.matches[i].journee < 1) {
        return false;
      }
    }
    return true;
  }

  function ajouterEquipe(nom) {
    var n = (nom || "").trim();
    if (!n) {
      montrerMsg("Indiquez un nom d’équipe.");
      return;
    }
    var id = genererId();
    state.teams.push({ id: id, name: n });
    reconstruireMatchsDepuisEquipes();
    sauverImmediate();
    render();
  }

  function supprimerEquipe(id) {
    if (!confirm("Supprimer cette équipe et tous ses matchs ?")) return;
    state.teams = state.teams.filter(function (t) {
      return t.id !== id;
    });
    reconstruireMatchsDepuisEquipes();
    sauverImmediate();
    render();
  }

  function renommerEquipe(id, nouveauNom) {
    var n = (nouveauNom || "").trim();
    if (!n) return;
    var t = state.teams.find(function (x) {
      return x.id === id;
    });
    if (t) t.name = n;
    sauverImmediate();
    render();
  }

  function resetScores() {
    if (!confirm("Réinitialiser tous les scores des matchs ?")) return;
    state.matches.forEach(function (m) {
      m.homeScore = null;
      m.awayScore = null;
    });
    sauverImmediate();
    render();
  }

  function supprimerTout() {
    if (
      !confirm(
        "Supprimer tout le championnat (équipes, matchs et résultats) ? Cette action est définitive."
      )
    ) {
      return;
    }
    state = { teams: [], matches: [] };
    sauverImmediate();
    render();
  }

  function parseScoreInput(v) {
    if (v === "" || v === null || typeof v === "undefined") return null;
    var n = parseInt(String(v), 10);
    if (isNaN(n) || n < 0) return null;
    return n;
  }

  function majScore(matchId, cote, valeurBrute) {
    var m = state.matches.find(function (x) {
      return x.id === matchId;
    });
    if (!m) return;
    var val = parseScoreInput(valeurBrute);
    if (cote === "home") m.homeScore = val;
    else m.awayScore = val;
    sauverDebounced();
    renderStandingsOnly();
  }

  function computeStandings() {
    var map = {};
    state.teams.forEach(function (t) {
      map[t.id] = {
        teamId: t.id,
        name: t.name,
        mj: 0,
        v: 0,
        n: 0,
        d: 0,
        pour: 0,
        contre: 0,
        pts: 0,
      };
    });
    state.matches.forEach(function (m) {
      var hs = m.homeScore;
      var as = m.awayScore;
      if (hs === null || as === null || typeof hs === "undefined" || typeof as === "undefined") {
        return;
      }
      var H = map[m.homeId];
      var A = map[m.awayId];
      if (!H || !A) return;
      H.mj++;
      A.mj++;
      H.pour += hs;
      H.contre += as;
      A.pour += as;
      A.contre += hs;
      if (hs > as) {
        H.v++;
        H.pts += 3;
        A.d++;
      } else if (hs < as) {
        A.v++;
        A.pts += 3;
        H.d++;
      } else {
        H.n++;
        A.n++;
        H.pts++;
        A.pts++;
      }
    });
    var arr = state.teams.map(function (t) {
      var r = map[t.id];
      r.diff = r.pour - r.contre;
      return r;
    });
    arr.sort(function (a, b) {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.diff !== a.diff) return b.diff - a.diff;
      if (b.pour !== a.pour) return b.pour - a.pour;
      return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
    });
    for (var i = 0; i < arr.length; i++) {
      arr[i].rang = i + 1;
    }
    return arr;
  }

  function renderTeams() {
    teamListEl.innerHTML = "";
    if (state.teams.length === 0) {
      var li0 = document.createElement("li");
      li0.className = "champ-team-empty";
      li0.textContent = "Aucune équipe pour le moment.";
      teamListEl.appendChild(li0);
      return;
    }
    state.teams.forEach(function (t) {
      var li = document.createElement("li");
      li.className = "champ-team-row";

      var nameSpan = document.createElement("span");
      nameSpan.className = "champ-team-name";
      nameSpan.textContent = t.name;

      var actions = document.createElement("div");
      actions.className = "champ-team-actions";

      var bEdit = document.createElement("button");
      bEdit.type = "button";
      bEdit.className = "btn btn--ghost btn--icon-only btn--small";
      bEdit.setAttribute("aria-label", "Renommer " + t.name);
      bEdit.innerHTML = '<span class="btn-icon-emoji" aria-hidden="true">✏️</span>';
      bEdit.addEventListener("click", function () {
        var nv = window.prompt("Nouveau nom :", t.name);
        if (nv !== null) renommerEquipe(t.id, nv);
      });

      var bDel = document.createElement("button");
      bDel.type = "button";
      bDel.className = "btn btn--danger btn--icon-only btn--small";
      bDel.setAttribute("aria-label", "Supprimer " + t.name);
      bDel.innerHTML = '<span class="btn-icon-emoji" aria-hidden="true">🗑️</span>';
      bDel.addEventListener("click", function () {
        supprimerEquipe(t.id);
      });

      actions.appendChild(bEdit);
      actions.appendChild(bDel);
      li.appendChild(nameSpan);
      li.appendChild(actions);
      teamListEl.appendChild(li);
    });
  }

  function renderMatches() {
    matchListEl.innerHTML = "";
    if (state.teams.length < 2) {
      var p = document.createElement("p");
      p.className = "hint";
      p.textContent = "Ajoutez au moins deux équipes pour générer les matchs.";
      matchListEl.appendChild(p);
      return;
    }
    if (state.matches.length === 0) {
      var p2 = document.createElement("p");
      p2.className = "hint";
      p2.textContent = "Aucun match (état inattendu).";
      matchListEl.appendChild(p2);
      return;
    }

    var parJournee = {};
    var maxJ = 0;
    state.matches.forEach(function (m) {
      var j = m.journee || 1;
      if (!parJournee[j]) parJournee[j] = [];
      parJournee[j].push(m);
      if (j > maxJ) maxJ = j;
    });

    for (var jr = 1; jr <= maxJ; jr++) {
      var liste = parJournee[jr];
      if (!liste || !liste.length) continue;

      var bloc = document.createElement("section");
      bloc.className = "champ-journee";
      bloc.setAttribute("aria-labelledby", "journee-lbl-" + jr);

      var h3 = document.createElement("h3");
      h3.className = "champ-journee__title";
      h3.id = "journee-lbl-" + jr;
      h3.textContent = "Journée " + jr + " · " + liste.length + " match" + (liste.length > 1 ? "s" : "");

      bloc.appendChild(h3);

      liste.forEach(function (m) {
        var row = document.createElement("div");
        row.className = "match-row";
        row.setAttribute("data-match-id", m.id);

        var nHome = document.createElement("span");
        nHome.className = "match-row__name";
        nHome.textContent = nomEquipe(m.homeId);

        var inpH = document.createElement("input");
        inpH.type = "number";
        inpH.min = "0";
        inpH.step = "1";
        inpH.inputMode = "numeric";
        inpH.className = "match-row__score";
        inpH.setAttribute("aria-label", "Score " + nomEquipe(m.homeId));
        inpH.value =
          m.homeScore !== null && typeof m.homeScore !== "undefined" ? String(m.homeScore) : "";
        inpH.dataset.matchId = m.id;
        inpH.dataset.side = "home";

        var sep = document.createElement("span");
        sep.className = "match-row__sep";
        sep.setAttribute("aria-hidden", "true");
        sep.textContent = "—";

        var inpA = document.createElement("input");
        inpA.type = "number";
        inpA.min = "0";
        inpA.step = "1";
        inpA.inputMode = "numeric";
        inpA.className = "match-row__score";
        inpA.setAttribute("aria-label", "Score " + nomEquipe(m.awayId));
        inpA.value =
          m.awayScore !== null && typeof m.awayScore !== "undefined" ? String(m.awayScore) : "";
        inpA.dataset.matchId = m.id;
        inpA.dataset.side = "away";

        var nAway = document.createElement("span");
        nAway.className = "match-row__name match-row__name--away";
        nAway.textContent = nomEquipe(m.awayId);

        row.appendChild(nHome);
        row.appendChild(inpH);
        row.appendChild(sep);
        row.appendChild(inpA);
        row.appendChild(nAway);
        bloc.appendChild(row);
      });

      matchListEl.appendChild(bloc);
    }
  }

  function renderStandings() {
    var rows = computeStandings();
    standingsBody.innerHTML = "";
    if (rows.length === 0) {
      var tr0 = document.createElement("tr");
      var td0 = document.createElement("td");
      td0.colSpan = 10;
      td0.className = "champ-table-empty";
      td0.textContent = "Ajoutez des équipes pour voir le classement.";
      tr0.appendChild(td0);
      standingsBody.appendChild(tr0);
      return;
    }
    rows.forEach(function (r) {
      var tr = document.createElement("tr");
      function td(txt) {
        var c = document.createElement("td");
        c.textContent = String(txt);
        return c;
      }
      tr.appendChild(td(r.rang));
      tr.appendChild(td(r.name));
      tr.appendChild(td(r.mj));
      tr.appendChild(td(r.v));
      tr.appendChild(td(r.n));
      tr.appendChild(td(r.d));
      tr.appendChild(td(r.pour));
      tr.appendChild(td(r.contre));
      tr.appendChild(td((r.diff >= 0 ? "+" : "") + r.diff));
      var tdPts = document.createElement("td");
      var strong = document.createElement("strong");
      strong.textContent = String(r.pts);
      tdPts.appendChild(strong);
      tr.appendChild(tdPts);
      standingsBody.appendChild(tr);
    });
  }

  function renderStandingsOnly() {
    renderStandings();
  }

  function render() {
    renderTeams();
    renderMatches();
    renderStandings();
  }

  function exportCsv() {
    var rows = computeStandings();
    var headers = [
      "Rang",
      "Équipe",
      "Matchs joués",
      "Victoires",
      "Matchs nuls",
      "Défaites",
      "Points marqués",
      "Points encaissés",
      "Différence",
      "Points au classement",
    ];
    var lines = [headers.join(";")];
    rows.forEach(function (r) {
      lines.push(
        [
          r.rang,
          csvCell(r.name),
          r.mj,
          r.v,
          r.n,
          r.d,
          r.pour,
          r.contre,
          r.diff,
          r.pts,
        ].join(";")
      );
    });
    var blob = new Blob(["\ufeff" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "classement-poule.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function csvCell(s) {
    var t = String(s).replace(/"/g, '""');
    if (/[;\r\n"]/.test(t)) return '"' + t + '"';
    return t;
  }

  matchListEl.addEventListener("input", function (e) {
    var el = e.target;
    if (!el || !el.classList || !el.classList.contains("match-row__score")) return;
    var mid = el.getAttribute("data-match-id");
    var side = el.getAttribute("data-side");
    if (!mid || !side) return;
    majScore(mid, side, el.value);
  });

  btnAdd.addEventListener("click", function () {
    ajouterEquipe(newTeamEl.value);
    newTeamEl.value = "";
    newTeamEl.focus();
  });

  newTeamEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      ajouterEquipe(newTeamEl.value);
      newTeamEl.value = "";
    }
  });

  btnResetScores.addEventListener("click", resetScores);
  btnExport.addEventListener("click", exportCsv);
  btnDeleteAll.addEventListener("click", supprimerTout);

  state = charger();
  if (!calendrierCoherent()) {
    reconstruireMatchsDepuisEquipes();
    sauverImmediate();
  }
  render();
})();
