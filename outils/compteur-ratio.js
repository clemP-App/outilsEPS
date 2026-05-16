/**
 * Compteur ratio — deux élèves, réussites / échecs et pourcentage de réussite.
 */
(function () {
  "use strict";

  var state = {
    a: { plus: 0, minus: 0 },
    b: { plus: 0, minus: 0 },
  };

  function el(id) {
    return document.getElementById(id);
  }

  function ratioPour(eleve) {
    var total = eleve.plus + eleve.minus;
    if (!total) return 0;
    return Math.round((eleve.plus / total) * 100);
  }

  function appliquerCouleur(id) {
    var card = document.querySelector('[data-ratio-card="' + id + '"]');
    var colorEl = el("ratio-color-" + id);
    if (!card || !colorEl) return;
    card.style.setProperty("--ratio-color", colorEl.value || "#0d9488");
  }

  function renderEleve(id) {
    var data = state[id];
    var total = data.plus + data.minus;
    var plusEl = el("ratio-plus-" + id);
    var minusEl = el("ratio-minus-" + id);
    var totalEl = el("ratio-total-" + id);
    var ratioEl = el("ratio-" + id);
    if (plusEl) plusEl.textContent = String(data.plus);
    if (minusEl) minusEl.textContent = String(data.minus);
    if (totalEl) totalEl.textContent = String(total);
    if (ratioEl) ratioEl.textContent = ratioPour(data) + "%";
    appliquerCouleur(id);
  }

  function render() {
    renderEleve("a");
    renderEleve("b");
  }

  function ajouter(id, action) {
    if (!state[id]) return;
    if (action === "plus") state[id].plus++;
    else if (action === "minus") state[id].minus++;
    renderEleve(id);
  }

  function resetStats() {
    if ((state.a.plus || state.a.minus || state.b.plus || state.b.minus) && !confirm("Remettre les statistiques des deux élèves à zéro ?")) {
      return;
    }
    state.a.plus = 0;
    state.a.minus = 0;
    state.b.plus = 0;
    state.b.minus = 0;
    render();
  }

  document.querySelectorAll(".ratio-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      ajouter(btn.getAttribute("data-eleve"), btn.getAttribute("data-action"));
    });
  });

  ["a", "b"].forEach(function (id) {
    var colorEl = el("ratio-color-" + id);
    if (!colorEl) return;
    colorEl.addEventListener("input", function () {
      appliquerCouleur(id);
    });
    colorEl.addEventListener("change", function () {
      appliquerCouleur(id);
    });
  });

  var resetBtn = el("ratio-reset");
  if (resetBtn) resetBtn.addEventListener("click", resetStats);

  render();
})();
