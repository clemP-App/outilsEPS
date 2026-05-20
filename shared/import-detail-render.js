/**
 * Rendu HTML du détail d’un import élève (sans innerHTML pour données utilisateur).
 */
var ImportDetailRender = (function () {
  "use strict";

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null && text !== "") node.textContent = String(text);
    return node;
  }

  function row(parent, label, value) {
    var r = el("div", "import-detail-row");
    r.appendChild(el("span", "import-detail-row__label", label));
    r.appendChild(el("strong", "import-detail-row__value", value));
    parent.appendChild(r);
  }

  function sectionTitle(parent, title) {
    parent.appendChild(el("h3", "import-detail-section", title));
  }

  function renderTableMarque(payload, root) {
    sectionTitle(root, "Scores");
    row(root, "Équipe gauche", (payload.teams && payload.teams.left && payload.teams.left.name) || "—");
    row(root, "Score gauche", payload.teams && payload.teams.left ? payload.teams.left.score : "—");
    row(root, "Équipe droite", (payload.teams && payload.teams.right && payload.teams.right.name) || "—");
    row(root, "Score droite", payload.teams && payload.teams.right ? payload.teams.right.score : "—");
    if (payload.timer) {
      sectionTitle(root, "Timer");
      row(root, "Durée réglée", payload.timer.durationLabel || "—");
      row(root, "Temps affiché", payload.timer.displayLabel || "—");
    }
  }

  function renderPtb(payload, root) {
    var teams = payload.teams || {};
    ["a", "b"].forEach(function (id) {
      var t = teams[id];
      if (!t) return;
      sectionTitle(root, t.name || "Équipe " + id.toUpperCase());
      row(root, "Buts", t.goals);
      row(root, "Tirs", t.shots);
      row(root, "Pertes", t.losses);
      if (t.efficiency != null) row(root, "Efficacité tir", t.efficiency + "%");
      if (t.possessionLabel) row(root, "Possession", t.possessionLabel);
    });
    if (payload.mode) row(root, "Mode chrono", payload.mode);
    if (payload.finished) row(root, "Match", "Terminé");
  }

  function renderBonus(payload, root) {
    var players = payload.players || {};
    ["A", "B"].forEach(function (id) {
      var p = players[id];
      if (!p) return;
      sectionTitle(root, p.name || "Joueur " + id);
      row(root, "Score", p.score);
      if (p.counts) {
        row(root, "Bonus", p.counts.bonus + " actions");
        row(root, "Points normaux", p.counts.normal + " actions");
        row(root, "Malus", p.counts.malus + " actions");
      }
    });
    if (payload.settings) {
      sectionTitle(root, "Barème");
      row(root, "Valeur bonus", payload.settings.ptsBonus);
      row(root, "Valeur point", payload.settings.ptsNormal);
      row(root, "Valeur malus", payload.settings.ptsMalus);
    }
  }

  function renderVitesse(payload, root) {
    row(root, "Libellé", payload.label || "—");
    row(root, "Vitesse moyenne", payload.vitesseMoyenne != null ? payload.vitesseMoyenne + " km/h" : "—");
    row(root, "Dernier intervalle", payload.vitesseDernier != null ? payload.vitesseDernier + " km/h" : "—");
    row(root, "Passages", payload.passages ? payload.passages.length : 0);
    if (payload.passages && payload.passages.length) {
      sectionTitle(root, "Détail passages");
      payload.passages.slice(0, 12).forEach(function (p) {
        row(
          root,
          "Plot " + p.numero,
          (p.vitesseDernier != null ? p.vitesseDernier + " km/h" : "—") +
            (p.intervalLabel ? " (" + p.intervalLabel + ")" : "")
        );
      });
      if (payload.passages.length > 12) {
        row(root, "…", "+" + (payload.passages.length - 12) + " passages");
      }
    }
  }

  function renderImpact(payload, root) {
    row(root, "Libellé", payload.label || "—");
    row(root, "Activité", payload.activityLabel || payload.activity || "—");
    row(root, "Total impacts", payload.total);
    if (payload.coverage) row(root, "Zones touchées", payload.coverage);
    if (payload.mainZone) row(root, "Zone principale", payload.mainZone);
    if (payload.zones && payload.zones.length) {
      sectionTitle(root, "Par zone");
      payload.zones.forEach(function (z) {
        row(root, z.label, z.count + " (" + z.percent + "%)");
      });
    }
  }

  function render(record, container) {
    if (!container) return;
    if (typeof OutilsDom !== "undefined" && OutilsDom.clear) {
      OutilsDom.clear(container);
    } else {
      container.innerHTML = "";
    }
    if (!record) {
      container.appendChild(el("p", "empty-state", "Aucun détail."));
      return;
    }

    var meta = el("div", "import-detail-meta");
    row(meta, "Outil", typeof QrExchangeCore !== "undefined" ? QrExchangeCore.toolTitle(record.toolId) : record.toolId);
    if (record.classeLabel) row(meta, "Classe", record.classeLabel);
    if (record.groupeLabel) row(meta, "Groupe", record.groupeLabel);
    if (record.auteurLabel) row(meta, "Élève / binôme", record.auteurLabel);
    row(meta, "Créé le", record.createdAt ? new Date(record.createdAt).toLocaleString("fr-FR") : "—");
    row(meta, "Importé le", record.importedAt ? new Date(record.importedAt).toLocaleString("fr-FR") : "—");
    container.appendChild(meta);

    var body = el("div", "import-detail-body");
    var payload = record.payload || {};
    if (record.toolId === "table-marque") renderTableMarque(payload, body);
    else if (record.toolId === "compteur-ptb") renderPtb(payload, body);
    else if (record.toolId === "compteur-bonus") renderBonus(payload, body);
    else if (record.toolId === "vitesse-plots") renderVitesse(payload, body);
    else if (record.toolId === "zone-impact") renderImpact(payload, body);
    else row(body, "Données", JSON.stringify(payload));
    container.appendChild(body);
  }

  return { render: render };
})();
