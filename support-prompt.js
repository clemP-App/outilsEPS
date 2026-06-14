/**
 * Invitation à soutenir ou partager Outils EPS après certains passages sur l’accueil.
 */
(function () {
  "use strict";

  var MILESTONES = [20, 100, 200];
  var VIEWS_KEY = "outils_eps_index_views_v1";
  var SHOWN_KEY = "outils_eps_support_shown_v1";
  var NEVER_KEY = "outils_eps_support_never_v1";
  var TIPEEE_URL = "https://fr.tipeee.com/clemp/";

  var dialog = null;
  var neverEl = null;
  var socialMount = null;
  var currentMilestone = null;
  var previewMode = false;

  function isIndexPage() {
    if (!window.location || !window.location.pathname) return false;
    var path = window.location.pathname;
    return path === "/" || /(^|\/)index\.html$/i.test(path);
  }

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  function readViews() {
    try {
      var n = parseInt(localStorage.getItem(VIEWS_KEY) || "0", 10);
      return isNaN(n) || n < 0 ? 0 : n;
    } catch (e) {
      return 0;
    }
  }

  function writeViews(count) {
    try {
      localStorage.setItem(VIEWS_KEY, String(count));
    } catch (e) {}
  }

  function isNeverHidden() {
    try {
      return localStorage.getItem(NEVER_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function shownMilestones() {
    var list = readJson(SHOWN_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function markMilestoneShown(milestone) {
    if (!milestone) return;
    var list = shownMilestones();
    if (list.indexOf(milestone) === -1) list.push(milestone);
    writeJson(SHOWN_KEY, list);
  }

  function milestoneForCount(count) {
    var i;
    for (i = MILESTONES.length - 1; i >= 0; i--) {
      if (count === MILESTONES[i]) return MILESTONES[i];
    }
    return null;
  }

  function shouldAutoOpen(count) {
    if (!isIndexPage() || isNeverHidden()) return null;
    var milestone = milestoneForCount(count);
    if (!milestone) return null;
    if (shownMilestones().indexOf(milestone) !== -1) return null;
    return milestone;
  }

  function mountSocialShare() {
    if (!socialMount || socialMount.childElementCount || !window.OutilsEPSSocialShare) return;
    try {
      OutilsEPSSocialShare.mount(socialMount, {
        onFeedback: function (text) {
          var msg = document.getElementById("support-share-msg");
          if (!msg) return;
          msg.hidden = false;
          msg.textContent = text;
        },
      });
    } catch (e) {
      console.warn("Outils EPS : partage social indisponible dans le popup soutien.", e);
    }
  }

  function bindDismiss() {
    if (!dialog) return;
    dialog.querySelectorAll(".support-dialog__dismiss").forEach(function (btn) {
      btn.addEventListener("click", function () {
        dialog.close();
      });
    });
  }

  function openDialog(milestone, options) {
    if (!dialog) return;
    if (typeof dialog.showModal !== "function") {
      console.warn("Outils EPS : popup soutien indisponible (showModal non supporté).");
      return;
    }

    options = options || {};
    previewMode = !!options.preview;
    currentMilestone = previewMode ? null : milestone;

    var badge = document.getElementById("support-milestone-badge");
    if (badge) {
      if (previewMode) {
        badge.hidden = false;
        badge.textContent = "Aperçu";
      } else if (milestone) {
        badge.hidden = false;
        badge.textContent = milestone + " visites sur l’accueil";
      } else {
        badge.hidden = true;
      }
    }

    if (neverEl) neverEl.checked = false;
    var msg = document.getElementById("support-share-msg");
    if (msg) {
      msg.hidden = true;
      msg.textContent = "";
    }

    mountSocialShare();
    dialog.showModal();
  }

  function onDialogClose() {
    if (previewMode) {
      previewMode = false;
      currentMilestone = null;
      return;
    }
    if (neverEl && neverEl.checked) {
      try {
        localStorage.setItem(NEVER_KEY, "1");
      } catch (e) {}
    } else if (currentMilestone) {
      markMilestoneShown(currentMilestone);
    }
    currentMilestone = null;
  }

  function recordVisitAndMaybeOpen() {
    if (!isIndexPage()) return;
    var views = readViews() + 1;
    writeViews(views);

    var milestone = shouldAutoOpen(views);
    if (!milestone) return;

    window.setTimeout(function () {
      openDialog(milestone);
    }, 900);
  }

  function init() {
    dialog = document.getElementById("dialog-support-project");
    neverEl = document.getElementById("support-never-again");
    socialMount = document.getElementById("support-social-share");

    if (!dialog) return;

    bindDismiss();
    dialog.addEventListener("close", onDialogClose);

    var tipeeeBtn = document.getElementById("btn-support-tipeee");
    if (tipeeeBtn) {
      tipeeeBtn.setAttribute("href", TIPEEE_URL);
    }

    recordVisitAndMaybeOpen();
  }

  window.OutilsEPSSupportPrompt = {
    open: function (options) {
      openDialog(null, options || { preview: true });
    },
    getViews: readViews,
    milestones: MILESTONES.slice(),
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
