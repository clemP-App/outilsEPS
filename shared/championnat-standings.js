/**
 * Calcul du classement championnat (poule) — logique pure, testable en Node et navigateur.
 */
(function (root) {
  "use strict";

  function sortStandings(arr) {
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

  function computeStandingsFromData(teams, matches) {
    var map = {};
    (teams || []).forEach(function (t) {
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
    (matches || []).forEach(function (m) {
      var hs = m.homeScore;
      var as = m.awayScore;
      var homeMissing = hs === null || typeof hs === "undefined";
      var awayMissing = as === null || typeof as === "undefined";
      if (homeMissing && awayMissing) {
        return;
      }
      if (homeMissing) hs = 0;
      if (awayMissing) as = 0;
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
    var arr = (teams || []).map(function (t) {
      var r = map[t.id];
      r.diff = r.pour - r.contre;
      return r;
    });
    return sortStandings(arr);
  }

  function computeStandingsByPoules(teams, matches, poules) {
    var pools = Array.isArray(poules) ? poules.slice() : [];
    var teamByPool = {};
    (teams || []).forEach(function (t) {
      var pid = t.pouleId || (pools[0] && pools[0].id) || "poule-a";
      if (!teamByPool[pid]) teamByPool[pid] = [];
      teamByPool[pid].push(t);
    });
    var matchByPool = {};
    (matches || []).forEach(function (m) {
      var pid = m.pouleId || (pools[0] && pools[0].id) || "poule-a";
      if (!matchByPool[pid]) matchByPool[pid] = [];
      matchByPool[pid].push(m);
    });

    return pools.map(function (p) {
      var poolTeams = teamByPool[p.id] || [];
      var poolMatches = matchByPool[p.id] || [];
      return {
        pouleId: p.id,
        pouleNom: p.name || p.nom || "Poule",
        rows: computeStandingsFromData(poolTeams, poolMatches),
      };
    });
  }

  var api = {
    computeStandingsFromData: computeStandingsFromData,
    computeStandingsByPoules: computeStandingsByPoules,
  };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.ChampionnatStandings = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
