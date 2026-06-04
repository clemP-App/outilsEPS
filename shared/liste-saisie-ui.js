/**
 * Libellé et compteurs pour les zones « un nom par ligne » (séance + lignes en cours de saisie).
 */
(function (global) {
  "use strict";

  function compterLignesNonVides(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map(function (l) {
        return l.trim();
      })
      .filter(Boolean).length;
  }

  /**
   * @param {number} sessionCount
   * @param {number} ligneCount
   * @param {{ sessionSingular?: string, sessionPlural?: string }} [opts]
   */
  function buildMetaText(sessionCount, ligneCount, opts) {
    opts = opts || {};
    var sessionSing = opts.sessionSingular || "joueur ou équipe";
    var sessionPlur = opts.sessionPlural || "joueurs ou équipes";
    var sessionLabel = sessionCount <= 1 ? sessionSing : sessionPlur;
    var ligneLabel = ligneCount <= 1 ? "ligne remplie" : "lignes remplies";
    return (
      sessionCount +
      " " +
      sessionLabel +
      " dans la séance · " +
      ligneCount +
      " " +
      ligneLabel
    );
  }

  /**
   * @param {Object} opts
   * @param {HTMLLabelElement} [opts.labelEl]
   * @param {HTMLElement} [opts.metaEl]
   * @param {HTMLTextAreaElement} [opts.textareaEl]
   * @param {function(): number} [opts.getSessionCount]
   * @param {string} [opts.sessionSingular]
   * @param {string} [opts.sessionPlural]
   * @returns {{ refresh: function(): void }}
   */
  function bind(opts) {
    opts = opts || {};
    var metaEl = opts.metaEl;
    if (!metaEl && opts.labelEl) {
      metaEl = opts.labelEl.querySelector(".field-label__meta, .orient-field__meta");
    }
    var textareaEl = opts.textareaEl;
    var getSessionCount =
      typeof opts.getSessionCount === "function" ? opts.getSessionCount : function () {
        return 0;
      };

    function refresh() {
      if (!metaEl) return;
      var session = 0;
      try {
        session = getSessionCount();
      } catch (e) {
        session = 0;
      }
      if (typeof session !== "number" || isNaN(session)) session = 0;
      var lignes = textareaEl ? compterLignesNonVides(textareaEl.value) : 0;
      metaEl.textContent = buildMetaText(session, lignes, opts);
    }

    if (textareaEl) {
      textareaEl.addEventListener("input", refresh);
    }
    refresh();

    return { refresh: refresh };
  }

  global.ListeSaisieUi = {
    compterLignesNonVides: compterLignesNonVides,
    buildMetaText: buildMetaText,
    bind: bind,
  };
})(typeof window !== "undefined" ? window : globalThis);
