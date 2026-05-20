/**
 * Récupération de données élèves — scan QR et import IndexedDB.
 */
(function () {
  "use strict";

  var readerEl = document.getElementById("recup-reader");
  var msgEl = document.getElementById("recup-msg");
  var okEl = document.getElementById("recup-ok");
  var btnStart = document.getElementById("recup-start");
  var btnStop = document.getElementById("recup-stop");
  var pasteEl = document.getElementById("recup-paste");
  var btnPaste = document.getElementById("recup-import-paste");

  var scanner = null;
  var scanning = false;
  var lastScanned = "";
  var lastScanAt = 0;

  function showMsg(text, isOk) {
    if (msgEl) {
      msgEl.hidden = !text || isOk;
      msgEl.textContent = isOk ? "" : text || "";
    }
    if (okEl) {
      okEl.hidden = !text || !isOk;
      okEl.textContent = isOk ? text || "" : "";
    }
  }

  function importRecord(record) {
    if (typeof DataManager === "undefined") {
      showMsg("DataManager indisponible.", false);
      return Promise.resolve();
    }
    return DataManager.ready
      .then(function () {
        return DataManager.hasImportedRecord(record.exportId);
      })
      .then(function (exists) {
        if (
          exists &&
          !confirm(
            "Cet export a déjà été importé (même identifiant). Réimporter quand même ?"
          )
        ) {
          showMsg("Import annulé (doublon).", false);
          return null;
        }
        return DataManager.saveImportedRecord({
          exportId: record.exportId,
          toolId: record.toolId,
          createdAt: record.createdAt,
          classeLabel: record.classeLabel,
          groupeLabel: record.groupeLabel,
          auteurLabel: record.auteurLabel,
          checksum: record.checksum,
          payload: record.payload,
        });
      })
      .then(function (saved) {
        if (!saved) return;
        var title =
          typeof QrExchangeCore !== "undefined"
            ? QrExchangeCore.toolTitle(saved.toolId)
            : saved.toolId;
        showMsg("Import enregistré — " + title + ".", true);
      })
      .catch(function (e) {
        showMsg(e.message || "Erreur lors de l’import.", false);
      });
  }

  function handleRawQr(text) {
    if (!text || typeof QrExchangeCore === "undefined") return;
    var now = Date.now();
    if (text === lastScanned && now - lastScanAt < 3000) return;
    lastScanned = text;
    lastScanAt = now;

    var parsed = QrExchangeCore.parseQrUrl(text);
    if (parsed.error) {
      showMsg(parsed.error, false);
      return;
    }
    importRecord(parsed.record);
  }

  function stopScanner() {
    if (!scanner || !scanning) return Promise.resolve();
    return scanner
      .stop()
      .then(function () {
        scanning = false;
        if (btnStart) btnStart.hidden = false;
        if (btnStop) btnStop.hidden = true;
      })
      .catch(function () {
        scanning = false;
        if (btnStart) btnStart.hidden = false;
        if (btnStop) btnStop.hidden = true;
      });
  }

  function startScanner() {
    if (typeof Html5Qrcode === "undefined") {
      showMsg("Scanner QR indisponible sur cette page.", false);
      return;
    }
    showMsg("", false);
    if (!scanner) {
      scanner = new Html5Qrcode("recup-reader");
    }
    if (scanning) return;

    var config = { fps: 8, qrbox: { width: 260, height: 260 } };
    Html5Qrcode.getCameras()
      .then(function (cameras) {
        if (!cameras || !cameras.length) {
          throw new Error("Aucune caméra détectée.");
        }
        var back = cameras.find(function (c) {
          return /back|rear|arrière|environment/i.test(c.label || "");
        });
        var camId = (back || cameras[cameras.length - 1]).id;
        return scanner.start(camId, config, handleRawQr, function () {});
      })
      .then(function () {
        scanning = true;
        if (btnStart) btnStart.hidden = true;
        if (btnStop) btnStop.hidden = false;
      })
      .catch(function (e) {
        showMsg(
          e.message ||
            "Impossible d’accéder à la caméra. Autorisez l’accès ou utilisez le collage manuel.",
          false
        );
      });
  }

  if (btnStart) btnStart.addEventListener("click", startScanner);
  if (btnStop) btnStop.addEventListener("click", stopScanner);
  if (btnPaste) {
    btnPaste.addEventListener("click", function () {
      var text = pasteEl && pasteEl.value ? pasteEl.value.trim() : "";
      if (!text) {
        showMsg("Collez d’abord le lien outilseps://…", false);
        return;
      }
      handleRawQr(text);
    });
  }

  window.addEventListener("pagehide", function () {
    stopScanner();
  });
})();
