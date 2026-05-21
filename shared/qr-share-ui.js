/**
 * UI partagée « Partager au prof (QR) » pour les outils élèves.
 */
var EleveQrShare = (function () {
  "use strict";

  var dialogEl = null;
  var qrHostEl = null;
  var msgEl = null;
  var urlEl = null;
  var currentOptions = null;

  function $(id) {
    return document.getElementById(id);
  }

  function ensureDialog() {
    if (dialogEl) return;
    dialogEl = document.createElement("dialog");
    dialogEl.id = "eleve-qr-share-dialog";
    dialogEl.className = "eleve-qr-dialog";
    dialogEl.innerHTML =
      '<form method="dialog" class="eleve-qr-dialog__form">' +
      '<header class="eleve-qr-dialog__header">' +
      '<h2 id="eleve-qr-dialog-title">Partager au prof</h2>' +
      '<button type="button" class="btn btn--ghost eleve-qr-dialog__close" data-action="close" aria-label="Fermer">✕</button>' +
      "</header>" +
      '<p class="hint eleve-qr-dialog__hint">Scannez ce QR avec l’outil prof <strong>Données élèves</strong>. Fonctionne sans internet.</p>' +
      '<div class="field-row eleve-qr-meta">' +
      '<div class="field-group"><label class="field-label" for="eleve-qr-classe">Classe (optionnel)</label><input type="text" id="eleve-qr-classe" maxlength="80" autocomplete="off" /></div>' +
      '<div class="field-group"><label class="field-label" for="eleve-qr-participant">Joueur / Équipe</label><input type="text" id="eleve-qr-participant" maxlength="120" autocomplete="off" /></div>' +
      "</div>" +
      '<p class="msg-error eleve-qr-dialog__msg" id="eleve-qr-dialog-msg" hidden></p>' +
      '<div class="eleve-qr-dialog__qr" id="eleve-qr-host" aria-live="polite"></div>' +
      '<p class="hint eleve-qr-size" id="eleve-qr-size"></p>' +
      '<label class="field-label" for="eleve-qr-url">Lien encodé (secours)</label>' +
      '<textarea id="eleve-qr-url" class="eleve-qr-url" rows="3" readonly></textarea>' +
      '<div class="eleve-qr-dialog__actions">' +
      '<button type="button" class="btn btn--ghost" data-action="copy">Copier le lien</button>' +
      '<button type="button" class="btn btn--primary" data-action="refresh">Actualiser le QR</button>' +
      '<button type="submit" class="btn btn--ghost" value="cancel">Fermer</button>' +
      "</div>" +
      "</form>";
    document.body.appendChild(dialogEl);
    qrHostEl = $("eleve-qr-host");
    msgEl = $("eleve-qr-dialog-msg");
    urlEl = $("eleve-qr-url");

    dialogEl.querySelector('[data-action="close"]').addEventListener("click", function () {
      dialogEl.close();
    });
    dialogEl.querySelector('[data-action="copy"]').addEventListener("click", copyUrl);
    dialogEl.querySelector('[data-action="refresh"]').addEventListener("click", function () {
      if (currentOptions) renderQr(currentOptions);
    });
    ["eleve-qr-classe", "eleve-qr-participant"].forEach(function (id) {
      var input = $(id);
      if (!input) return;
      input.addEventListener("change", function () {
        if (typeof EleveLabels !== "undefined") {
          EleveLabels.saveMetaFields({
            classeLabel: $("eleve-qr-classe").value,
            auteurLabel: $("eleve-qr-participant").value,
          });
        }
        if (currentOptions) renderQr(currentOptions);
      });
    });
  }

  function participantFromOptions(options) {
    if (options && typeof options.getParticipantLabel === "function") {
      try {
        var fromTool = options.getParticipantLabel();
        if (fromTool && String(fromTool).trim()) return String(fromTool).trim();
      } catch (e) {
        /* ignore */
      }
    }
    return "";
  }

  function showMsg(text, isError) {
    if (!msgEl) return;
    msgEl.hidden = !text;
    msgEl.textContent = text || "";
    msgEl.classList.toggle("msg-error", !!isError);
    msgEl.classList.toggle("msg-ok", !!text && !isError);
  }

  function clearQr() {
    if (!qrHostEl) return;
    if (typeof OutilsDom !== "undefined" && OutilsDom.clear) {
      OutilsDom.clear(qrHostEl);
    } else {
      qrHostEl.innerHTML = "";
    }
  }

  function renderQr(options) {
    currentOptions = options;
    ensureDialog();
    showMsg("", false);

    if (typeof QrExchangeCore === "undefined") {
      showMsg("Module QR indisponible.", true);
      return;
    }

    var payload;
    try {
      payload = options.getPayload();
    } catch (e) {
      showMsg(e.message || "Impossible de préparer les données.", true);
      return;
    }

    if (options.validateBeforeShare) {
      var pre = options.validateBeforeShare(payload);
      if (pre) {
        showMsg(pre, true);
        clearQr();
        if (urlEl) urlEl.value = "";
        return;
      }
    }

    var participantInput = $("eleve-qr-participant");
    if (participantInput && !participantInput.value.trim()) {
      participantInput.value = participantFromOptions(options);
    }

    var meta = typeof EleveLabels !== "undefined" ? EleveLabels.getMetaFields() : {};
    meta.classeLabel = $("eleve-qr-classe").value.trim() || meta.classeLabel;
    meta.auteurLabel = (participantInput && participantInput.value.trim()) || meta.auteurLabel;

    var record;
    var url;
    try {
      record = QrExchangeCore.buildExportRecord(options.toolId, payload, meta);
      url = QrExchangeCore.encodeRecord(record);
    } catch (e) {
      showMsg(e.message || "Encodage impossible.", true);
      return;
    }

    if (urlEl) urlEl.value = url;
    var sizeEl = $("eleve-qr-size");
    if (sizeEl) {
      sizeEl.textContent =
        "Taille : " +
        url.length +
        " caractères dans l’URL. Au-delà de ~2 Ko, le scan peut échouer.";
    }

    clearQr();
    if (typeof QRCode === "undefined") {
      showMsg("Générateur QR indisponible.", true);
      return;
    }

    try {
      new QRCode(qrHostEl, {
        text: url,
        width: 280,
        height: 280,
        correctLevel: QRCode.CorrectLevel.L,
      });
    } catch (e) {
      showMsg("Données trop volumineuses pour un QR unique.", true);
    }
  }

  function copyUrl() {
    if (!urlEl || !urlEl.value) return;
    var text = urlEl.value;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { showMsg("Lien copié.", false); },
        function () { fallbackCopy(text); }
      );
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    urlEl.select();
    try {
      document.execCommand("copy");
      showMsg("Lien copié.", false);
    } catch (e) {
      showMsg("Copie impossible.", false);
    }
  }

  function open(options) {
    if (!options || !options.toolId || typeof options.getPayload !== "function") return;
    ensureDialog();
    var title = $("eleve-qr-dialog-title");
    if (title) {
      title.textContent =
        "Partager — " +
        (typeof QrExchangeCore !== "undefined"
          ? QrExchangeCore.toolTitle(options.toolId)
          : options.toolId);
    }
    if (typeof EleveLabels !== "undefined") {
      var meta = EleveLabels.getMetaFields();
      $("eleve-qr-classe").value = meta.classeLabel || "";
    }
    var participantInput = $("eleve-qr-participant");
    if (participantInput) {
      participantInput.value =
        participantFromOptions(options) ||
        (typeof EleveLabels !== "undefined" ? EleveLabels.getMetaFields().auteurLabel : "") ||
        "";
    }
    renderQr(options);
    if (typeof dialogEl.showModal === "function") dialogEl.showModal();
  }

  function mountButton(container, options) {
    if (!container) return null;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn--ghost btn--labeled eleve-qr-share-btn";
    var label = options.buttonLabel || "Partager au prof (QR)";
    btn.innerHTML =
      '<span class="btn__icon" aria-hidden="true">📲</span><span class="btn__text">' + label + "</span>";
    btn.addEventListener("click", function () {
      open(options);
    });
    container.appendChild(btn);
    return btn;
  }

  return { open: open, mountButton: mountButton };
})();
