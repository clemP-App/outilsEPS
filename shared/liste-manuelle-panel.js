/**
 * Panneau de saisie manuelle (textarea + valider) masqué par défaut ;
 * bouton « Ajouter manuellement » pour l’afficher.
 */
(function (global) {
  "use strict";

  /**
   * @param {Object} opts
   * @param {HTMLElement} [opts.toggleBtnEl]
   * @param {string} [opts.toggleBtnId]
   * @param {HTMLElement} [opts.panelEl]
   * @param {string} [opts.panelId]
   * @param {HTMLTextAreaElement} [opts.textareaEl]
   * @param {HTMLElement} [opts.ligneHintEl] — texte « 1 … par ligne » (masqué avec le panneau)
   * @param {string} [opts.ligneHintId]
   * @param {boolean} [opts.openIfTextareaFilled=true]
   * @returns {{ setOpen: function(boolean): void, isOpen: function(): boolean, open: function(): void, close: function(): void }}
   */
  function bind(opts) {
    opts = opts || {};
    var toggleBtn =
      opts.toggleBtnEl ||
      (opts.toggleBtnId ? document.getElementById(opts.toggleBtnId) : null);
    var panel =
      opts.panelEl || (opts.panelId ? document.getElementById(opts.panelId) : null);
    var textarea = opts.textareaEl || null;
    var ligneHint =
      opts.ligneHintEl ||
      (opts.ligneHintId ? document.getElementById(opts.ligneHintId) : null);
    if (!ligneHint && panel) {
      ligneHint = panel.querySelector(".liste-manuelle-ligne-hint");
    }
    var openIfFilled = opts.openIfTextareaFilled !== false;

    function setLigneHintVisible(visible) {
      if (!ligneHint) return;
      ligneHint.hidden = !visible;
    }

    function setOpen(ouvert) {
      if (!panel) return;
      panel.hidden = !ouvert;
      setLigneHintVisible(ouvert);
      if (toggleBtn) toggleBtn.setAttribute("aria-expanded", ouvert ? "true" : "false");
      if (ouvert && textarea && typeof textarea.focus === "function") {
        try {
          textarea.focus();
        } catch (e) {}
      }
    }

    function isOpen() {
      return panel ? !panel.hidden : false;
    }

    if (toggleBtn && panel) {
      toggleBtn.setAttribute("aria-controls", panel.id || "");
      toggleBtn.setAttribute("aria-expanded", "false");
      toggleBtn.addEventListener("click", function () {
        setOpen(panel.hidden);
      });
      setLigneHintVisible(false);
      var demarrerOuvert =
        openIfFilled && textarea && String(textarea.value || "").trim() !== "";
      setOpen(demarrerOuvert);
    }

    return {
      setOpen: setOpen,
      isOpen: isOpen,
      open: function () {
        setOpen(true);
      },
      close: function () {
        setOpen(false);
      },
    };
  }

  global.ListeManuellePanel = { bind: bind };
})(typeof window !== "undefined" ? window : globalThis);
