/**
 * Rappel visuel si des données existent sans export depuis plus de 15 jours.
 */
(function () {
  "use strict";

  var LAST_BACKUP_KEY = "outils_eps_last_backup_export_v1";
  var REMINDER_AFTER_DAYS = 15;
  var MENU_BTN_SELECTOR = "#btn-site-menu";
  var SAVE_LINK_SELECTOR = "#site-menu-sauvegarde-link";
  var BADGE_CLASS = "backup-reminder-badge";
  var REMINDER_CLASS = "has-backup-reminder";
  var REMINDER_TITLE = "Pensez à exporter une sauvegarde (plus de 15 jours)";

  function loadLastBackupExportAt() {
    try {
      return localStorage.getItem(LAST_BACKUP_KEY) || null;
    } catch (e) {
      return null;
    }
  }

  function saveLastBackupExportAt(exportedAt) {
    var value = exportedAt || new Date().toISOString();
    try {
      localStorage.setItem(LAST_BACKUP_KEY, value);
    } catch (e) {}
    return value;
  }

  function getBackupAgeDays(isoDate) {
    var d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return null;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  }

  function isBackupStale(isoDate) {
    if (!isoDate) return true;
    var days = getBackupAgeDays(isoDate);
    if (days === null) return true;
    return days > REMINDER_AFTER_DAYS;
  }

  function shouldShowBackupReminder(hasContent, exportedAt) {
    return !!hasContent && isBackupStale(exportedAt);
  }

  function ensureBadge(parent) {
    var badge = parent.querySelector("." + BADGE_CLASS);
    if (!badge) {
      badge = document.createElement("span");
      badge.className = BADGE_CLASS;
      badge.setAttribute("aria-hidden", "true");
      badge.textContent = "!";
      parent.appendChild(badge);
    }
    return badge;
  }

  function removeBadge(parent) {
    var badge = parent.querySelector("." + BADGE_CLASS);
    if (badge) badge.remove();
  }

  function setReminderOnElement(el, show) {
    if (!el) return;
    if (show) {
      el.classList.add(REMINDER_CLASS);
      ensureBadge(el);
    } else {
      el.classList.remove(REMINDER_CLASS);
      removeBadge(el);
    }
  }

  function applyBackupReminderUi(show) {
    var menuBtn = document.querySelector(MENU_BTN_SELECTOR);
    var saveLink = document.querySelector(SAVE_LINK_SELECTOR);
    var saveIcon = saveLink ? saveLink.querySelector(".site-menu__link-icon") : null;

    setReminderOnElement(menuBtn, show);
    setReminderOnElement(saveIcon, show);

    if (menuBtn) {
      if (show) menuBtn.setAttribute("title", REMINDER_TITLE);
      else menuBtn.removeAttribute("title");
    }
    if (saveLink) {
      if (show) saveLink.setAttribute("aria-label", "Sauvegarde — pensez à exporter");
      else saveLink.removeAttribute("aria-label");
    }
  }

  function refreshBackupReminderUi() {
    if (!window.DataManager || typeof DataManager.ready === "undefined") {
      applyBackupReminderUi(false);
      return Promise.resolve(false);
    }
    return DataManager.ready
      .then(function () {
        if (typeof DataManager.hasAnyData !== "function") return false;
        return DataManager.hasAnyData();
      })
      .then(function (hasContent) {
        var show = shouldShowBackupReminder(hasContent, loadLastBackupExportAt());
        applyBackupReminderUi(show);
        return show;
      })
      .catch(function () {
        applyBackupReminderUi(false);
        return false;
      });
  }

  window.BackupReminder = {
    LAST_BACKUP_KEY: LAST_BACKUP_KEY,
    REMINDER_AFTER_DAYS: REMINDER_AFTER_DAYS,
    loadLastBackupExportAt: loadLastBackupExportAt,
    saveLastBackupExportAt: saveLastBackupExportAt,
    getBackupAgeDays: getBackupAgeDays,
    shouldShowBackupReminder: shouldShowBackupReminder,
    applyBackupReminderUi: applyBackupReminderUi,
    refreshBackupReminderUi: refreshBackupReminderUi,
  };

  if (document.querySelector(MENU_BTN_SELECTOR) || document.querySelector(SAVE_LINK_SELECTOR)) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", refreshBackupReminderUi);
    } else {
      refreshBackupReminderUi();
    }
  }
})();
