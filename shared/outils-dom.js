/**
 * Helpers DOM partagés (liste, options, boutons icône).
 */
(function (root) {
  "use strict";
  if (typeof root.OutilsDom !== "undefined") return;

  root.OutilsDom = {
    clear: function (node) {
      if (!node) return;
      while (node.firstChild) node.removeChild(node.firstChild);
    },
    emptyState: function (text) {
      var p = document.createElement("p");
      p.className = "empty-state";
      p.textContent = text || "";
      return p;
    },
    option: function (select, value, label) {
      if (!select) return null;
      var opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label;
      select.appendChild(opt);
      return opt;
    },
    setIconButton: function (btn, icon, label, iconClass) {
      if (!btn) return;
      btn.textContent = "";
      var span = document.createElement("span");
      span.className = iconClass || "btn__icon";
      span.setAttribute("aria-hidden", "true");
      span.textContent = icon;
      btn.appendChild(span);
      if (label) btn.setAttribute("aria-label", label);
    },
  };
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this);
