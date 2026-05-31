/**
 * Validation ASNS — génération PDF attestations officielles (recto + verso).
 */
var ValidationAsnsPdf = (function () {
  "use strict";

  var Core = typeof ValidationAsnsCore !== "undefined" ? ValidationAsnsCore : null;

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
    lineH = lineH || 5;
    lines.forEach(function (ln) {
      doc.text(ln, x, y);
      y += lineH;
    });
    return y;
  }

  function drawField(doc, x, y, w, label, value, opts) {
    opts = opts || {};
    var h = opts.height || 11;
    var labelSize = opts.labelSize || 7;
    var valueSize = opts.valueSize || 10.5;

    setFill(doc, C.white);
    setDraw(doc, C.slateLight);
    doc.setLineWidth(0.25);
    roundRect(doc, x, y, w, h, 1.5, "FD");

    setText(doc, C.slate);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(labelSize);
    doc.text(label.toUpperCase(), x + 2.5, y + 4);

    setText(doc, C.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(valueSize);
    var val = (value || "").trim();
    if (val) {
      var clipped = doc.splitTextToSize(val, w - 5);
      doc.text(clipped[0], x + 2.5, y + 8.8);
    } else if (opts.placeholder) {
      setText(doc, C.slateMuted);
      doc.text(opts.placeholder, x + 2.5, y + 8.8);
    }

    return y + h + (opts.gap || 3);
  }

  function drawPageFrame(doc) {
    var w = doc.internal.pageSize.getWidth();
    var h = doc.internal.pageSize.getHeight();
    var m = 8;

    setFill(doc, C.paper);
    doc.rect(0, 0, w, h, "F");

    setFill(doc, C.primary);
    doc.rect(0, 0, w, 14, "F");
    setFill(doc, C.primaryDark);
    doc.rect(0, 12, w, 2, "F");

    setDraw(doc, C.primary);
    doc.setLineWidth(0.6);
    doc.rect(m, m + 6, w - 2 * m, h - 2 * m - 6);

    setText(doc, C.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("RÉPUBLIQUE FRANÇAISE", m + 2, m + 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text("Ministère de l'Éducation nationale", w - m - 2, m + 10, { align: "right" });

    return { w: w, h: h, m: m, innerTop: m + 6, innerH: h - 2 * m - 6 };
  }

  /**
   * Recto — attestation identité élève (format paysage A4).
   */
  function pageRecto(doc, eleve, settings) {
    var box = drawPageFrame(doc);
    var w = box.w;
    var h = box.h;
    var m = box.m;
    var top = box.innerTop + 4;
    var contentH = box.innerH - 8;

    var leftW = 98;
    var leftX = m + 4;
    var rightX = leftX + leftW + 6;
    var rightW = w - rightX - m - 4;

    setFill(doc, C.primaryMuted);
    roundRect(doc, leftX, top, leftW, contentH, 2, "F");

    setDraw(doc, C.primarySoft);
    doc.setLineWidth(0.35);
    roundRect(doc, leftX, top, leftW, contentH, 2, "S");

    setText(doc, C.primaryDeep);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("ÉTABLISSEMENT", leftX + 5, top + 10);

    setText(doc, C.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    var yL = top + 16;
    yL = textBlock(
      doc,
      doc.splitTextToSize("Académie de", leftW - 10),
      leftX + 5,
      yL,
      4
    );
    setFill(doc, C.white);
    setDraw(doc, C.slateLight);
    doc.setLineWidth(0.2);
    roundRect(doc, leftX + 5, yL, leftW - 10, 9, 1, "FD");
    setText(doc, C.ink);
    doc.setFontSize(9);
    var acad = (settings && settings.academie) || "";
    doc.text(acad || " ", leftX + 7, yL + 6);
    yL += 14;

    setText(doc, C.slate);
    doc.setFontSize(7);
    yL = textBlock(
      doc,
      doc.splitTextToSize(
        "Cachet de l'établissement et signature du directeur de l'école ou du chef d'établissement",
        leftW - 10
      ),
      leftX + 5,
      yL + 4,
      3.8
    );

    setFill(doc, C.white);
    setDraw(doc, C.slateLight);
    roundRect(doc, leftX + 5, top + contentH - 38, leftW - 10, 30, 1.5, "FD");
    setText(doc, C.slate);
    doc.setFontSize(6.5);
    doc.text("Espace réservé au cachet", leftX + leftW / 2, top + contentH - 22, {
      align: "center",
    });

    setText(doc, C.slate);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text("Liberté · Égalité · Fraternité", leftX + 5, top + contentH - 6);

    var photoW = 32;
    var photoH = 40;
    var photoX = w - m - photoW - 6;
    var photoY = top + 2;

    setFill(doc, C.white);
    setDraw(doc, C.primary);
    doc.setLineWidth(0.5);
    roundRect(doc, photoX - 2, photoY - 2, photoW + 4, photoH + 4, 2, "FD");

    setFill(doc, C.slateLight);
    roundRect(doc, photoX, photoY, photoW, photoH, 1.5, "F");

    if (eleve.photo) {
      try {
        doc.addImage(eleve.photo, "JPEG", photoX + 1, photoY + 1, photoW - 2, photoH - 2);
      } catch (e1) {
        try {
          doc.addImage(eleve.photo, "PNG", photoX + 1, photoY + 1, photoW - 2, photoH - 2);
        } catch (e2) {
          setText(doc, C.slate);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.text("Photo", photoX + photoW / 2, photoY + photoH / 2 + 2, { align: "center" });
        }
      }
    } else {
      setText(doc, C.slate);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Photo", photoX + photoW / 2, photoY + photoH / 2 + 2, { align: "center" });
    }

    var mainW = photoX - rightX - 8;
    setFill(doc, C.primary);
    roundRect(doc, rightX, top, mainW, 18, 2, "F");
    setText(doc, C.white);
    doc.setFont("times", "bolditalic");
    doc.setFontSize(18);
    doc.text("Attestation du savoir-nager en sécurité", rightX + mainW / 2, top + 9, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("(ASNS)", rightX + mainW / 2, top + 15, { align: "center" });

    var fy = top + 24;
    var fieldW = mainW;

    fy = drawField(doc, rightX, fy, fieldW, "Nom", (eleve.nom || "").toUpperCase());
    fy = drawField(doc, rightX, fy, fieldW, "Prénom", eleve.prenom || "");
    var dn =
      Core && Core.formatNaissance
        ? Core.formatNaissance(eleve.dateNaissance)
        : eleve.dateNaissance || "";
    fy = drawField(doc, rightX, fy, fieldW, "Date de naissance", dn, {
      placeholder: "jj / mm / aaaa",
    });
    drawField(
      doc,
      rightX,
      fy,
      fieldW,
      "École / collège",
      (settings && settings.etablissement) || "",
      { placeholder: "Nom de l'établissement" }
    );

    setText(doc, C.primaryDeep);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.text(
      "Document officiel — attestation du savoir-nager en sécurité (arrêté du 28 février 2022)",
      rightX,
      top + contentH - 2
    );
  }

  /**
   * Verso — certification et signatures.
   */
  function pageVerso(doc, eleve, settings) {
    var box = drawPageFrame(doc);
    var w = box.w;
    var h = box.h;
    var m = box.m;
    var top = box.innerTop + 4;
    var contentH = box.innerH - 8;
    var pad = m + 6;
    var maxW = w - 2 * pad;

    setFill(doc, C.primary);
    roundRect(doc, pad, top, maxW, 20, 2, "F");
    setText(doc, C.white);
    doc.setFont("times", "bolditalic");
    doc.setFontSize(17);
    doc.text('Attestation du savoir-nager en sécurité (ASNS)', w / 2, top + 12, { align: "center" });

    var bodyY = top + 26;
    setFill(doc, C.white);
    setDraw(doc, C.slateLight);
    doc.setLineWidth(0.25);
    roundRect(doc, pad, bodyY, maxW, contentH - 52, 2, "FD");

    var y = bodyY + 10;
    var enseignant = (settings && settings.enseignant) || "………………………………";
    var profil = settings && settings.profil === "ecole" ? "ecole" : "eps";
    var nomEleve =
      [eleve.prenom, eleve.nom].filter(Boolean).join(" ") || "………………………………";

    setText(doc, C.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);

    var p1 =
      profil === "ecole"
        ? "Le professeur des écoles et le " + enseignant + ", certifient que l'élève"
        : "Le professeur des écoles et le ……………………, ou le professeur d'EPS (1), " +
          enseignant +
          ", certifient que l'élève";

    y = textBlock(doc, doc.splitTextToSize(p1, maxW - 14), pad + 7, y, 5.5);

    setFill(doc, C.primaryMuted);
    setDraw(doc, C.primarySoft);
    doc.setLineWidth(0.3);
    roundRect(doc, pad + 7, y + 2, maxW - 14, 10, 1.5, "FD");
    setText(doc, C.primaryDeep);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(nomEleve, pad + 10, y + 9);

    y += 18;
    setText(doc, C.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    var p2 =
      "maîtrise le savoir-nager en sécurité défini par l'arrêté du 28 février 2022 (parcours aquatique d'environ 50 m, connaissances et attitudes).";
    y = textBlock(doc, doc.splitTextToSize(p2, maxW - 14), pad + 7, y, 5.5);

    y += 6;
    setText(doc, C.slate);
    doc.setFontSize(9);
    doc.text("Fait le", pad + 7, y);
    var dateVal = eleve.dateValidation
      ? Core
        ? Core.formatDateFr(eleve.dateValidation)
        : eleve.dateValidation
      : "";
    setFill(doc, C.white);
    setDraw(doc, C.primary);
    doc.setLineWidth(0.35);
    roundRect(doc, pad + 22, y - 5, 42, 9, 1.5, "FD");
    setText(doc, C.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(dateVal || "    /    /        ", pad + 25, y);

    var sigTop = bodyY + contentH - 58;
    var colW = (maxW - 10) / 2;

    function signatureBox(x, title) {
      setFill(doc, C.paper);
      setDraw(doc, C.slateLight);
      doc.setLineWidth(0.25);
      roundRect(doc, x, sigTop, colW, 38, 2, "FD");
      setText(doc, C.primaryDeep);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(title, x + colW / 2, sigTop + 7, { align: "center" });
      setDraw(doc, C.slateLight);
      doc.setLineWidth(0.2);
      doc.line(x + 6, sigTop + 30, x + colW - 6, sigTop + 30);
    }

    signatureBox(pad, "Professionnel agréé (et titre)");
    signatureBox(pad + colW + 10, "Professeur");

    if (settings && settings.signaturePng) {
      try {
        doc.addImage(settings.signaturePng, "PNG", pad + colW + 16, sigTop + 10, 42, 18);
      } catch (err) {
        /* ignore */
      }
    }
    if (settings && settings.enseignant) {
      setText(doc, C.ink);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(settings.enseignant, pad + colW + 16, sigTop + 34);
    }

    setText(doc, C.slate);
    doc.setFontSize(6.5);
    doc.text("(1) compléter ou rayer la mention inutile", pad, h - m - 4);
  }

  function genererAttestation(eleve, settings, opts) {
    var JSPDF = getJSPDF();
    if (!JSPDF) {
      return Promise.reject(new Error("jsPDF non chargé."));
    }
    opts = opts || {};
    var doc = new JSPDF({ unit: "mm", format: "a4", orientation: "landscape" });
    pageRecto(doc, eleve, settings);
    doc.addPage("a4", "landscape");
    pageVerso(doc, eleve, settings);

    var fname =
      opts.filename ||
      "attestation-asns-" +
        (eleve.nom || "eleve") +
        "-" +
        (eleve.prenom || "") +
        ".pdf";
    fname = fname.replace(/[^\w\u00C0-\u024F.-]+/gi, "_");

    if (opts.returnDoc) return Promise.resolve({ doc: doc, filename: fname });

    try {
      var blob = doc.output("blob");
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = fname;
      a.click();
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 4000);
      return Promise.resolve(fname);
    } catch (e) {
      doc.save(fname);
      return Promise.resolve(fname);
    }
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
    var doc = new JSPDF({ unit: "mm", format: "a4", orientation: "landscape" });
    valides.forEach(function (el, i) {
      if (i > 0) doc.addPage("a4", "landscape");
      pageRecto(doc, el, settings);
      doc.addPage("a4", "landscape");
      pageVerso(doc, el, settings);
    });
    var fname = "attestations-asns-classe.pdf";
    try {
      var blob = doc.output("blob");
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = fname;
      a.click();
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 4000);
    } catch (e) {
      doc.save(fname);
    }
    return Promise.resolve(fname);
  }

  return {
    genererAttestation: genererAttestation,
    genererClasse: genererClasse,
    pageRecto: pageRecto,
    pageVerso: pageVerso,
  };
})(typeof window !== "undefined" ? window : globalThis);
