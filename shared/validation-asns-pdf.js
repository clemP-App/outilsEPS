/**
 * Validation ASNS — génération PDF attestation officielle (1 page A4 paysage).
 */
var ValidationAsnsPdf = (function () {
  "use strict";

  var Core = typeof ValidationAsnsCore !== "undefined" ? ValidationAsnsCore : null;

  var HEADER_SRC = "../assets/asns/entete-asns.jpg";
  var headerCache = null;

  var C = {
    primary: [13, 148, 136],
    primaryDark: [15, 118, 110],
    primaryDeep: [17, 94, 89],
    primarySoft: [204, 251, 241],
    primaryMuted: [240, 253, 250],
    ink: [15, 23, 42],
    slate: [71, 85, 105],
    slateMuted: [148, 163, 184],
    slateLight: [226, 232, 240],
    paper: [248, 250, 252],
    white: [255, 255, 255],
  };

  function getJSPDF() {
    return window.jspdf && window.jspdf.jsPDF;
  }

  function setFill(doc, rgb) {
    doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  }

  function setDraw(doc, rgb) {
    doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  }

  function setText(doc, rgb) {
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  }

  function roundRect(doc, x, y, w, h, r, style) {
    if (typeof doc.roundedRect === "function") {
      doc.roundedRect(x, y, w, h, r, r, style);
    } else {
      doc.rect(x, y, w, h, style);
    }
  }

  function textBlock(doc, lines, x, y, lineH) {
    lineH = lineH || 4.2;
    lines.forEach(function (ln) {
      doc.text(ln, x, y);
      y += lineH;
    });
    return y;
  }

  function getHeaderUrl() {
    try {
      return new URL("../assets/asns/entete-asns.jpg", window.location.href).href;
    } catch (e) {
      return HEADER_SRC;
    }
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(reader.result);
      };
      reader.onerror = function () {
        reject(new Error("Impossible de lire l'en-tête ASNS."));
      };
      reader.readAsDataURL(blob);
    });
  }

  function dataUrlToHeaderMeta(dataUrl) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        resolve({
          dataUrl: dataUrl,
          format: String(dataUrl).indexOf("image/png") >= 0 ? "PNG" : "JPEG",
          w: img.naturalWidth || img.width,
          h: img.naturalHeight || img.height,
        });
      };
      img.onerror = function () {
        reject(new Error("En-tête ASNS illisible."));
      };
      img.src = dataUrl;
    });
  }

  function loadHeaderImageViaXhr(url) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.responseType = "blob";
      xhr.onload = function () {
        if (xhr.status !== 200 && xhr.status !== 0) {
          reject(new Error("Impossible de charger l'en-tête ASNS."));
          return;
        }
        blobToDataUrl(xhr.response)
          .then(dataUrlToHeaderMeta)
          .then(function (meta) {
            headerCache = meta;
            resolve(headerCache);
          })
          .catch(reject);
      };
      xhr.onerror = function () {
        reject(new Error("Impossible de charger l'en-tête ASNS."));
      };
      xhr.send();
    });
  }

  function loadHeaderImage() {
    if (headerCache) return Promise.resolve(headerCache);
    if (typeof ValidationAsnsHeader !== "undefined" && ValidationAsnsHeader.getMeta) {
      return ValidationAsnsHeader.getMeta().then(function (meta) {
        headerCache = meta;
        return headerCache;
      });
    }
    var url = getHeaderUrl();
    if (typeof fetch !== "function") {
      return loadHeaderImageViaXhr(url);
    }
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("Impossible de charger l'en-tête ASNS.");
        return res.blob();
      })
      .then(blobToDataUrl)
      .then(dataUrlToHeaderMeta)
      .then(function (meta) {
        headerCache = meta;
        return headerCache;
      })
      .catch(function () {
        return loadHeaderImageViaXhr(url);
      });
  }

  function drawHeaderFallback(doc, pageW, pageH) {
    setFill(doc, C.primary);
    doc.rect(0, 0, pageW, 38, "F");
    setText(doc, C.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Attestation du savoir-nager en sécurité", pageW / 2, 18, { align: "center" });
    doc.setFontSize(11);
    doc.text("(ASNS)", pageW / 2, 28, { align: "center" });
    return { pageW: pageW, pageH: pageH, contentTop: 42 };
  }

  function drawHeaderBackground(doc, header) {
    var pageW = doc.internal.pageSize.getWidth();
    var pageH = doc.internal.pageSize.getHeight();
    if (header && header.dataUrl && header.w && header.h) {
      try {
        var aspect = header.h / header.w;
        var drawH = pageH;
        var drawW = drawH / aspect;
        var drawX = (pageW - drawW) / 2;
        doc.addImage(header.dataUrl, header.format || "JPEG", drawX, 0, drawW, drawH);
        return { pageW: pageW, pageH: pageH, contentTop: pageH * 0.475 + 1 };
      } catch (e) {
        /* en-tête image illisible pour jsPDF — repli graphique */
      }
    }
    return drawHeaderFallback(doc, pageW, pageH);
  }

  function telechargerBlob(filename, blob) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 4000);
  }

  function buildPdf(eleve, settings, header, opts) {
    var JSPDF = getJSPDF();
    if (!JSPDF) {
      throw new Error("jsPDF non chargé.");
    }
    opts = opts || {};
    var doc = new JSPDF({ unit: "mm", format: "a4", orientation: "landscape" });
    pageAttestation(doc, eleve, settings, header);

    var fname =
      opts.filename ||
      "attestation-asns-" +
        (eleve.nom || "eleve") +
        "-" +
        (eleve.prenom || "") +
        ".pdf";
    fname = fname.replace(/[^\w\u00C0-\u024F.-]+/gi, "_");

    if (opts.returnDoc) return { doc: doc, filename: fname };

    try {
      telechargerBlob(fname, doc.output("blob"));
    } catch (e) {
      doc.save(fname);
    }
    return fname;
  }

  function drawField(doc, x, y, w, label, value, opts) {
    opts = opts || {};
    var h = opts.height || 10;
    var labelSize = opts.labelSize || 6;
    var valueSize = opts.valueSize || 8.5;
    var padX = opts.padX || 2.5;

    setFill(doc, C.white);
    setDraw(doc, C.slateLight);
    doc.setLineWidth(0.2);
    roundRect(doc, x, y, w, h, 1.2, "FD");

    setText(doc, C.slate);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(labelSize);
    doc.text(label.toUpperCase(), x + padX, y + 3.8);

    setText(doc, C.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(valueSize);
    var val = (value || "").trim();
    if (val) {
      var clipped = doc.splitTextToSize(val, w - padX * 2);
      doc.text(clipped[0], x + padX, y + 7.8);
    } else if (opts.placeholder) {
      setText(doc, C.slateMuted);
      doc.text(opts.placeholder, x + padX, y + 7.8);
    }

    return y + h + (opts.gap || 2.5);
  }

  function certificationIntroLines(profil, enseignant) {
    var nomProf = (enseignant || "").trim() || "………………………………";
    var lignePe = "………………………………………………………………";
    if (profil === "ecole") {
      return [
        "Le professeur des écoles et le " + nomProf + ",",
        "certifient que l'élève",
      ];
    }
    return [
      "Le professeur des écoles et le " + lignePe + ",",
      "ou le professeur d'EPS (1), " + nomProf + ",",
      "certifient que l'élève",
    ];
  }

  /**
   * Attestation complète — identité, certification et signatures (1 page A4 paysage).
   */
  function pageAttestation(doc, eleve, settings, header) {
    var layout = drawHeaderBackground(doc, header);
    var pageW = layout.pageW;
    var pageH = layout.pageH;
    var top = layout.contentTop;
    var m = 10;
    var gutter = 6;
    var bottom = pageH - m;
    var pad = 3;

    var leftW = 62;
    var leftX = m;
    var mainX = leftX + leftW + gutter;
    var mainW = pageW - mainX - m;

    setFill(doc, C.primaryMuted);
    setDraw(doc, C.primarySoft);
    doc.setLineWidth(0.25);
    roundRect(doc, leftX, top, leftW, bottom - top, 1.5, "FD");

    setText(doc, C.primaryDeep);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("ÉTABLISSEMENT", leftX + pad, top + 7);

    setText(doc, C.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text("Académie de", leftX + pad, top + 13);

    setFill(doc, C.white);
    setDraw(doc, C.slateLight);
    doc.setLineWidth(0.2);
    roundRect(doc, leftX + pad, top + 15.5, leftW - pad * 2, 8, 1, "FD");
    setText(doc, C.ink);
    doc.setFontSize(7.5);
    var acad = (settings && settings.academie) || "";
    doc.text(acad || " ", leftX + pad + 2, top + 21);

    setText(doc, C.slate);
    doc.setFontSize(5.8);
    textBlock(
      doc,
      doc.splitTextToSize(
        "Cachet de l'établissement et signature du directeur de l'école ou du chef d'établissement",
        leftW - pad * 2
      ),
      leftX + pad,
      top + 27,
      3.2
    );

    var cachetH = 26;
    var cachetY = bottom - cachetH - 10;
    setFill(doc, C.white);
    setDraw(doc, C.slateLight);
    roundRect(doc, leftX + pad, cachetY, leftW - pad * 2, cachetH, 1.2, "FD");
    setText(doc, C.slate);
    doc.setFontSize(5.8);
    doc.text("Espace réservé au cachet", leftX + leftW / 2, cachetY + cachetH / 2 + 1, {
      align: "center",
    });

    setText(doc, C.slate);
    doc.setFontSize(5.5);
    doc.text("Liberté · Égalité · Fraternité", leftX + pad, bottom - 2);

    var identityTop = top + 1;
    var fieldH = 9.5;
    var fieldGap = 2;
    var colGap = 3;
    var photoW = 23;
    var photoH = 28;
    var photoX = mainX + pad;
    var photoY = identityTop + 1;
    var identityPadBottom = 4;
    var row1Y = identityTop + 1;
    var row2Y = row1Y + fieldH + fieldGap;
    var identityContentBottom = Math.max(photoY + photoH, row2Y + fieldH);
    var identityBoxH = identityContentBottom - identityTop + identityPadBottom + 2;

    setFill(doc, C.white);
    setDraw(doc, C.slateLight);
    doc.setLineWidth(0.2);
    roundRect(doc, mainX, identityTop, mainW, identityBoxH, 1.5, "FD");

    setFill(doc, C.white);
    setDraw(doc, C.primary);
    doc.setLineWidth(0.35);
    roundRect(doc, photoX, photoY, photoW, photoH, 1.5, "FD");
    setFill(doc, C.slateLight);
    roundRect(doc, photoX + 0.5, photoY + 0.5, photoW - 1, photoH - 1, 1, "F");

    if (eleve.photo) {
      try {
        doc.addImage(eleve.photo, "JPEG", photoX + 1, photoY + 1, photoW - 2, photoH - 2);
      } catch (e1) {
        try {
          doc.addImage(eleve.photo, "PNG", photoX + 1, photoY + 1, photoW - 2, photoH - 2);
        } catch (e2) {
          setText(doc, C.slate);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.text("Photo", photoX + photoW / 2, photoY + photoH / 2 + 1, { align: "center" });
        }
      }
    } else {
      setText(doc, C.slate);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text("Photo", photoX + photoW / 2, photoY + photoH / 2 + 1, { align: "center" });
    }

    var fieldsX = photoX + photoW + 5;
    var fieldsW = mainX + mainW - fieldsX - pad;
    var halfW = (fieldsW - colGap) / 2;

    drawField(doc, fieldsX, row1Y, halfW, "Nom", (eleve.nom || "").toUpperCase(), {
      height: fieldH,
      gap: fieldGap,
    });
    drawField(doc, fieldsX + halfW + colGap, row1Y, halfW, "Prénom", eleve.prenom || "", {
      height: fieldH,
      gap: fieldGap,
    });

    var dn =
      Core && Core.formatNaissance
        ? Core.formatNaissance(eleve.dateNaissance)
        : eleve.dateNaissance || "";
    drawField(doc, fieldsX, row2Y, halfW, "Date de naissance", dn, {
      height: fieldH,
      placeholder: "jj / mm / aaaa",
      gap: fieldGap,
    });
    drawField(
      doc,
      fieldsX + halfW + colGap,
      row2Y,
      halfW,
      "École / collège",
      (settings && settings.etablissement) || "",
      { height: fieldH, placeholder: "Nom de l'établissement", gap: fieldGap }
    );

    var identityBottom = Math.max(row2Y + fieldH + identityPadBottom, photoY + photoH + identityPadBottom);
    var certW = mainW;
    var enseignant = (settings && settings.enseignant) || "";
    var profil = settings && settings.profil === "ecole" ? "ecole" : "eps";
    var nomEleve =
      [eleve.prenom, eleve.nom].filter(Boolean).join(" ") || "………………………………";

    var sigH = 20;
    var sigGap = 8;
    var colW = (certW - sigGap) / 2;

    var certY = identityBottom + 5;
    setText(doc, C.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.6);

    var introLines = certificationIntroLines(profil, enseignant);
    certY = textBlock(doc, introLines, mainX + pad, certY, 4);

    certY += 3;
    var nameBoxH = 8;
    setFill(doc, C.primaryMuted);
    setDraw(doc, C.primarySoft);
    doc.setLineWidth(0.25);
    roundRect(doc, mainX, certY, certW, nameBoxH, 1.2, "FD");
    setText(doc, C.primaryDeep);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(nomEleve, mainX + pad + 1, certY + 5.8);

    certY += nameBoxH + 4;
    setText(doc, C.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.6);
    var p2 =
      "maîtrise le savoir-nager en sécurité défini par l'arrêté du 28 février 2022 (parcours aquatique d'environ 50 m, connaissances et attitudes).";
    certY = textBlock(doc, doc.splitTextToSize(p2, certW - pad * 2), mainX + pad, certY, 3.8);

    certY += 2;
    setText(doc, C.slate);
    doc.setFontSize(7.5);
    doc.text("Fait le", mainX + pad, certY + 1);
    var dateVal = eleve.dateValidation
      ? Core
        ? Core.formatDateFr(eleve.dateValidation)
        : eleve.dateValidation
      : "";
    setFill(doc, C.white);
    setDraw(doc, C.primary);
    doc.setLineWidth(0.25);
    roundRect(doc, mainX + pad + 13, certY - 3.5, 34, 7, 1, "FD");
    setText(doc, C.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(dateVal || "    /    /        ", mainX + pad + 15, certY + 1);

    var sigTop = certY + 9;

    function signatureBox(x, title) {
      setText(doc, C.primaryDeep);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.8);
      doc.text(title, x + colW / 2, sigTop + 6, { align: "center" });
      setDraw(doc, C.slateLight);
      doc.setLineWidth(0.2);
      doc.line(x + 2, sigTop + sigH - 3, x + colW - 2, sigTop + sigH - 3);
    }

    signatureBox(mainX, "Professionnel agréé (et titre)");
    signatureBox(mainX + colW + sigGap, "Professeur");

    if (settings && settings.signaturePng) {
      try {
        doc.addImage(
          settings.signaturePng,
          "PNG",
          mainX + colW + sigGap + 6,
          sigTop + 9,
          colW - 12,
          14
        );
      } catch (err) {
        /* ignore */
      }
    }
    if (settings && settings.enseignant) {
      setText(doc, C.ink);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(settings.enseignant, mainX + colW + sigGap + 6, sigTop + sigH - 4);
    }

    setText(doc, C.slate);
    doc.setFontSize(5.8);
    doc.text(
      "Document officiel — attestation du savoir-nager en sécurité (arrêté du 28 février 2022)",
      mainX + pad,
      sigTop + sigH + 2.5
    );
    if (profil !== "ecole") {
      doc.text("(1) compléter ou rayer la mention inutile", mainX + pad, sigTop + sigH + 5.5);
    }
  }

  /** @deprecated compatibilité tests — alias vers pageAttestation sans en-tête image */
  function pageRecto(doc, eleve, settings) {
    pageAttestation(doc, eleve, settings, headerCache || { dataUrl: "", w: 3, h: 2 });
  }

  /** @deprecated le verso est fusionné dans pageAttestation */
  function pageVerso(doc, eleve, settings) {
    /* noop — contenu intégré sur une seule page */
  }

  function genererAttestation(eleve, settings, opts) {
    opts = opts || {};
    return loadHeaderImage()
      .catch(function () {
        return null;
      })
      .then(function (header) {
        try {
          return buildPdf(eleve, settings, header, opts);
        } catch (e) {
          throw new Error((e && e.message) || "Erreur lors de la génération du PDF.");
        }
      });
  }

  function genererClasse(eleves, settings) {
    var JSPDF = getJSPDF();
    if (!JSPDF) {
      return Promise.reject(new Error("jsPDF non chargé."));
    }
    var valides = eleves.filter(function (e) {
      return e.statut === (Core && Core.STATUT_ELEVE ? Core.STATUT_ELEVE.VALIDE : "valide");
    });
    if (!valides.length) {
      return Promise.reject(new Error("Aucun élève validé dans cette sélection."));
    }
    return loadHeaderImage()
      .catch(function () {
        return null;
      })
      .then(function (header) {
        var doc = new JSPDF({ unit: "mm", format: "a4", orientation: "landscape" });
        valides.forEach(function (el, i) {
          if (i > 0) doc.addPage("a4", "landscape");
          pageAttestation(doc, el, settings, header);
        });
        var fname = "attestations-asns-classe.pdf";
        try {
          telechargerBlob(fname, doc.output("blob"));
        } catch (e) {
          doc.save(fname);
        }
        return fname;
      });
  }

  return {
    genererAttestation: genererAttestation,
    genererClasse: genererClasse,
    pageAttestation: pageAttestation,
    pageRecto: pageRecto,
    pageVerso: pageVerso,
    loadHeaderImage: loadHeaderImage,
  };
})(typeof window !== "undefined" ? window : globalThis);
