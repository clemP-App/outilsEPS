/**
 * Synthèse EPS — agrégation des outils « séance » (championnat, tournoi, défi ATP, etc.).
 */
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.SyntheseEpsActivites = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var Core = typeof SyntheseEpsCore !== "undefined" ? SyntheseEpsCore : null;
  var Identity = typeof SyntheseIdentity !== "undefined" ? SyntheseIdentity : null;
  var Facts = typeof SyntheseFacts !== "undefined" ? SyntheseFacts : null;
  var SC =
    typeof SessionsCore !== "undefined"
      ? SessionsCore
      : { toolLabel: function (id) { return id; }, isSessionTool: function () { return false; } };
  var ChampStandings =
    typeof ChampionnatStandings !== "undefined" ? ChampionnatStandings : null;

  function normalizeName(v) {
    if (Identity) return Identity.normalizeName(v);
    return Core ? Core.normalizeName(v) : String(v || "").toLowerCase().trim();
  }

  function labelEleve(e) {
    if (Identity) return Identity.labelEleve(e);
    return Core ? Core.labelEleve(e) : "";
  }

  function identityCtx(data, eleve) {
    return {
      classeId: eleve && eleve.classeId,
      elevesClasse: eleve && eleve.classeId ? elevesDeClasse(data, eleve.classeId) : [],
      aliases: (data && data.identiteAliases) || [],
    };
  }

  function nameMatchesEleve(name, eleve, data) {
    if (!name || !eleve) return false;
    if (Identity) return Identity.nameMatchesEleve(name, eleve, identityCtx(data, eleve));
    var full = normalizeName(labelEleve(eleve));
    return normalizeName(name) === full;
  }

  function matchConfidence(name, eleve, data) {
    if (!Identity) return nameMatchesEleve(name, eleve, data) ? "medium" : null;
    var r = Identity.labelMatchesEleve(name, eleve, identityCtx(data, eleve));
    return r.match ? r.confidence || "medium" : null;
  }

  function inPeriod(iso, period) {
    if (!period || (!period.from && !period.to)) return true;
    if (!iso) return true;
    var d = new Date(iso);
    if (isNaN(d.getTime())) return true;
    if (period.from && d < new Date(period.from)) return false;
    if (period.to) {
      var end = new Date(period.to);
      end.setHours(23, 59, 59, 999);
      if (d > end) return false;
    }
    return true;
  }

  function toolLabel(toolId) {
    return SC.toolLabel ? SC.toolLabel(toolId) : toolId;
  }

  function elevesDeClasse(data, classeId) {
    if (Core && typeof Core.elevesDeClasse === "function") {
      return Core.elevesDeClasse(data, classeId);
    }
    if (!classeId || !Array.isArray(data.eleves)) return [];
    return data.eleves.filter(function (e) {
      return e && e.classeId === classeId;
    });
  }

  function getClasse(data, classeId) {
    if (!data || !classeId || !Array.isArray(data.classes)) return null;
    for (var i = 0; i < data.classes.length; i++) {
      if (data.classes[i] && data.classes[i].id === classeId) return data.classes[i];
    }
    return null;
  }

  function sessionLinkedToClasse(session, data, classeId) {
    if (!session || !classeId) return false;
    if (session.classeId === classeId) return true;
    if (session.classeId) return false;
    var classe = getClasse(data, classeId);
    if (
      classe &&
      session.classeNomSnapshot &&
      Core &&
      Core.sameClasseLabel &&
      Core.sameClasseLabel(classe.nom, session.classeNomSnapshot)
    ) {
      return true;
    }
    if (!SC.isSessionTool || !SC.isSessionTool(session.toolId)) return false;
    var eleves = elevesDeClasse(data, classeId);
    for (var i = 0; i < eleves.length; i++) {
      if (extractActivitePourSession(session, data, eleves[i])) return true;
    }
    return false;
  }

  function sessionsPourClasse(data, classeId, period) {
    return (data.sessions || []).filter(function (s) {
      if (!s || s.archived) return false;
      if (!inPeriod(s.lastOpenedAt || s.updatedAt || s.createdAt, period)) return false;
      return sessionLinkedToClasse(s, data, classeId);
    });
  }

  function championnatPourSession(data, sessionId) {
    return (data.championnats || []).filter(function (c) {
      return c && c.sessionId === sessionId;
    })[0];
  }

  function tournoiPourSession(data, sessionId, kind) {
    return (data.tournoisElimination || []).filter(function (t) {
      if (!t || t.sessionId !== sessionId) return false;
      if (kind && t.kind !== kind) return false;
      return true;
    })[0];
  }

  function parametrePourSession(data, sessionId, toolId) {
    var list = data.parametres || [];
    var prefix =
      toolId === "composition-equipes"
        ? "composition-equipes__"
        : toolId === "defi-atp"
          ? "defi-atp__"
          : toolId === "course-orientation"
            ? "course-orientation__"
            : "";
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (!p) continue;
      if (p.sessionId === sessionId && (!toolId || p.toolId === toolId)) return p;
      if (prefix && p.id === prefix + sessionId) return p;
    }
    return null;
  }

  function formatDuree(ms) {
    if (ms == null || isNaN(ms)) return "";
    var sec = Math.round(ms / 1000);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + " min " + String(s).padStart(2, "0") + " s";
  }

  function badgeCountDefi(p) {
    return Facts ? Facts.badgeCountDefi(p) : 0;
  }

  function finishFact(base) {
    var fact = Object.assign({ kind: "activite_seance" }, base);
    if (!fact.headline) {
      var parts = [fact.resume];
      if (fact.details && fact.details.length) parts.push(fact.details.join(" · "));
      fact.headline = parts.filter(Boolean).join(" · ");
    }
    if (!fact.subject) {
      fact.subject = { kind: "eleve", label: fact.playerName || "" };
    }
    if (!fact.confidence) fact.confidence = "medium";
    return Facts ? Facts.wrapActiviteFact(fact) : fact;
  }

  function extractChampionnatEleve(champ, session, eleve, data) {
    if (!champ || !eleve) return null;
    var teams = champ.teams || [];
    var team = teams.filter(function (t) {
      return t && nameMatchesEleve(t.name, eleve, data);
    })[0];
    if (!team) return null;
    var standings = ChampStandings
      ? ChampStandings.computeStandingsFromData(teams, champ.matches || [])
      : [];
    var row = standings.filter(function (r) {
      return r.teamId === team.id;
    })[0];
    var rang = row ? row.rang : null;
    var total = teams.length;
    var details = [];
    if (row) {
      details.push(row.pts + " pts · " + row.mj + " match(s) · " + row.v + "V " + row.n + "N " + row.d + "D");
      details.push(rang + "e sur " + total + " équipe(s)");
    }
    var headline = row
      ? rang + "e/" + total + " · " + row.pts + " pts · " + row.v + "V " + row.n + "N " + row.d + "D"
      : "Participant · " + (team.name || "");
    return finishFact({
      toolId: session.toolId,
      toolLabel: toolLabel(session.toolId),
      sessionId: session.id,
      sessionNom: session.nomSession || champ.nom || "",
      date: session.lastOpenedAt || session.updatedAt || champ.updatedAt,
      titre: champ.nom || session.nomSession,
      resume: row ? rang + "e · " + row.pts + " pts" : "Participant",
      headline: headline,
      details: details,
      playerName: team.name,
      confidence: matchConfidence(team.name, eleve, data),
      metrics: row
        ? { rang: rang, total: total, points: row.pts, victoires: row.v, nuls: row.n, defaites: row.d, matchs: row.mj }
        : {},
      subject: { kind: "eleve", label: team.name },
    });
  }

  function nomsTournoi(payload) {
    var set = {};
    var p = payload || {};
    if (Array.isArray(p.participants)) {
      p.participants.forEach(function (n) {
        var nom = String(n || "").trim();
        if (nom) set[nom] = true;
      });
    }
    String(p.participantsText || "")
      .split(/\n/)
      .forEach(function (line) {
        var n = line.trim();
        if (n) set[n] = true;
      });
    Object.keys(p.levels || {}).forEach(function (n) {
      if (n) set[n] = true;
    });
    Object.keys(p.placements || {}).forEach(function (n) {
      if (n) set[n] = true;
    });
    (p.rounds || []).forEach(function (round) {
      (round || []).forEach(function (m) {
        (m.players || []).forEach(function (pl) {
          if (pl) set[pl] = true;
        });
        if (m.winner) set[m.winner] = true;
      });
    });
    return Object.keys(set);
  }

  function extractTournoiEleve(rec, session, eleve, data) {
    if (!rec || !eleve) return null;
    var payload = rec.payload || {};
    var matchedName = null;
    nomsTournoi(payload).forEach(function (n) {
      if (nameMatchesEleve(n, eleve, data)) matchedName = n;
    });
    if (!matchedName) return null;
    var place = payload.placements && payload.placements[matchedName] != null ? payload.placements[matchedName] : null;
    if (place == null) {
      Object.keys(payload.placements || {}).forEach(function (n) {
        if (nameMatchesEleve(n, eleve, data)) place = payload.placements[n];
      });
    }
    var details = [];
    if (place != null) details.push(place + "e place");
    if (payload.format === "classement") details.push("Format classement");
    else details.push("Format élimination directe");
    var headline = place != null ? place + "e place" : "Participant au tournoi";
    return finishFact({
      toolId: session.toolId,
      toolLabel: toolLabel(session.toolId),
      sessionId: session.id,
      sessionNom: session.nomSession || rec.nom || "",
      date: session.lastOpenedAt || rec.updatedAt,
      titre: rec.nom || session.nomSession,
      resume: place != null ? place + "e place" : "Participant",
      headline: headline,
      details: details,
      playerName: matchedName,
      confidence: matchConfidence(matchedName, eleve, data),
      metrics: place != null ? { place: place } : {},
      subject: { kind: "eleve", label: matchedName },
    });
  }

  function extractDefiAtpEleve(param, session, eleve, data) {
    if (!param || !eleve) return null;
    var players = param.players || [];
    var pl = null;
    var matchedName = "";
    players.forEach(function (p) {
      if (p && nameMatchesEleve(p.name, eleve, data)) {
        pl = p;
        matchedName = p.name;
      }
    });
    if (!pl) return null;
    var ladder = param.ladder || [];
    var rang = rankDefiAtpPlayer(param, pl);
    var total = players.length;
    var badges = badgeCountDefi(pl);
    var wins = pl.wins || 0;
    var losses = pl.losses || 0;
    var pts = pl.points != null ? pl.points : null;
    var headlineParts = [];
    if (rang > 0) headlineParts.push(rang + "e/" + total);
    if (pts != null) headlineParts.push(pts + " pts");
    headlineParts.push(wins + "V-" + losses + "D");
    if (badges > 0) headlineParts.push(badges + " badge(s)");
    var details = [];
    if (pts != null) details.push(pts + " pts");
    details.push(wins + "V / " + losses + "D");
    if (rang > 0) details.push(rang + "e du classement sur " + total + " joueur(s)");
    if (badges > 0) details.push(badges + " badge(s) débloqué(s)");
    if (pl.currentStreak > 0) details.push("Série en cours : " + pl.currentStreak + " victoire(s)");
    return finishFact({
      toolId: session.toolId,
      toolLabel: toolLabel(session.toolId),
      sessionId: session.id,
      sessionNom: session.nomSession || "",
      date: session.lastOpenedAt || param.updatedAt,
      titre: session.nomSession,
      resume: rang > 0 ? rang + "e · " + (pts != null ? pts + " pts" : wins + "V-" + losses + "D") : "Inscrit",
      headline: headlineParts.join(" · "),
      details: details,
      playerName: matchedName,
      confidence: matchConfidence(matchedName, eleve, data),
      metrics: {
        rang: rang > 0 ? rang : null,
        total: total,
        points: pts,
        victoires: wins,
        defaites: losses,
        badges: badges,
        serie: pl.currentStreak || 0,
      },
      subject: { kind: "eleve", label: matchedName },
    });
  }

  function rankDefiAtpPlayer(param, player) {
    if (!param || !player) return 0;
    var ladder = Array.isArray(param.ladder) ? param.ladder : [];
    var ladderRank = ladder.indexOf(player.id) + 1;
    if (ladderRank <= 0) return 0;
    var formula = param.settings && param.settings.formula;
    if (formula === "swap-only") return ladderRank;
    var players = Array.isArray(param.players) ? param.players : [];
    var byId = {};
    players.forEach(function (p) {
      if (p && p.id) byId[p.id] = p;
    });
    var points = Number(player.points || 0);
    for (var i = 0; i < ladder.length; i++) {
      var other = byId[ladder[i]];
      if (other && Number(other.points || 0) === points) return i + 1;
    }
    return ladderRank;
  }

  function extractCompositionEleve(param, session, eleve, data) {
    if (!param || !eleve) return null;
    var players = param.players || [];
    var pl = null;
    var matchedName = "";
    players.forEach(function (p) {
      if (p && nameMatchesEleve(p.name, eleve, data)) {
        pl = p;
        matchedName = p.name;
      }
    });
    if (!pl) return null;
    var assign = param.assignments || {};
    var teamIdx = assign[pl.id];
    var teamNum = teamIdx != null ? teamIdx + 1 : null;
    var details = [];
    if (pl.level != null && pl.level !== "") details.push("Niveau " + pl.level);
    if (teamNum != null) details.push("Équipe n°" + teamNum + " sur " + (param.nbEquipes || "?"));
    var headline =
      teamNum != null
        ? "Équipe " + teamNum + "/" + (param.nbEquipes || "?") + (pl.level != null ? " · niveau " + pl.level : "")
        : "Listé · niveau " + (pl.level != null ? pl.level : "—");
    return finishFact({
      toolId: session.toolId,
      toolLabel: toolLabel(session.toolId),
      sessionId: session.id,
      sessionNom: session.nomSession || "",
      date: session.lastOpenedAt || param.updatedAt,
      titre: session.nomSession,
      resume: teamNum != null ? "Équipe " + teamNum : "Listé",
      headline: headline,
      details: details,
      playerName: matchedName,
      confidence: matchConfidence(matchedName, eleve, data),
      metrics: { equipe: teamNum, nbEquipes: param.nbEquipes, niveau: pl.level },
      subject: { kind: "eleve", label: matchedName },
    });
  }

  function extractPyramideEleve(rec, session, eleve, data) {
    if (!rec || !eleve) return null;
    var players = rec.players || [];
    var pl = null;
    var matchedName = "";
    players.forEach(function (p) {
      if (p && nameMatchesEleve(p.name, eleve, data)) {
        pl = p;
        matchedName = p.name;
      }
    });
    if (!pl) return null;
    var sorted = players.slice().sort(function (a, b) {
      return (b.wins || 0) - (a.wins || 0);
    });
    var rang = 1;
    for (var i = 0; i < sorted.length; i++) {
      if (sorted[i].id === pl.id) {
        rang = i + 1;
        break;
      }
    }
    var wins = pl.wins || 0;
    var headline = wins + " vict. · " + rang + "e/" + players.length;
    return finishFact({
      toolId: session.toolId,
      toolLabel: toolLabel(session.toolId),
      sessionId: session.id,
      sessionNom: session.nomSession || rec.nom || "",
      date: session.lastOpenedAt || rec.updatedAt,
      titre: rec.nom || session.nomSession,
      resume: wins + " vict. · " + rang + "e",
      headline: headline,
      details: [wins + " victoire(s)", rang + "e sur " + players.length + " joueur(s)"],
      playerName: matchedName,
      confidence: matchConfidence(matchedName, eleve, data),
      metrics: { victoires: wins, rang: rang, total: players.length },
      subject: { kind: "eleve", label: matchedName },
    });
  }

  function extractOrientationEleve(param, session, eleve, data) {
    if (!param || !eleve) return null;
    var coureurs = param.coureurs || [];
    var c = null;
    var matchedName = "";
    coureurs.forEach(function (x) {
      if (x && nameMatchesEleve(x.nom, eleve, data)) {
        c = x;
        matchedName = x.nom;
      }
    });
    if (!c) return null;
    var runs = (param.runs || []).filter(function (r) {
      return r && r.coureurId === c.id;
    });
    var bestMs = null;
    runs.forEach(function (r) {
      var ms = r.adjustedMs != null ? r.adjustedMs : r.elapsedMs;
      if (ms != null && (bestMs == null || ms < bestMs)) bestMs = ms;
    });
    var headline =
      runs.length + " passage(s)" + (bestMs != null ? " · meilleur " + formatDuree(bestMs) : "");
    return finishFact({
      toolId: session.toolId,
      toolLabel: toolLabel(session.toolId),
      sessionId: session.id,
      sessionNom: session.nomSession || "",
      date: session.lastOpenedAt || param.updatedAt,
      titre: session.nomSession,
      resume: runs.length ? runs.length + " passage(s)" : "Inscrit",
      headline: headline,
      details: [
        runs.length + " passage(s)",
        bestMs != null ? "Meilleur temps : " + formatDuree(bestMs) : null,
      ].filter(Boolean),
      playerName: matchedName,
      confidence: matchConfidence(matchedName, eleve, data),
      metrics: { passages: runs.length, meilleurMs: bestMs },
      subject: { kind: "eleve", label: matchedName },
    });
  }

  function extractActivitePourSession(session, data, eleve) {
    if (!session || !eleve) return null;
    var tid = session.toolId;
    if (tid === "championnat-poule") {
      return extractChampionnatEleve(championnatPourSession(data, session.id), session, eleve, data);
    }
    if (tid === "tournoi-elimination") {
      return extractTournoiEleve(tournoiPourSession(data, session.id, "tournoi-elimination"), session, eleve, data);
    }
    if (tid === "pyramide-victoires") {
      return extractPyramideEleve(tournoiPourSession(data, session.id, "pyramide-victoires"), session, eleve, data);
    }
    if (tid === "defi-atp") {
      return extractDefiAtpEleve(parametrePourSession(data, session.id, "defi-atp"), session, eleve, data);
    }
    if (tid === "composition-equipes") {
      return extractCompositionEleve(parametrePourSession(data, session.id, "composition-equipes"), session, eleve, data);
    }
    if (tid === "course-orientation") {
      return extractOrientationEleve(parametrePourSession(data, session.id, "course-orientation"), session, eleve, data);
    }
    return null;
  }

  function collectActivitesEleve(eleve, data, options) {
    options = options || {};
    if (!eleve || !eleve.classeId) return [];
    var sessions = sessionsPourClasse(data, eleve.classeId, options.period);
    var out = [];
    sessions.forEach(function (s) {
      var a = extractActivitePourSession(s, data, eleve);
      if (a) out.push(a);
    });
    out.sort(function (a, b) {
      return String(b.date || "").localeCompare(String(a.date || ""));
    });
    return out;
  }

  function collectActivitesClasse(classeId, data, options) {
    options = options || {};
    var classe = getClasse(data, classeId);
    if (!classe) return { parOutil: [] };
    var sessions = sessionsPourClasse(data, classeId, options.period);
    var parOutil = {};
    sessions.forEach(function (s) {
      var tid = s.toolId || "autre";
      if (!parOutil[tid]) {
        parOutil[tid] = {
          toolId: tid,
          label: toolLabel(tid),
          nbSessions: 0,
          sessions: [],
        };
      }
      parOutil[tid].nbSessions++;
      var resume = s.nomSession || "Séance";
      if (tid === "championnat-poule") {
        var ch = championnatPourSession(data, s.id);
        if (ch && ch.teams) resume += " — " + ch.teams.length + " équipe(s), " + (ch.matches || []).length + " match(s)";
      } else if (tid === "tournoi-elimination") {
        var tr = tournoiPourSession(data, s.id, "tournoi-elimination");
        if (tr && tr.payload) resume += " — " + nomsTournoi(tr.payload).length + " participant(s)";
      } else if (tid === "pyramide-victoires") {
        var py = tournoiPourSession(data, s.id, "pyramide-victoires");
        if (py && py.players) resume += " — " + py.players.length + " joueur(s)";
      } else if (tid === "defi-atp") {
        var da = parametrePourSession(data, s.id, "defi-atp");
        if (da && da.players) {
          var nbM = (da.matches || []).length;
          resume += " — " + da.players.length + " joueur(s)" + (nbM ? ", " + nbM + " match(s)" : "");
        }
      } else if (tid === "composition-equipes") {
        var co = parametrePourSession(data, s.id, "composition-equipes");
        if (co && co.players) resume += " — " + co.nbEquipes + " équipes, " + co.players.length + " joueur(s)";
      } else if (tid === "course-orientation") {
        var or = parametrePourSession(data, s.id, "course-orientation");
        if (or && or.coureurs) resume += " — " + or.coureurs.length + " coureur(s), " + (or.runs || []).length + " passage(s)";
      }
      parOutil[tid].sessions.push({
        id: s.id,
        nom: s.nomSession,
        date: s.lastOpenedAt || s.updatedAt,
        resume: resume,
      });
    });
    return {
      parOutil: Object.keys(parOutil).map(function (k) {
        return parOutil[k];
      }),
    };
  }

  function activitesVersTimeline(activites) {
    return (activites || []).map(function (a) {
      if (Facts && Facts.factToTimelineEvent) {
        var ev = Facts.factToTimelineEvent(a);
        if (ev) return ev;
      }
      return {
        type: "activite",
        date: a.date,
        label: a.toolLabel + " — " + (a.titre || a.sessionNom),
        detail: a.headline || a.resume + (a.details && a.details.length ? " · " + a.details.join(" · ") : ""),
      };
    });
  }

  return {
    collectActivitesEleve: collectActivitesEleve,
    collectActivitesClasse: collectActivitesClasse,
    activitesVersTimeline: activitesVersTimeline,
    extractActivitePourSession: extractActivitePourSession,
    nameMatchesEleve: nameMatchesEleve,
    sessionsPourClasse: sessionsPourClasse,
    sessionLinkedToClasse: sessionLinkedToClasse,
  };
});
