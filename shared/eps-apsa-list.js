/**
 * Liste des APSA (ordre alphabétique) pour les grilles d'évaluation et Appel et notes.
 */
(function (global) {
  "use strict";

  var RAW_APSA = [
    "Accompagnement personnalisé",
    "Acrosport",
    "Apnée",
    "Arts du cirque",
    "Athlétisme",
    "Aviron",
    "Badminton",
    "Basket-ball",
    "Beach-volley",
    "Boxe",
    "Canoë-kayak",
    "Course d'orientation",
    "Course en durée",
    "Cross-training",
    "Cyclisme",
    "Danse",
    "Escalade",
    "Fitness",
    "Flag football",
    "Floorball",
    "Football",
    "Football américain",
    "Golf",
    "Gymnastique",
    "Gymnastique rythmique",
    "Handball",
    "Hockey",
    "Hockey sur glace",
    "Judo",
    "Kayak",
    "Kin-ball",
    "Lutte",
    "Musculation",
    "Natation",
    "Natation en durée",
    "Paddle",
    "Padel",
    "Parkour",
    "Pentathlon moderne",
    "Pilates",
    "Préparation physique",
    "Rafting",
    "Rugby",
    "Rugby à XIII",
    "Ski de fond",
    "Skateboard",
    "Sports de combat",
    "Sports de nature",
    "Squash",
    "Step",
    "Surf",
    "Tennis",
    "Tennis de table",
    "Tir à l'arc",
    "Triathlon",
    "Ultimate",
    "Unihockey",
    "Voile",
    "Volley-ball",
    "VTT",
    "Yoga",
  ];

  var APSA_LIST = RAW_APSA.slice().sort(function (a, b) {
    return a.localeCompare(b, "fr", { sensitivity: "base" });
  });

  var ns = global.OutilsEPS || (global.OutilsEPS = {});

  ns.APSA_LIST = APSA_LIST;

  /**
   * Remplit un <select> APSA.
   * @param {HTMLSelectElement} select
   * @param {object} options - { selected, placeholder }
   */
  ns.fillApsaSelect = function (select, options) {
    if (!select) return;
    options = options || {};
    var selected = options.selected != null ? String(options.selected) : String(select.value || "");
    select.innerHTML = "";
    var empty = document.createElement("option");
    empty.value = "";
    empty.textContent = options.placeholder || "Choisir une APSA…";
    select.appendChild(empty);
    APSA_LIST.forEach(function (label) {
      var opt = document.createElement("option");
      opt.value = label;
      opt.textContent = label;
      select.appendChild(opt);
    });
    if (selected && APSA_LIST.indexOf(selected) === -1) {
      var custom = document.createElement("option");
      custom.value = selected;
      custom.textContent = selected;
      select.appendChild(custom);
    }
    if (selected) select.value = selected;
  };
})(typeof window !== "undefined" ? window : global);
