/**
 * Vitesse de course — distance + temps → km/h, allure (min/km), m/s.
 */
(function () {
  "use strict";

  var distanceEl = document.getElementById("distance");
  var uniteEl = document.getElementById("unite-distance");
  var minEl = document.getElementById("temps-min");
  var secEl = document.getElementById("temps-sec");
  var msgEl = document.getElementById("vitesse-msg");
  var sectionResultats = document.getElementById("section-resultats");
  var resultKmh = document.getElementById("resultat-kmh");
  var resultAllure = document.getElementById("resultat-allure");
  var resultMs = document.getElementById("resultat-ms");

  function montrerMsg(msg) {
    if (!msgEl) return;
    msgEl.hidden = !msg;
    msgEl.textContent = msg || "";
  }

  function lireDistanceKm() {
    var raw = (distanceEl.value || "").replace(",", ".").trim();
    if (raw === "") return NaN;
    var v = parseFloat(raw);
    if (isNaN(v) || v <= 0) return NaN;
    if (uniteEl && uniteEl.value === "km") return v;
    return v / 1000;
  }

  function lireTempsSecondes() {
    var mi = parseInt(minEl.value, 10);
    var se = parseInt(secEl.value, 10);
    if (minEl.value === "" && secEl.value === "") return NaN;
    if (isNaN(mi)) mi = 0;
    if (isNaN(se)) se = 0;
    if (mi < 0 || se < 0 || se >= 60) return NaN;
    var total = mi * 60 + se;
    if (total <= 0) return NaN;
    return total;
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

  function formaterNombre(n, decimales) {
    if (!isFinite(n)) return "—";
    var f = Math.pow(10, decimales);
    return String(Math.round(n * f) / f);
  }

  function masquerResultats() {
    if (sectionResultats) sectionResultats.hidden = true;
    if (resultKmh) resultKmh.textContent = "—";
    if (resultAllure) resultAllure.textContent = "—";
    if (resultMs) resultMs.textContent = "—";
  }

  function calculer() {
    montrerMsg("");
    var distKm = lireDistanceKm();
    var tempsS = lireTempsSecondes();

    if (distanceEl.value !== "" && isNaN(distKm)) {
      masquerResultats();
      montrerMsg("Distance invalide : entrez une valeur strictement positive.");
      return;
    }
    if ((minEl.value !== "" || secEl.value !== "") && isNaN(tempsS)) {
      masquerResultats();
      montrerMsg("Temps invalide : minutes ≥ 0, secondes entre 0 et 59, durée totale > 0.");
      return;
    }
    if (isNaN(distKm) || isNaN(tempsS)) {
      masquerResultats();
      return;
    }

    var tempsH = tempsS / 3600;
    var kmh = distKm / tempsH;
    var allureMin = 60 / kmh;
    var ms = (distKm * 1000) / tempsS;

    if (sectionResultats) sectionResultats.hidden = false;
    if (resultKmh) resultKmh.textContent = formaterNombre(kmh, 2);
    if (resultAllure) resultAllure.textContent = formaterAllure(allureMin);
    if (resultMs) resultMs.textContent = formaterNombre(ms, 2);
  }

  if (distanceEl) distanceEl.addEventListener("input", calculer);
  if (uniteEl) uniteEl.addEventListener("change", calculer);
  if (minEl) minEl.addEventListener("input", calculer);
  if (secEl) secEl.addEventListener("input", calculer);
})();
