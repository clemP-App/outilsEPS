/**
 * Distance VMA — duree + VMA + pourcentage -> distance objectif.
 */
(function () {
  "use strict";

  var minEl = document.getElementById("duree-min");
  var secEl = document.getElementById("duree-sec");
  var vmaEl = document.getElementById("vma");
  var pourcentageEl = document.getElementById("pourcentage-vma");
  var msgEl = document.getElementById("distance-vma-msg");
  var sectionResultats = document.getElementById("section-resultats");
  var resultDistance = document.getElementById("resultat-distance");
  var resultVitesse = document.getElementById("resultat-vitesse");
  var resultAllure = document.getElementById("resultat-allure");
  var reperes = {
    25: document.getElementById("repere-25"),
    50: document.getElementById("repere-50"),
    100: document.getElementById("repere-100"),
    200: document.getElementById("repere-200"),
    400: document.getElementById("repere-400"),
  };

  function lireNombre(el) {
    var raw = (el.value || "").replace(",", ".").trim();
    if (raw === "") return NaN;
    return parseFloat(raw);
  }

  function lireDureeSecondes() {
    var mi = parseInt(minEl.value, 10);
    var se = parseInt(secEl.value, 10);
    if (minEl.value === "" && secEl.value === "") return NaN;
    if (isNaN(mi)) mi = 0;
    if (isNaN(se)) se = 0;
    if (mi < 0 || se < 0 || se >= 60) return NaN;
    var total = mi * 60 + se;
    return total > 0 ? total : NaN;
  }

  function montrerMsg(msg) {
    if (!msgEl) return;
    msgEl.hidden = !msg;
    msgEl.textContent = msg || "";
  }

  function formaterNombre(n, decimales) {
    if (!isFinite(n)) return "—";
    var f = Math.pow(10, decimales);
    return String(Math.round(n * f) / f);
  }

  function formaterAllure(totalMin) {
    if (!isFinite(totalMin) || totalMin <= 0) return "—";
    var whole = Math.floor(totalMin + 1e-9);
    var secs = Math.round((totalMin - whole) * 60);
    if (secs === 60) {
      whole += 1;
      secs = 0;
    }
    return whole + " min " + (secs < 10 ? "0" : "") + secs + " s";
  }

  function formaterRepereSecondes(totalSecondes) {
    if (!isFinite(totalSecondes) || totalSecondes <= 0) return "—";
    if (totalSecondes < 60) return formaterNombre(totalSecondes, 1) + " s";

    var minutes = Math.floor(totalSecondes / 60);
    var secondes = Math.round(totalSecondes - minutes * 60);
    if (secondes === 60) {
      minutes += 1;
      secondes = 0;
    }
    return minutes + " min " + (secondes < 10 ? "0" : "") + secondes + " s";
  }

  function masquerResultats() {
    if (sectionResultats) sectionResultats.hidden = true;
    if (resultDistance) resultDistance.textContent = "—";
    if (resultVitesse) resultVitesse.textContent = "—";
    if (resultAllure) resultAllure.textContent = "—";
    Object.keys(reperes).forEach(function (distance) {
      if (reperes[distance]) reperes[distance].textContent = "—";
    });
  }

  function synchroniserChips() {
    var total = lireDureeSecondes();
    var pct = lireNombre(pourcentageEl);
    Array.prototype.forEach.call(document.querySelectorAll(".distance-vma-chip"), function (btn) {
      var active = false;
      if (btn.hasAttribute("data-percent")) {
        active = pct === parseFloat(btn.getAttribute("data-percent"));
      } else if (btn.hasAttribute("data-min")) {
        var min = parseInt(btn.getAttribute("data-min"), 10) || 0;
        var sec = parseInt(btn.getAttribute("data-sec"), 10) || 0;
        active = total === min * 60 + sec;
      }
      btn.classList.toggle("is-active", active);
    });
  }

  function calculer() {
    montrerMsg("");
    synchroniserChips();

    var dureeS = lireDureeSecondes();
    var vma = lireNombre(vmaEl);
    var pct = lireNombre(pourcentageEl);

    if ((minEl.value !== "" || secEl.value !== "") && isNaN(dureeS)) {
      masquerResultats();
      montrerMsg("Durée invalide : minutes ≥ 0, secondes entre 0 et 59, durée totale > 0.");
      return;
    }
    if (vmaEl.value !== "" && (isNaN(vma) || vma <= 0)) {
      masquerResultats();
      montrerMsg("VMA invalide : entrez une valeur strictement positive.");
      return;
    }
    if (pourcentageEl.value !== "" && (isNaN(pct) || pct <= 0 || pct > 200)) {
      masquerResultats();
      montrerMsg("Pourcentage invalide : entrez une valeur entre 1 et 200.");
      return;
    }
    if (isNaN(dureeS) || isNaN(vma) || isNaN(pct)) {
      masquerResultats();
      return;
    }

    var vitesseCible = vma * (pct / 100);
    var distanceM = vitesseCible * (dureeS / 3600) * 1000;
    var allureMin = 60 / vitesseCible;

    if (sectionResultats) sectionResultats.hidden = false;
    if (resultDistance) resultDistance.textContent = formaterNombre(distanceM, 0);
    if (resultVitesse) resultVitesse.textContent = formaterNombre(vitesseCible, 2);
    if (resultAllure) resultAllure.textContent = formaterAllure(allureMin);
    Object.keys(reperes).forEach(function (distance) {
      var secondes = (parseInt(distance, 10) * 3.6) / vitesseCible;
      if (reperes[distance]) reperes[distance].textContent = formaterRepereSecondes(secondes);
    });
  }

  function appliquerPreset(event) {
    var btn = event.currentTarget;
    if (btn.hasAttribute("data-percent")) {
      pourcentageEl.value = btn.getAttribute("data-percent");
    } else {
      minEl.value = btn.getAttribute("data-min") || "";
      secEl.value = btn.getAttribute("data-sec") || "0";
    }
    calculer();
  }

  if (minEl) minEl.addEventListener("input", calculer);
  if (secEl) secEl.addEventListener("input", calculer);
  if (vmaEl) vmaEl.addEventListener("input", calculer);
  if (pourcentageEl) pourcentageEl.addEventListener("input", calculer);
  Array.prototype.forEach.call(document.querySelectorAll(".distance-vma-chip"), function (btn) {
    btn.addEventListener("click", appliquerPreset);
  });
})();
