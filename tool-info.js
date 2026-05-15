/**
 * Bouton « i » d’aide par outil — textes simples pour débutants.
 * Appeler ToolInfo.init({ intro, sections }) sur chaque page outil.
 */
var ToolInfo = (function () {
  "use strict";

  /** Icône « i » en SVG (pas de police externe ni CDN). */
  function creerIconeInfo() {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "info-icon");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "12");
    circle.setAttribute("cy", "12");
    circle.setAttribute("r", "10");
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", "currentColor");
    circle.setAttribute("stroke-width", "2");
    var stem = document.createElementNS("http://www.w3.org/2000/svg", "path");
    stem.setAttribute("d", "M12 11v5");
    stem.setAttribute("fill", "none");
    stem.setAttribute("stroke", "currentColor");
    stem.setAttribute("stroke-width", "2");
    stem.setAttribute("stroke-linecap", "round");
    var dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", "12");
    dot.setAttribute("cy", "7.5");
    dot.setAttribute("r", "1");
    dot.setAttribute("fill", "currentColor");
    dot.setAttribute("stroke", "none");
    svg.appendChild(circle);
    svg.appendChild(stem);
    svg.appendChild(dot);
    return svg;
  }

  function creerDialog(cfg) {
    var dialog = document.createElement("dialog");
    dialog.className = "info-dialog card tool-info-dialog";
    dialog.id = "dialog-tool-info";
    dialog.setAttribute("aria-labelledby", "tool-info-dialog-title");

    var form = document.createElement("form");
    form.method = "dialog";
    form.className = "info-dialog__form";

    var titre = document.createElement("h2");
    titre.id = "tool-info-dialog-title";
    titre.className = "info-dialog__title";
    titre.textContent = cfg.title || "Comment utiliser cet outil";
    form.appendChild(titre);

    if (cfg.intro) {
      var intro = document.createElement("p");
      intro.className = "tool-info-dialog__intro";
      intro.textContent = cfg.intro;
      form.appendChild(intro);
    }

    (cfg.sections || []).forEach(function (sec) {
      var section = document.createElement("section");
      section.className = "info-dialog__section";
      if (sec.title) {
        var h = document.createElement("h3");
        h.textContent = sec.title;
        section.appendChild(h);
      }
      if (sec.text) {
        var p = document.createElement("p");
        p.textContent = sec.text;
        section.appendChild(p);
      }
      if (sec.list && sec.list.length) {
        var ul = document.createElement("ul");
        ul.className = "info-dialog__list";
        sec.list.forEach(function (item) {
          var li = document.createElement("li");
          li.textContent = item;
          ul.appendChild(li);
        });
        section.appendChild(ul);
      }
      form.appendChild(section);
    });

    var btn = document.createElement("button");
    btn.type = "submit";
    btn.className = "btn btn--primary info-dialog__close";
    btn.textContent = "J’ai compris";
    form.appendChild(btn);

    dialog.appendChild(form);
    return dialog;
  }

  function init(cfg) {
    cfg = cfg || {};
    var header = document.querySelector(".page-outil__header");
    if (!header) return;

    var h1 = header.querySelector("h1");
    if (!cfg.title && h1) cfg.title = "À propos : " + (h1.textContent || "").trim();

    header.classList.add("page-outil__header--has-info");

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tool-info-btn";
    btn.setAttribute("aria-label", "Aide sur cet outil");
    btn.title = "Aide";
    btn.appendChild(creerIconeInfo());

    var dialog = creerDialog(cfg);
    document.body.appendChild(dialog);

    btn.addEventListener("click", function () {
      if (dialog.showModal) dialog.showModal();
    });
    header.appendChild(btn);
  }

  return { init: init, creerIconeInfo: creerIconeInfo };
})();
