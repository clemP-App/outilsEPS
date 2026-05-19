/**
 * Helpers DOM partagés (éviter innerHTML pour les données dynamiques).
 */
var OutilsDom = (function () {
  "use strict";

  function clear(node) {
    if (!node) return;
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function setIconButton(btn, emoji, ariaLabel, iconClass) {
    if (!btn) return;
    clear(btn);
    var span = document.createElement("span");
    span.className = iconClass || "btn-icon-emoji";
    span.setAttribute("aria-hidden", "true");
    span.textContent = emoji;
    btn.appendChild(span);
    if (ariaLabel) btn.setAttribute("aria-label", ariaLabel);
  }

  function emptyState(message) {
    var p = document.createElement("p");
    p.className = "empty-state";
    p.textContent = message;
    return p;
  }

  function option(select, value, label) {
    var opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    select.appendChild(opt);
    return opt;
  }

  return {
    clear: clear,
    setIconButton: setIconButton,
    emptyState: emptyState,
    option: option,
  };
})();
