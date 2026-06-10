/**
 * Fonds de terrains sportifs — rendu Canvas (Tableau tactique).
 * Proportions et tracés alignés sur les dimensions officielles (FIFA, FIBA, FIVB, IHF, etc.).
 */
(function (global) {
  "use strict";

  var FIELDS = {
    football: { label: "Football", ratio: 105 / 68 },
    handball: { label: "Handball", ratio: 40 / 20 },
    basketball: { label: "Basketball", ratio: 28 / 15 },
    volleyball: { label: "Volleyball", ratio: 18 / 9 },
    badminton: { label: "Badminton", ratio: 13.4 / 6.1 },
    rugby: { label: "Rugby", ratio: 120 / 70 },
    tennis: { label: "Tennis", ratio: 23.77 / 10.97 },
    "tennis-table": { label: "Tennis de table", ratio: 2.74 / 1.525 },
    vide: { label: "Écran vide", ratio: 1.5 },
  };

  function boardFill(theme) {
    return theme === "light" ? "#ffffff" : "#000000";
  }

  function lineColor(theme) {
    return theme === "light" ? "rgba(20, 28, 40, 0.9)" : "rgba(255, 255, 255, 0.92)";
  }

  function courtBounds(W, H, ratio) {
    var margin = Math.min(W, H) * 0.07;
    var maxW = W - margin * 2;
    var maxH = H - margin * 2;
    var fw;
    var fh;
    if (maxW / maxH > ratio) {
      fh = maxH;
      fw = fh * ratio;
    } else {
      fw = maxW;
      fh = fw / ratio;
    }
    return {
      ox: (W - fw) / 2,
      oy: (H - fh) / 2,
      fw: fw,
      fh: fh,
      lw: Math.max(1.5, Math.min(fw, fh) / 120),
    };
  }

  /** Écran portrait : axe long du terrain le long de la hauteur (lisible sur portable). */
  function shouldDrawPortrait(W, H, fieldId) {
    if (!fieldId || W <= 0 || H <= 0 || H <= W) return false;
    var sport = FIELDS[fieldId] ? fieldId : "vide";
    if (sport === "vide") return true;
    return FIELDS[sport].ratio > 1;
  }

  function prepStroke(ctx, lc, lw) {
    ctx.strokeStyle = lc;
    ctx.fillStyle = lc;
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash([]);
  }

  function strokeLine(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function strokeRectPath(ctx, x, y, w, h) {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.stroke();
  }

  /** Échelle mètres → pixels (terrain à ratio correct). */
  function meters(b, lengthM, widthM) {
    return {
      x: (lengthM / b._len) * b.fw,
      y: (widthM / b._wid) * b.fh,
    };
  }

  function withDims(b, lengthM, widthM) {
    var c = Object.assign({}, b);
    c._len = lengthM;
    c._wid = widthM;
    return c;
  }

  function fillSpot(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Ligne de zone IHF (6 m / 9 m) : quart de cercle à chaque poteau (3 m de but)
   * + trait droit parallèle à la ligne de but (entre les deux arcs).
   */
  function strokeHandballZoneLine(ctx, b, gx, midY, goalHalfW, radiusM) {
    var r = meters(b, radiusM, 0).x;
    var yTop = midY - goalHalfW;
    var yBot = midY + goalHalfW;
    var xOut = gx + r;

    ctx.beginPath();
    ctx.moveTo(gx, yTop - r);
    ctx.arc(gx, yTop, r, -Math.PI / 2, 0, false);
    ctx.lineTo(xOut, yBot);
    ctx.arc(gx, yBot, r, 0, Math.PI / 2, false);
    ctx.stroke();
  }

  function strokeHandballZoneLineDashed(ctx, b, gx, midY, goalHalfW, radiusM, dash, gap) {
    ctx.save();
    ctx.setLineDash([dash, gap]);
    strokeHandballZoneLine(ctx, b, gx, midY, goalHalfW, radiusM);
    ctx.restore();
  }

  /** Zones 6 m / 9 m (ligne de but à gx). */
  function drawHandballEndZones(ctx, b, gx, midY, goalHalfW, dash, gap) {
    strokeHandballZoneLine(ctx, b, gx, midY, goalHalfW, 6);
    strokeHandballZoneLineDashed(ctx, b, gx, midY, goalHalfW, 9, dash, gap);
  }

  /**
   * Arc de penalty football : portion du cercle (r = 9,15 m) hors surface,
   * centré sur le point de penalty.
   */
  function strokeFootballPenaltyArc(ctx, spotX, spotY, penFrontX, scale) {
    var r = 9.15 * scale;
    var d = Math.abs(penFrontX - spotX);
    if (r <= 0 || d >= r) return;
    var a = Math.acos(d / r);
    ctx.beginPath();
    if (penFrontX > spotX) {
      ctx.arc(spotX, spotY, r, -a, a);
    } else {
      ctx.arc(spotX, spotY, r, Math.PI - a, Math.PI + a);
    }
    ctx.stroke();
  }

  /** Quart de cercle dans un angle (rayon 1 m foot). */
  function strokeCornerArc(ctx, cx, cy, r, quadrant) {
    var start;
    var end;
    if (quadrant === "tl") {
      start = Math.PI;
      end = Math.PI * 1.5;
    } else if (quadrant === "tr") {
      start = Math.PI * 1.5;
      end = 0;
    } else if (quadrant === "bl") {
      start = Math.PI * 0.5;
      end = Math.PI;
    } else {
      start = 0;
      end = Math.PI * 0.5;
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, end);
    ctx.stroke();
  }

  /** Football — 105 × 68 m (IFAB) */
  function drawFootball(ctx, b, lc) {
    b = withDims(b, 105, 68);
    var ox = b.ox;
    var oy = b.oy;
    var fw = b.fw;
    var fh = b.fh;
    var lw = b.lw;
    var midX = ox + fw / 2;
    var midY = oy + fh / 2;
    var m = meters(b, 1, 1);
    var scale = m.x;

    prepStroke(ctx, lc, lw);
    strokeRectPath(ctx, ox, oy, fw, fh);
    strokeLine(ctx, midX, oy, midX, oy + fh);

    ctx.beginPath();
    ctx.arc(midX, midY, m.y * 9.15, 0, Math.PI * 2);
    ctx.stroke();
    fillSpot(ctx, midX, midY, lw * 0.9);

    var penD = meters(b, 16.5, 0).x;
    var penW = meters(b, 0, 40.32).y;
    var goalD = meters(b, 5.5, 0).x;
    var goalW = meters(b, 0, 18.32).y;
    var spotOff = meters(b, 11, 0).x;
    var cornerR = meters(b, 1, 0).x;

    strokeRectPath(ctx, ox, midY - penW / 2, penD, penW);
    strokeRectPath(ctx, ox + fw - penD, midY - penW / 2, penD, penW);
    strokeRectPath(ctx, ox, midY - goalW / 2, goalD, goalW);
    strokeRectPath(ctx, ox + fw - goalD, midY - goalW / 2, goalD, goalW);

    fillSpot(ctx, ox + spotOff, midY, lw * 1.1);
    fillSpot(ctx, ox + fw - spotOff, midY, lw * 1.1);

    strokeFootballPenaltyArc(ctx, ox + spotOff, midY, ox + penD, scale);
    strokeFootballPenaltyArc(ctx, ox + fw - spotOff, midY, ox + fw - penD, scale);

    strokeCornerArc(ctx, ox, oy, cornerR, "tl");
    strokeCornerArc(ctx, ox + fw, oy, cornerR, "tr");
    strokeCornerArc(ctx, ox, oy + fh, cornerR, "bl");
    strokeCornerArc(ctx, ox + fw, oy + fh, cornerR, "br");
  }

  /** Handball — 40 × 20 m (IHF) */
  function drawHandball(ctx, b, lc) {
    b = withDims(b, 40, 20);
    var ox = b.ox;
    var oy = b.oy;
    var fw = b.fw;
    var fh = b.fh;
    var lw = b.lw;
    var midX = ox + fw / 2;
    var midY = oy + fh / 2;
    var goalHalfW = meters(b, 0, 1.5).y;
    var dash = lw * 2.5;
    var gap = lw * 1.8;
    prepStroke(ctx, lc, lw);
    strokeRectPath(ctx, ox, oy, fw, fh);
    strokeLine(ctx, midX, oy, midX, oy + fh);

    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, oy, fw, fh);
    ctx.clip();

    drawHandballEndZones(ctx, b, ox, midY, goalHalfW, dash, gap);

    ctx.save();
    ctx.translate(midX, 0);
    ctx.scale(-1, 1);
    ctx.translate(-midX, 0);
    drawHandballEndZones(ctx, b, ox, midY, goalHalfW, dash, gap);
    ctx.restore();

    ctx.restore();
  }

  /** Basketball — 28 × 15 m (FIBA) */
  function drawBasketball(ctx, b, lc) {
    b = withDims(b, 28, 15);
    var ox = b.ox;
    var oy = b.oy;
    var fw = b.fw;
    var fh = b.fh;
    var lw = b.lw;
    var midX = ox + fw / 2;
    var midY = oy + fh / 2;

    var keyW = meters(b, 0, 4.9).y;
    var hoopX = meters(b, 1.575, 0).x;
    var ftX = meters(b, 5.05, 0).x;
    var ftR = meters(b, 0, 1.8).y;
    var centerR = meters(b, 0, 1.8).y;
    var threeR = meters(b, 6.75, 0).x;
    var restrictedR = meters(b, 1.25, 0).x;

    prepStroke(ctx, lc, lw);
    strokeRectPath(ctx, ox, oy, fw, fh);
    strokeLine(ctx, midX, oy, midX, oy + fh);

    ctx.beginPath();
    ctx.arc(midX, midY, centerR, 0, Math.PI * 2);
    ctx.stroke();
    fillSpot(ctx, midX, midY, lw * 0.85);

    var ftLeft = ox + ftX;
    var ftRight = ox + fw - ftX;
    strokeRectPath(ctx, ox, midY - keyW / 2, ftX, keyW);
    strokeRectPath(ctx, ox + fw - ftX, midY - keyW / 2, ftX, keyW);

    ctx.beginPath();
    ctx.arc(ftLeft, midY, ftR, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ftRight, midY, ftR, Math.PI / 2, -Math.PI / 2);
    ctx.stroke();

    function threePointArc(hoopLineX, towardCenter) {
      var cx = hoopLineX;
      var alpha = Math.asin(Math.min(1, fh / 2 / threeR));
      ctx.beginPath();
      if (towardCenter > 0) {
        ctx.arc(cx, midY, threeR, -alpha, alpha);
      } else {
        ctx.arc(cx, midY, threeR, Math.PI - alpha, Math.PI + alpha);
      }
      ctx.stroke();
    }

    threePointArc(ox + hoopX, 1);
    threePointArc(ox + fw - hoopX, -1);

    function restrictedArc(hoopLineX, towardCenter) {
      ctx.beginPath();
      if (towardCenter > 0) {
        ctx.arc(hoopLineX, midY, restrictedR, -Math.PI / 2, Math.PI / 2);
      } else {
        ctx.arc(hoopLineX, midY, restrictedR, Math.PI / 2, -Math.PI / 2);
      }
      ctx.stroke();
    }

    restrictedArc(ox + hoopX, 1);
    restrictedArc(ox + fw - hoopX, -1);
  }

  /** Volleyball — 18 × 9 m (FIVB) : filet au centre, lignes d’attaque à 3 m */
  function drawVolleyball(ctx, b, lc) {
    b = withDims(b, 18, 9);
    var ox = b.ox;
    var oy = b.oy;
    var fw = b.fw;
    var fh = b.fh;
    var lw = b.lw;
    var midX = ox + fw / 2;
    var att = meters(b, 3, 0).x;

    prepStroke(ctx, lc, lw);
    strokeRectPath(ctx, ox, oy, fw, fh);
    ctx.lineWidth = lw * 1.35;
    strokeLine(ctx, midX, oy, midX, oy + fh);
    ctx.lineWidth = lw;
    strokeLine(ctx, midX - att, oy, midX - att, oy + fh);
    strokeLine(ctx, midX + att, oy, midX + att, oy + fh);
  }

  /** Badminton — 13,4 × 6,1 m (BWF) */
  function drawBadminton(ctx, b, lc) {
    b = withDims(b, 13.4, 6.1);
    var ox = b.ox;
    var oy = b.oy;
    var fw = b.fw;
    var fh = b.fh;
    var lw = b.lw;
    var netX = ox + fw / 2;
    var midY = oy + fh / 2;

    var shortD = b.fw * (1.98 / 13.4);
    var longD = meters(b, 0.76, 0).x;
    var alley = meters(b, 0, 0.46).y;
    var singlesTop = oy + alley;
    var singlesBot = oy + fh - alley;

    prepStroke(ctx, lc, lw);
    strokeRectPath(ctx, ox, oy, fw, fh);
    strokeLine(ctx, netX, oy, netX, oy + fh);
    strokeLine(ctx, netX - shortD, singlesTop, netX - shortD, singlesBot);
    strokeLine(ctx, netX + shortD, singlesTop, netX + shortD, singlesBot);
    strokeLine(ctx, ox + longD, oy, ox + longD, oy + fh);
    strokeLine(ctx, ox + fw - longD, oy, ox + fw - longD, oy + fh);
    strokeLine(ctx, ox, singlesTop, ox + fw, singlesTop);
    strokeLine(ctx, ox, singlesBot, ox + fw, singlesBot);
    strokeLine(ctx, ox + longD, midY, netX - shortD, midY);
    strokeLine(ctx, netX + shortD, midY, ox + fw - longD, midY);
  }

  /** Rugby — 100 m en jeu + 10 m d’en-but chaque extrémité, largeur 70 m */
  function drawRugby(ctx, b, lc) {
    b = withDims(b, 120, 70);
    var ox = b.ox;
    var oy = b.oy;
    var fw = b.fw;
    var fh = b.fh;
    var lw = b.lw;
    var inGoal = meters(b, 10, 0).x;
    var play0 = ox + inGoal;
    var play1 = ox + fw - inGoal;
    var playW = play1 - play0;
    var midY = oy + fh / 2;

    prepStroke(ctx, lc, lw);
    strokeRectPath(ctx, ox, oy, fw, fh);
    strokeLine(ctx, play0, oy, play0, oy + fh);
    strokeLine(ctx, play1, oy, play1, oy + fh);
    strokeLine(ctx, play0 + playW / 2, oy, play0 + playW / 2, oy + fh);

    var line22 = playW * (22 / 100);
    var line10 = playW * (10 / 100);
    strokeLine(ctx, play0 + line22, oy, play0 + line22, oy + fh);
    strokeLine(ctx, play1 - line22, oy, play1 - line22, oy + fh);
    strokeLine(ctx, play0 + playW / 2 - line10, oy, play0 + playW / 2 - line10, oy + fh);
    strokeLine(ctx, play0 + playW / 2 + line10, oy, play0 + playW / 2 + line10, oy + fh);

    var touch5 = meters(b, 0, 5).y;
    ctx.setLineDash([lw * 2, lw * 1.5]);
    strokeLine(ctx, play0, oy + touch5, play1, oy + touch5);
    strokeLine(ctx, play0, oy + fh - touch5, play1, oy + fh - touch5);
    ctx.setLineDash([]);
  }

  /** Tennis — 23,77 × 10,97 m (ITF, double) */
  function drawTennis(ctx, b, lc) {
    b = withDims(b, 23.77, 10.97);
    var ox = b.ox;
    var oy = b.oy;
    var fw = b.fw;
    var fh = b.fh;
    var lw = b.lw;
    var netX = ox + fw / 2;
    var midY = oy + fh / 2;

    var svcDepth = b.fw * (6.4 / 23.77);
    var singlesHalf = meters(b, 0, 8.23).y / 2;
    var ySinglesTop = midY - singlesHalf;
    var ySinglesBot = midY + singlesHalf;
    var markLen = meters(b, 0.1, 0).x;

    prepStroke(ctx, lc, lw);
    strokeRectPath(ctx, ox, oy, fw, fh);
    strokeLine(ctx, netX, oy, netX, oy + fh);
    strokeLine(ctx, netX - svcDepth, ySinglesTop, netX - svcDepth, ySinglesBot);
    strokeLine(ctx, netX + svcDepth, ySinglesTop, netX + svcDepth, ySinglesBot);
    strokeLine(ctx, netX - svcDepth, midY, netX, midY);
    strokeLine(ctx, netX, midY, netX + svcDepth, midY);
    strokeLine(ctx, ox, ySinglesTop, ox + fw, ySinglesTop);
    strokeLine(ctx, ox, ySinglesBot, ox + fw, ySinglesBot);

    strokeLine(ctx, ox, midY - markLen / 2, ox, midY + markLen / 2);
    strokeLine(ctx, ox + fw, midY - markLen / 2, ox + fw, midY + markLen / 2);
  }

  /** Tennis de table — 2,74 × 1,525 m */
  function drawTennisTable(ctx, b, lc) {
    b = withDims(b, 2.74, 1.525);
    var tableW = b.fw;
    var tableH = b.fh;
    var ox = b.ox;
    var oy = b.oy;
    var lw = b.lw;
    var midY = oy + tableH / 2;
    var netW = meters(b, 0, 0.015).y * 4;

    prepStroke(ctx, lc, lw);
    strokeRectPath(ctx, ox, oy, tableW, tableH);
    strokeLine(ctx, ox, midY, ox + tableW, midY);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillRect(ox + tableW / 2 - lw, oy - netW, lw * 2, tableH + netW * 2);
  }

  function drawGrid(ctx, W, H, theme) {
    var step = Math.max(24, Math.round(Math.min(W, H) / 24));
    var c = theme === "light" ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.08)";
    ctx.strokeStyle = c;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    for (var x = 0; x <= W; x += step) {
      strokeLine(ctx, x, 0, x, H);
    }
    for (var y = 0; y <= H; y += step) {
      strokeLine(ctx, 0, y, W, y);
    }
  }

  function drawField(ctx, W, H, fieldId, theme, showGrid) {
    var sport = FIELDS[fieldId] ? fieldId : "vide";
    ctx.save();
    ctx.fillStyle = boardFill(theme);
    ctx.fillRect(0, 0, W, H);
    if (sport !== "vide") {
      var ratio = FIELDS[sport].ratio;
      var bounds = courtBounds(W, H, ratio);
      var lc = lineColor(theme);
      if (sport === "football") drawFootball(ctx, bounds, lc);
      else if (sport === "handball") drawHandball(ctx, bounds, lc);
      else if (sport === "basketball") drawBasketball(ctx, bounds, lc);
      else if (sport === "volleyball") drawVolleyball(ctx, bounds, lc);
      else if (sport === "badminton") drawBadminton(ctx, bounds, lc);
      else if (sport === "rugby") drawRugby(ctx, bounds, lc);
      else if (sport === "tennis") drawTennis(ctx, bounds, lc);
      else if (sport === "tennis-table") drawTennisTable(ctx, bounds, lc);
    }
    if (showGrid) drawGrid(ctx, W, H, theme);
    ctx.restore();
  }

  global.TableauNoirFields = {
    FIELDS: FIELDS,
    shouldDrawPortrait: shouldDrawPortrait,
    fieldList: function () {
      return Object.keys(FIELDS).map(function (id) {
        return { id: id, label: FIELDS[id].label };
      });
    },
    drawField: drawField,
  };
})(typeof window !== "undefined" ? window : global);
