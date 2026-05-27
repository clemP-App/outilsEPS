/**
 * Tableau Noir — schémas tactiques EPS (Canvas, IndexedDB, hors ligne).
 */
(function () {
  "use strict";

  var PARAM_ID = "tableau-noir";
  var SAVE_DEBOUNCE_MS = 900;

  var TOOLS = [
    { id: "pen", label: "Stylo", icon: "✏️" },
    { id: "arrow", label: "Flèche", icon: "➡️" },
    { id: "line", label: "Ligne", icon: "╱" },
    { id: "dash", label: "Pointillé", icon: "┄" },
    { id: "circle", label: "Cercle", icon: "○" },
    { id: "zone", label: "Zone", icon: "▢" },
    { id: "text", label: "Texte", icon: "T" },
    { id: "eraser", label: "Gomme", icon: "⌫" },
    { id: "hand", label: "Main", icon: "✋" },
  ];

  var LEGACY_BUILTIN_IDS = {
    "fb-442": true,
    "vb-rotation": true,
    "hb-60": true,
  };

  var COLORS = [
    "#ffeb3b",
    "#ffffff",
    "#ff5252",
    "#4fc3f7",
    "#69f0ae",
    "#ff9800",
    "#e040fb",
    "#212121",
  ];

  var LEGACY_TEAM_COLOR = { a: "#e53935", b: "#1e88e5", n: "#fdd835" };

  function parseHex(hex) {
    if (!hex) return null;
    var h = String(hex).replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length !== 6) return null;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }

  function mixHex(hex, other, t) {
    var a = parseHex(hex);
    var b = parseHex(other);
    if (!a || !b) return hex || "#ffffff";
    t = t == null ? 0.5 : t;
    function ch(x, y) {
      return Math.round(x + (y - x) * t);
    }
    function pad(n) {
      var s = n.toString(16);
      return s.length < 2 ? "0" + s : s;
    }
    return "#" + pad(ch(a.r, b.r)) + pad(ch(a.g, b.g)) + pad(ch(a.b, b.b));
  }

  function textOnFill(hex) {
    var c = parseHex(hex);
    if (!c) return "#ffffff";
    var lum = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
    return lum > 0.55 ? "#212121" : "#ffffff";
  }

  function normalizePlayer(pl) {
    if (!pl) return pl;
    if (!pl.color && pl.team) pl.color = LEGACY_TEAM_COLOR[pl.team] || LEGACY_TEAM_COLOR.n;
    if (!pl.color) pl.color = PALETTE[0];
    return pl;
  }

  function normalizePlayers(list) {
    return (list || []).map(function (p) {
      return normalizePlayer(Object.assign({}, p));
    });
  }

  function normalizePlayersInState() {
    state.players = normalizePlayers(state.players);
  }

  var appEl = document.getElementById("tn-app");
  var canvasEl = document.getElementById("tn-canvas");
  var viewportEl = document.getElementById("tn-viewport");
  var sidebarEl = document.getElementById("tn-sidebar");
  var toastEl = document.getElementById("tn-toast");
  var msgEl = document.getElementById("tn-msg");

  var ctx = canvasEl && canvasEl.getContext("2d");

  var state = freshBoardState();
  var sessions = { activeId: null, list: [] };
  var userLibrary = [];
  var undoStack = [];
  var redoStack = [];
  var saveTimer = null;
  var animFrame = null;
  var animPlaying = false;
  /** Index de l’image clé affichée (-1 = aucune) */
  var animCursor = -1;
  var ANIM_SPEEDS = [
    { label: "×0.5", ms: 1500 },
    { label: "×1", ms: 750 },
    { label: "×1.5", ms: 500 },
    { label: "×2", ms: 375 },
  ];
  var animSpeedIndex = 1;

  var pointer = {
    active: false,
    id: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    mode: null,
  };

  var panZoom = { scale: 1, tx: 0, ty: 0 };
  var ZOOM_MIN = 0.5;
  var ZOOM_MAX = 3;
  var ZOOM_STEP = 1.15;
  var pinch = { active: false, dist: 0, scale0: 1 };

  function freshBoardState(name) {
    return {
      id: uid("board"),
      name: name || "Tableau 1",
      field: "vide",
      theme: "dark",
      grid: false,
      tool: "pen",
      color: COLORS[0],
      lineWidth: 4,
      shapes: [],
      players: [],
      equipment: [],
      animations: [],
    };
  }

  /** Séance 1 + Tableau 1 (premier lancement ou données absentes). */
  function ensureDefaultWorkspace() {
    state = freshBoardState("Tableau 1");
    var sessId = uid("sess");
    var board = cloneBoard(state);
    sessions = {
      activeId: sessId,
      list: [{ id: sessId, name: "Séance 1", boards: [board] }],
    };
    animCursor = -1;
  }

  function uid(p) {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return (p || "id") + "_" + crypto.randomUUID().slice(0, 8);
    }
    return (p || "id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function showToast(text, ms) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.hidden = false;
    toastEl.classList.add("is-visible");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      toastEl.classList.remove("is-visible");
      setTimeout(function () {
        toastEl.hidden = true;
      }, 280);
    }, ms || 2200);
  }

  function showMsg(text, isError) {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.hidden = !text;
    msgEl.classList.toggle("msg-error", !!isError);
    msgEl.classList.toggle("msg-ok", !isError);
  }

  function canvasSize() {
    if (!viewportEl) return { w: 800, h: 600 };
    var r = viewportEl.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    return {
      w: Math.max(320, Math.floor(r.width * dpr)),
      h: Math.max(240, Math.floor(r.height * dpr)),
      dpr: dpr,
    };
  }

  function resizeCanvas() {
    if (!canvasEl || !viewportEl) return;
    var sz = canvasSize();
    canvasEl.width = sz.w;
    canvasEl.height = sz.h;
    canvasEl.style.width = "100%";
    canvasEl.style.height = "100%";
    render();
  }

  function canvasLayout(W, H) {
    var portrait =
      typeof TableauNoirFields !== "undefined" &&
      TableauNoirFields.shouldDrawPortrait(W, H, state.field);
    if (portrait) {
      return { portrait: true, dW: H, dH: W };
    }
    return { portrait: false, dW: W, dH: H };
  }

  function normFromClient(clientX, clientY) {
    var rect = canvasEl.getBoundingClientRect();
    var W = canvasEl.width;
    var H = canvasEl.height;
    var x = ((clientX - rect.left) / rect.width) * W;
    var y = ((clientY - rect.top) / rect.height) * H;
    var layout = canvasLayout(W, H);
    if (layout.portrait) {
      var xd = y;
      var yd = W - x;
      return { x: xd, y: yd, nx: xd / H, ny: yd / W };
    }
    return { x: x, y: y, nx: x / W, ny: y / H };
  }

  function pushUndo() {
    undoStack.push(snapshot());
    if (undoStack.length > 60) undoStack.shift();
    redoStack = [];
    updateUndoButtons();
    scheduleSave();
  }

  function snapshot() {
    return JSON.stringify({
      shapes: state.shapes,
      players: state.players,
      equipment: state.equipment,
      field: state.field,
      theme: state.theme,
      grid: state.grid,
      animations: state.animations,
    });
  }

  function restoreSnapshot(json) {
    try {
      var s = JSON.parse(json);
      state.shapes = s.shapes || [];
      state.players = normalizePlayers(s.players || []);
      state.equipment = s.equipment || [];
      if (s.field) state.field = s.field;
      if (s.theme) state.theme = s.theme;
      if (typeof s.grid === "boolean") state.grid = s.grid;
      state.animations = normalizeAnimationsList(s.animations || []);
      animCursor = state.animations.length ? Math.min(animCursor, state.animations.length - 1) : -1;
      if (animCursor < 0 && state.animations.length) animCursor = 0;
      if (animCursor >= 0) applyAnimFrame(animCursor);
      else {
        applyTheme();
        syncUiFromState();
        render();
      }
    } catch (e) {}
  }

  function undo() {
    if (!undoStack.length) return;
    redoStack.push(snapshot());
    restoreSnapshot(undoStack.pop());
    updateUndoButtons();
    scheduleSave();
  }

  function redo() {
    if (!redoStack.length) return;
    undoStack.push(snapshot());
    restoreSnapshot(redoStack.pop());
    updateUndoButtons();
    scheduleSave();
  }

  function updateUndoButtons() {
    var u = document.getElementById("tn-undo");
    var r = document.getElementById("tn-redo");
    if (u) u.disabled = !undoStack.length;
    if (r) r.disabled = !redoStack.length;
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persistAll, SAVE_DEBOUNCE_MS);
  }

  function persistAll() {
    var payload = {
      version: 1,
      updatedAt: new Date().toISOString(),
      sessions: sessions,
      userLibrary: userLibrary,
      lastBoard: state,
    };
    try {
      localStorage.setItem("outils_eps_tableau_noir_v1", JSON.stringify(payload));
    } catch (e) {}
    if (typeof DataManager !== "undefined" && DataManager.saveParametre) {
      DataManager.init()
        .then(function () {
          return DataManager.saveParametre({ id: PARAM_ID, value: payload });
        })
        .catch(function () {});
    }
  }

  function loadPersisted() {
    function apply(payload) {
      if (!payload) return;
      if (payload.sessions) {
        sessions = payload.sessions;
        sessions.list.forEach(function (sess) {
          (sess.boards || []).forEach(function (board) {
            board.players = normalizePlayers(board.players);
            board.animations = normalizeAnimationsList(board.animations);
          });
        });
      }
      if (payload.userLibrary) {
        userLibrary = payload.userLibrary
          .filter(function (item) {
            return item && item.id && !LEGACY_BUILTIN_IDS[item.id];
          })
          .map(function (item) {
            if (!item.kind) {
              item.kind =
                item.animations && item.animations.length >= 2 ? "clip" : "schema";
            }
            if (item.animations) {
              item.animations = normalizeAnimationsList(item.animations);
            }
            return item;
          });
      }
      if (payload.lastBoard) {
        state = Object.assign(freshBoardState(), payload.lastBoard);
        state.id = state.id || uid("board");
        if (!state.field) state.field = "vide";
        state.animations = normalizeAnimationsList(state.animations);
        animCursor = state.animations.length ? 0 : -1;
        normalizePlayersInState();
      }
      if (!sessions.list.length) {
        var sessId = uid("sess");
        var board = cloneBoard(state);
        if (!board.name) board.name = "Tableau 1";
        sessions = {
          activeId: sessId,
          list: [{ id: sessId, name: "Séance 1", boards: [board] }],
        };
      }
      applyTheme();
      syncUiFromState();
      renderLibrary();
      renderSessionsList();
    }
    var local = null;
    try {
      local = JSON.parse(localStorage.getItem("outils_eps_tableau_noir_v1") || "null");
    } catch (e) {}
    if (local) {
      apply(local);
      return Promise.resolve();
    }
    if (typeof DataManager === "undefined" || !DataManager.getParametre) {
      ensureDefaultWorkspace();
      return Promise.resolve();
    }
    return DataManager.init()
      .then(function () {
        return DataManager.getParametre(PARAM_ID);
      })
      .then(function (rec) {
        if (rec && rec.value) {
          apply(rec.value);
        } else {
          ensureDefaultWorkspace();
        }
        if (!sessions.list.length) {
          ensureDefaultWorkspace();
        }
      })
      .catch(function () {
        ensureDefaultWorkspace();
      });
  }

  function cloneBoard(b) {
    return JSON.parse(JSON.stringify(b));
  }

  function activeSession() {
    return sessions.list.filter(function (s) {
      return s.id === sessions.activeId;
    })[0];
  }

  function syncBoardToSession() {
    if (hasClipFrames()) syncCurrentAnimFrame();
    var sess = activeSession();
    if (!sess) return;
    var idx = -1;
    for (var i = 0; i < sess.boards.length; i++) {
      if (sess.boards[i].id === state.id) idx = i;
    }
    if (idx < 0) sess.boards.push(cloneBoard(state));
    else sess.boards[idx] = cloneBoard(state);
  }

  function applyTheme() {
    if (!appEl) return;
    appEl.setAttribute("data-theme", state.theme === "light" ? "light" : "dark");
    document.documentElement.style.setProperty(
      "--tn-theme-color",
      state.theme === "light" ? "#f0f2f5" : "#0d1117"
    );
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", state.theme === "light" ? "#f0f2f5" : "#0d1117");
  }

  function selectHandTool() {
    state.tool = "hand";
    syncUiFromState();
    syncCanvasCursor(false);
  }

  function syncUiFromState() {
    document.querySelectorAll("[data-tn-field]").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-tn-field") === state.field);
    });
    document.querySelectorAll("[data-tn-tool]").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-tn-tool") === state.tool);
    });
    document.querySelectorAll("[data-tn-color]").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-tn-color") === state.color);
    });
    var gridBtn = document.getElementById("tn-toggle-grid");
    if (gridBtn) gridBtn.classList.toggle("is-active", state.grid);
    var themeBtn = document.getElementById("tn-toggle-theme");
    if (themeBtn) {
      themeBtn.textContent = state.theme === "light" ? "🌙 Mode sombre" : "☀️ Mode clair";
    }
    syncAnimUi();
    var lw = document.getElementById("tn-line-width");
    if (lw) lw.value = String(state.lineWidth);
    var title = document.getElementById("tn-board-title");
    if (title) title.textContent = state.name || "Tableau";
    syncCanvasCursor(false);
  }

  function isDrawTool(tool) {
    return (
      tool === "pen" ||
      tool === "line" ||
      tool === "dash" ||
      tool === "arrow" ||
      tool === "circle" ||
      tool === "zone"
    );
  }

  function syncCanvasCursor(grabbing) {
    if (!viewportEl) return;
    viewportEl.classList.remove("tn-cursor-hand", "tn-cursor-grabbing", "tn-cursor-draw", "tn-cursor-erase");
    if (canvasEl) {
      canvasEl.classList.remove("tn-cursor-hand", "tn-cursor-grabbing", "tn-cursor-draw", "tn-cursor-erase");
    }
    if (state.tool === "hand") {
      viewportEl.classList.add(grabbing ? "tn-cursor-grabbing" : "tn-cursor-hand");
      if (canvasEl) canvasEl.classList.add(grabbing ? "tn-cursor-grabbing" : "tn-cursor-hand");
    } else if (state.tool === "eraser") {
      viewportEl.classList.add("tn-cursor-erase");
      if (canvasEl) canvasEl.classList.add("tn-cursor-erase");
    } else if (isDrawTool(state.tool)) {
      viewportEl.classList.add("tn-cursor-draw");
      if (canvasEl) canvasEl.classList.add("tn-cursor-draw");
    }
  }

  function beginDrag(picked, nx, ny) {
    pushUndo();
    syncCanvasCursor(true);
    if (picked.kind === "player") {
      pointer.mode = "drag-player";
      pointer.target = picked.ref;
    } else if (picked.kind === "equipment") {
      pointer.mode = "drag-equip";
      pointer.target = picked.ref;
    } else {
      pointer.mode = "drag-shape";
      pointer.shapeIndex = picked.index;
    }
    pointer.lastX = nx;
    pointer.lastY = ny;
  }

  function beginPan(e) {
    pointer.mode = "pan";
    pointer.startX = e.clientX;
    pointer.startY = e.clientY;
    pointer.lastX = panZoom.tx;
    pointer.lastY = panZoom.ty;
    syncCanvasCursor(true);
  }

  function beginPanPending(e) {
    pointer.mode = "pan-pending";
    pointer.panArmX = e.clientX;
    pointer.panArmY = e.clientY;
    pointer.startX = e.clientX;
    pointer.startY = e.clientY;
    pointer.lastX = panZoom.tx;
    pointer.lastY = panZoom.ty;
  }

  function isCanvasInteractionTarget(target) {
    return target === canvasEl || target === viewportEl;
  }

  function render() {
    if (!ctx || !canvasEl) return;
    var W = canvasEl.width;
    var H = canvasEl.height;
    var layout = canvasLayout(W, H);
    var dW = layout.dW;
    var dH = layout.dH;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (layout.portrait) {
      ctx.translate(W / 2, H / 2);
      ctx.rotate(Math.PI / 2);
      ctx.translate(-dW / 2, -dH / 2);
    }
    if (typeof TableauNoirFields !== "undefined") {
      TableauNoirFields.drawField(ctx, dW, dH, state.field, state.theme, state.grid);
    }
    state.shapes.forEach(function (sh) {
      drawShape(ctx, sh, dW, dH);
    });
    state.equipment.forEach(function (eq) {
      drawEquipment(ctx, eq, dW, dH);
    });
    state.players.forEach(function (pl) {
      drawPlayer(ctx, pl, dW, dH, layout);
    });
    if (pointer.active && pointer.preview) {
      drawShape(ctx, pointer.preview, dW, dH, true);
    }
    ctx.restore();
  }

  function drawShape(ctx, sh, W, H, preview) {
    var col = sh.color || state.color;
    var w = sh.width || state.lineWidth;
    ctx.strokeStyle = col;
    ctx.fillStyle = sh.fill || col;
    ctx.lineWidth = w;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (sh.type === "path") {
      var pts = sh.points || [];
      if (pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0][0] * W, pts[0][1] * H);
      for (var i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i][0] * W, pts[i][1] * H);
      }
      ctx.stroke();
    } else if (sh.type === "line" || sh.type === "dash" || sh.type === "arrow") {
      if (sh.type === "dash") ctx.setLineDash([10, 8]);
      var x1 = sh.x1 * W;
      var y1 = sh.y1 * H;
      var x2 = sh.x2 * W;
      var y2 = sh.y2 * H;
      var ex = x2;
      var ey = y2;
      if (sh.type === "arrow") {
        var tip = arrowTipEnd(x1, y1, x2, y2, w);
        ex = tip.x;
        ey = tip.y;
      }
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.setLineDash([]);
      if (sh.type === "arrow") drawArrowHead(ctx, x1, y1, x2, y2, w);
    } else if (sh.type === "circle") {
      var cx = sh.cx * W;
      var cy = sh.cy * H;
      var r = sh.r * Math.min(W, H);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      if (sh.fillZone) {
        ctx.globalAlpha = sh.opacity != null ? sh.opacity : 0.28;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.stroke();
    } else if (sh.type === "zone") {
      var pts2 = zoneCorners(sh);
      if (pts2.length < 3) return;
      ctx.beginPath();
      ctx.moveTo(pts2[0][0] * W, pts2[0][1] * H);
      for (var j = 1; j < pts2.length; j++) {
        ctx.lineTo(pts2[j][0] * W, pts2[j][1] * H);
      }
      ctx.closePath();
      ctx.globalAlpha = sh.opacity != null ? sh.opacity : 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
    } else if (sh.type === "text") {
      var fs = Math.max(14, (sh.size || 18) * (Math.min(W, H) / 500));
      ctx.font = "bold " + fs + "px system-ui, sans-serif";
      ctx.fillStyle = col;
      ctx.fillText(sh.text || "", sh.x * W, sh.y * H);
    }
    if (preview) {
      ctx.globalAlpha = 0.75;
    }
  }

  function arrowTipEnd(x1, y1, x2, y2, lineWidth) {
    var ang = Math.atan2(y2 - y1, x2 - x1);
    var len = Math.max(lineWidth * 3.2, 12);
    return { x: x2 - len * Math.cos(ang), y: y2 - len * Math.sin(ang) };
  }

  function drawArrowHead(ctx, x1, y1, x2, y2, lineWidth) {
    var ang = Math.atan2(y2 - y1, x2 - x1);
    var len = Math.max(lineWidth * 3.2, 12);
    var halfW = Math.max(lineWidth * 1.15, 5);
    var bx = x2 - len * Math.cos(ang);
    var by = y2 - len * Math.sin(ang);
    var px = -Math.sin(ang);
    var py = Math.cos(ang);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(bx + px * halfW, by + py * halfW);
    ctx.lineTo(bx - px * halfW, by - py * halfW);
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  }

  function cloneJson(data) {
    return JSON.parse(JSON.stringify(data != null ? data : []));
  }

  function cloneShapes(list) {
    return cloneJson(list);
  }

  function hasClipFrames() {
    return state.animations && state.animations.length > 0;
  }

  /** @param {unknown} frame */
  function normalizeAnimFrame(frame) {
    if (Array.isArray(frame)) {
      return { players: frame, shapes: [], equipment: [] };
    }
    return {
      players: frame.players || [],
      shapes: cloneShapes(frame.shapes),
      equipment: cloneShapes(frame.equipment),
    };
  }

  function normalizeAnimationsList(list) {
    return (list || []).map(normalizeAnimFrame);
  }

  function isLegacyPlayerFrame(players) {
    if (!players || !players.length) return false;
    var p = players[0];
    return p.color == null && p.number == null && p.r == null;
  }

  function applyPlayersFromFrame(framePlayers) {
    state.players = normalizePlayers(
      (framePlayers || []).map(function (p) {
        return Object.assign({ r: 0.028 }, p);
      })
    );
  }

  function captureAnimFrameData() {
    return {
      players: cloneJson(state.players),
      equipment: cloneJson(state.equipment),
      shapes: cloneShapes(state.shapes),
    };
  }

  function applyAnimFrame(index) {
    if (index < 0 || index >= state.animations.length) return;
    var frame = normalizeAnimFrame(state.animations[index]);
    state.animations[index] = frame;
    if (isLegacyPlayerFrame(frame.players)) {
      frame.players.forEach(function (f) {
        var pl = state.players.filter(function (p) {
          return p.id === f.id;
        })[0];
        if (pl) {
          pl.x = f.x;
          pl.y = f.y;
        }
      });
    } else {
      applyPlayersFromFrame(frame.players);
    }
    state.equipment = cloneShapes(frame.equipment);
    state.shapes = cloneShapes(frame.shapes);
    animCursor = index;
    syncAnimUi();
    render();
  }

  function syncCurrentAnimFrame() {
    if (animCursor < 0 || animCursor >= state.animations.length) return;
    state.animations[animCursor] = captureAnimFrameData();
  }

  function animPlaybackMs() {
    return ANIM_SPEEDS[animSpeedIndex].ms;
  }

  function syncAnimSpeedBtn() {
    var btn = document.getElementById("tn-anim-speed");
    if (btn) btn.textContent = "⏩ Vitesse " + ANIM_SPEEDS[animSpeedIndex].label;
  }

  function syncAnimUi() {
    var ind = document.getElementById("tn-anim-indicator");
    var prev = document.getElementById("tn-anim-prev");
    var next = document.getElementById("tn-anim-next");
    var del = document.getElementById("tn-anim-delete-frame");
    var upd = document.getElementById("tn-anim-update");
    var n = state.animations.length;
    if (ind) {
      if (n === 0) ind.textContent = "Aucune image clé";
      else ind.textContent = "Image " + (animCursor + 1) + " / " + n;
    }
    if (prev) prev.disabled = n === 0 || animCursor <= 0;
    if (next) next.disabled = n === 0 || animCursor >= n - 1;
    if (del) del.disabled = n === 0 || animCursor < 0;
    if (upd) upd.disabled = n === 0 || animCursor < 0;
    syncAnimSpeedBtn();
  }

  function pickAt(nx, ny) {
    var pl = hitPlayer(nx, ny);
    if (pl) return { kind: "player", ref: pl };
    var eq = hitEquipment(nx, ny);
    if (eq) return { kind: "equipment", ref: eq };
    for (var i = state.shapes.length - 1; i >= 0; i--) {
      if (shapeNearPoint(state.shapes[i], nx, ny)) {
        return { kind: "shape", index: i };
      }
    }
    return null;
  }

  function moveShape(sh, dx, dy) {
    if (sh.type === "path") {
      (sh.points || []).forEach(function (p) {
        p[0] += dx;
        p[1] += dy;
      });
    } else if (sh.type === "line" || sh.type === "dash" || sh.type === "arrow") {
      sh.x1 += dx;
      sh.y1 += dy;
      sh.x2 += dx;
      sh.y2 += dy;
    } else if (sh.type === "circle") {
      sh.cx += dx;
      sh.cy += dy;
    } else if (sh.type === "text") {
      sh.x += dx;
      sh.y += dy;
    } else if (sh.type === "zone") {
      (sh.points || []).forEach(function (p) {
        p[0] += dx;
        p[1] += dy;
      });
    }
  }

  function boardHasContent() {
    return (
      state.shapes.length > 0 ||
      state.players.length > 0 ||
      state.equipment.length > 0 ||
      state.animations.length > 0
    );
  }

  function drawPlayer(ctx, pl, W, H, layout) {
    var fill = pl.color || PALETTE[0];
    var stroke = mixHex(fill, "#ffffff", 0.45);
    var r = (pl.r || 0.028) * Math.min(W, H);
    var x = pl.x * W;
    var y = pl.y * H;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(2, r * 0.15);
    ctx.stroke();
    var fs = Math.max(11, r * 0.95);
    var num = String(pl.number != null ? pl.number : "");
    ctx.save();
    ctx.translate(x, y);
    if (layout && layout.portrait) {
      ctx.rotate(-Math.PI / 2);
    }
    ctx.font = "bold " + fs + "px system-ui, sans-serif";
    ctx.fillStyle = textOnFill(fill);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(num, 0, 0);
    ctx.restore();
  }

  function equipColor(eq) {
    if (eq.color) return eq.color;
    return COLORS[0];
  }

  function equipStroke(fill) {
    return mixHex(fill, "#212121", 0.45);
  }

  function drawEquipment(ctx, eq, W, H) {
    var x = eq.x * W;
    var y = eq.y * H;
    var s = (eq.size || 0.022) * Math.min(W, H);
    var fill = equipColor(eq);
    var stroke = equipStroke(fill);

    if (eq.kind === "ball") {
      ctx.beginPath();
      ctx.arc(x, y, s, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = state.theme === "light" ? "#333333" : "#212121";
      ctx.lineWidth = Math.max(1.5, s * 0.14);
      ctx.stroke();
    } else if (eq.kind === "hoop") {
      ctx.beginPath();
      ctx.arc(x, y, s * 1.15, 0, Math.PI * 2);
      ctx.strokeStyle = fill;
      ctx.lineWidth = Math.max(3, s * 0.32);
      ctx.stroke();
    } else if (eq.kind === "cone-orange") {
      var ch = s * 1.2;
      var cw = s * 0.92;
      ctx.beginPath();
      ctx.moveTo(x, y - ch);
      ctx.lineTo(x - cw, y + ch * 0.78);
      ctx.lineTo(x + cw, y + ch * 0.78);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(1, s * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, y + ch * 0.78, cw * 0.82, s * 0.22, 0, 0, Math.PI * 2);
      ctx.strokeStyle = stroke;
      ctx.stroke();
    } else {
      var r = s * 0.7;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Math.max(1.5, s * 0.14);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
      ctx.fillStyle = textOnFill(fill) === "#ffffff" ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.2)";
      ctx.fill();
    }
  }

  function hitPlayer(nx, ny) {
    var best = null;
    var bestD = 1e9;
    state.players.forEach(function (pl) {
      var d = Math.hypot(pl.x - nx, pl.y - ny);
      var r = pl.r || 0.028;
      if (d < r * 1.4 * touchHitScale() && d < bestD) {
        best = pl;
        bestD = d;
      }
    });
    return best;
  }

  function hitEquipment(nx, ny) {
    var best = null;
    var bestD = 1e9;
    state.equipment.forEach(function (eq) {
      var d = Math.hypot(eq.x - nx, eq.y - ny);
      var r = eq.size || 0.022;
      if (d < r * 2 * touchHitScale() && d < bestD) {
        best = eq;
        bestD = d;
      }
    });
    return best;
  }

  function eraseAt(nx, ny) {
    var pl = hitPlayer(nx, ny);
    if (pl) {
      state.players = state.players.filter(function (p) {
        return p !== pl;
      });
      return true;
    }
    var eq = hitEquipment(nx, ny);
    if (eq) {
      state.equipment = state.equipment.filter(function (e) {
        return e !== eq;
      });
      return true;
    }
    var before = state.shapes.length;
    state.shapes = state.shapes.filter(function (sh) {
      return !shapeNearPoint(sh, nx, ny);
    });
    return state.shapes.length !== before;
  }

  function pointInPolygon(nx, ny, points) {
    var inside = false;
    var pts = points || [];
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i][0];
      var yi = pts[i][1];
      var xj = pts[j][0];
      var yj = pts[j][1];
      if ((yi > ny) !== (yj > ny) && nx < ((xj - xi) * (ny - yi)) / (yj - yi + 1e-12) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  /** Points d’une zone rectangulaire (4 coins), même si seulement 2 points stockés. */
  function zoneCorners(sh) {
    var pts = sh.points || [];
    if (pts.length >= 4) return pts;
    if (pts.length < 2) return pts;
    var p0 = pts[0];
    var p1 = pts[1];
    return [p0, [p1[0], p0[1]], p1, [p0[0], p1[1]]];
  }

  function isCoarsePointer() {
    return window.matchMedia("(pointer: coarse)").matches;
  }

  function touchHitScale() {
    return isCoarsePointer() ? 2.4 : 1;
  }

  function hitTolerancePx() {
    if (!canvasEl) return 18;
    var base = Math.max(18, Math.min(canvasEl.width, canvasEl.height) * 0.028);
    return base * touchHitScale();
  }

  function closeSidebarMobile() {
    if (!sidebarEl || window.innerWidth >= 900) return;
    sidebarEl.classList.remove("is-open");
    syncMenuBtn();
    var backdrop = document.getElementById("tn-sidebar-backdrop");
    if (backdrop) backdrop.hidden = true;
  }

  function shapeNearPoint(sh, nx, ny, tol) {
    if (!canvasEl) return false;
    var W = canvasEl.width;
    var H = canvasEl.height;
    var minDim = Math.min(W, H);
    var tolPx = tol != null ? tol * minDim : hitTolerancePx();
    var tolNorm = tolPx / minDim;
    var px = nx * W;
    var py = ny * H;

    if (sh.type === "circle") {
      var cx = sh.cx * W;
      var cy = sh.cy * H;
      var rPx = (sh.r || 0) * minDim;
      if (rPx < 1) return false;
      var dPx = Math.hypot(px - cx, py - cy);
      return dPx <= rPx + tolPx;
    }

    if (sh.type === "zone") {
      var corners = zoneCorners(sh);
      if (corners.length < 3) return false;
      if (pointInPolygon(nx, ny, corners)) return true;
      for (var zi = 0; zi < corners.length; zi++) {
        var zj = (zi + 1) % corners.length;
        if (
          distSeg(nx, ny, corners[zi][0], corners[zi][1], corners[zj][0], corners[zj][1]) < tolNorm * 1.8
        ) {
          return true;
        }
      }
      return false;
    }

    if (sh.type === "path") {
      var pts = sh.points || [];
      if (pts.length < 2) {
        return pts.some(function (p) {
          return Math.hypot(p[0] - nx, p[1] - ny) < tolNorm;
        });
      }
      for (var i = 1; i < pts.length; i++) {
        if (distSeg(nx, ny, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]) < tolNorm) {
          return true;
        }
      }
      return false;
    }
    if (sh.type === "line" || sh.type === "dash" || sh.type === "arrow") {
      return distSeg(nx, ny, sh.x1, sh.y1, sh.x2, sh.y2) < tolNorm;
    }
    if (sh.type === "text") {
      return Math.hypot(nx - sh.x, ny - sh.y) < tolNorm * 2.5;
    }
    return false;
  }

  function distSeg(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy + 1e-9);
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  function onPointerDown(e) {
    if (!isCanvasInteractionTarget(e.target)) return;
    closeSidebarMobile();
    e.preventDefault();
    var p = normFromClient(e.clientX, e.clientY);
    pointer.active = true;
    pointer.id = e.pointerId;
    pointer.startX = p.nx;
    pointer.startY = p.ny;
    pointer.lastX = p.nx;
    pointer.lastY = p.ny;
    pointer.preview = null;

    if (state.tool === "hand") {
      var pickedHand = pickAt(p.nx, p.ny);
      if (pickedHand) {
        beginDrag(pickedHand, p.nx, p.ny);
      } else {
        beginPanPending(e);
      }
      try {
        canvasEl.setPointerCapture(e.pointerId);
      } catch (err) {}
      return;
    }

    if (state.tool === "eraser") {
      pushUndo();
      pointer.mode = "erase";
      pointer.eraseChanged = eraseAt(p.nx, p.ny);
      if (pointer.eraseChanged) render();
      try {
        canvasEl.setPointerCapture(e.pointerId);
      } catch (err) {}
      return;
    }

    if (state.tool === "text") {
      var txt = window.prompt("Texte à afficher :", "");
      if (txt) {
        pushUndo();
        state.shapes.push({
          type: "text",
          x: p.nx,
          y: p.ny,
          text: txt.slice(0, 120),
          color: state.color,
          size: state.lineWidth * 4,
        });
        if (hasClipFrames()) syncCurrentAnimFrame();
        render();
        scheduleSave();
      }
      pointer.active = false;
      return;
    }

    pointer.mode = "draw";
    if (state.tool === "pen") {
      pointer.currentPath = { type: "path", points: [[p.nx, p.ny]], color: state.color, width: state.lineWidth };
      pointer.preview = pointer.currentPath;
    } else if (state.tool === "zone") {
      pointer.zonePoints = [[p.nx, p.ny]];
      pointer.preview = { type: "zone", points: pointer.zonePoints, color: state.color, fill: state.color, opacity: 0.35 };
    } else {
      pointer.preview = {
        type: state.tool === "dash" ? "dash" : state.tool === "arrow" ? "arrow" : state.tool === "circle" ? "circle" : "line",
        x1: p.nx,
        y1: p.ny,
        x2: p.nx,
        y2: p.ny,
        cx: p.nx,
        cy: p.ny,
        r: 0,
        color: state.color,
        width: state.lineWidth,
        fillZone: state.tool === "circle",
      };
    }
    try {
      canvasEl.setPointerCapture(e.pointerId);
    } catch (err) {}
  }

  function onPointerMove(e) {
    if (pointer.mode === "pan-pending" && pointer.active) {
      if (Math.hypot(e.clientX - pointer.panArmX, e.clientY - pointer.panArmY) > 12) {
        pointer.mode = "pan";
        syncCanvasCursor(true);
      } else {
        return;
      }
    }
    if (pointer.mode === "pan" && pointer.active) {
      panZoom.tx = pointer.lastX + (e.clientX - pointer.startX);
      panZoom.ty = pointer.lastY + (e.clientY - pointer.startY);
      applyPanZoomTransform();
      return;
    }
    if (!pointer.active || e.pointerId !== pointer.id) return;
    var p = normFromClient(e.clientX, e.clientY);

    if (pointer.mode === "drag-player" && pointer.target) {
      pointer.target.x = p.nx;
      pointer.target.y = p.ny;
      render();
      return;
    }
    if (pointer.mode === "drag-equip" && pointer.target) {
      pointer.target.x = p.nx;
      pointer.target.y = p.ny;
      render();
      return;
    }
    if (pointer.mode === "drag-shape" && pointer.shapeIndex >= 0) {
      var sh = state.shapes[pointer.shapeIndex];
      if (sh) {
        moveShape(sh, p.nx - pointer.lastX, p.ny - pointer.lastY);
        pointer.lastX = p.nx;
        pointer.lastY = p.ny;
        render();
      }
      return;
    }
    if (pointer.mode === "erase") {
      if (eraseAt(p.nx, p.ny)) {
        pointer.eraseChanged = true;
        render();
      }
      return;
    }
    if (pointer.mode !== "draw") return;

    if (state.tool === "pen" && pointer.currentPath) {
      pointer.currentPath.points.push([p.nx, p.ny]);
      pointer.preview = pointer.currentPath;
    } else if (state.tool === "zone" && pointer.zonePoints) {
      if (pointer.zonePoints.length === 1) {
        pointer.zonePoints[1] = [p.nx, p.ny];
      } else {
        pointer.zonePoints[1] = [p.nx, p.ny];
      }
      pointer.preview = { type: "zone", points: pointer.zonePoints.slice(), color: state.color, fill: state.color, opacity: 0.35 };
    } else if (pointer.preview) {
      pointer.preview.x2 = p.nx;
      pointer.preview.y2 = p.ny;
      if (state.tool === "circle") {
        pointer.preview.r = Math.hypot(p.nx - pointer.startX, p.ny - pointer.startY);
      }
    }
    render();
  }

  function onPointerUp(e) {
    if (pointer.mode === "pan" || pointer.mode === "pan-pending") {
      pointer.active = false;
      pointer.mode = null;
      syncCanvasCursor(false);
      return;
    }
    if (!pointer.active) return;
    pointer.active = false;
    try {
      canvasEl.releasePointerCapture(e.pointerId);
    } catch (err) {}

    if (pointer.mode === "drag-player" || pointer.mode === "drag-equip" || pointer.mode === "drag-shape") {
      if (hasClipFrames()) syncCurrentAnimFrame();
      syncBoardToSession();
      scheduleSave();
      pointer.mode = null;
      syncCanvasCursor(false);
      return;
    }
    if (pointer.mode === "erase") {
      if (pointer.eraseChanged) {
        syncCurrentAnimFrame();
        syncBoardToSession();
        scheduleSave();
      }
      pointer.mode = null;
      syncCanvasCursor(false);
      return;
    }
    syncCanvasCursor(false);
    if (pointer.mode !== "draw") return;

    var committed = null;
    if (state.tool === "pen" && pointer.currentPath && pointer.currentPath.points.length > 1) {
      committed = pointer.currentPath;
    } else if (state.tool === "zone" && pointer.zonePoints && pointer.zonePoints.length >= 2) {
      var p0 = pointer.zonePoints[0];
      var p1 = pointer.zonePoints[1] || p0;
      committed = {
        type: "zone",
        points: [p0, [p1[0], p0[1]], p1, [p0[0], p1[1]]],
        color: state.color,
        fill: state.color,
        opacity: 0.35,
      };
    } else if (pointer.preview) {
      var pr = pointer.preview;
      if (state.tool === "circle" && pr.r > 0.008) committed = { type: "circle", cx: pr.cx, cy: pr.cy, r: pr.r, color: pr.color, width: pr.width, fillZone: true, opacity: 0.3 };
      else if (pr.x1 != null && Math.hypot(pr.x2 - pr.x1, pr.y2 - pr.y1) > 0.008) {
        committed = {
          type: state.tool === "dash" ? "dash" : state.tool === "arrow" ? "arrow" : "line",
          x1: pr.x1,
          y1: pr.y1,
          x2: pr.x2,
          y2: pr.y2,
          color: pr.color,
          width: pr.width,
        };
      }
    }
    pointer.preview = null;
    pointer.currentPath = null;
    pointer.zonePoints = null;
    if (committed) {
      pushUndo();
      state.shapes.push(committed);
      syncCurrentAnimFrame();
    }
    render();
    syncBoardToSession();
    scheduleSave();
    pointer.mode = null;
  }

  function addPlayer() {
    var color = state.color || PALETTE[0];
    pushUndo();
    var n = state.players.filter(function (p) {
      return p.color === color;
    }).length;
    state.players.push({
      id: uid("pl"),
      color: color,
      number: n + 1,
      x: 0.3 + Math.random() * 0.4,
      y: 0.3 + Math.random() * 0.4,
      r: 0.028,
    });
    render();
    syncBoardToSession();
    if (hasClipFrames()) syncCurrentAnimFrame();
    selectHandTool();
  }

  function addEquipment(kind) {
    pushUndo();
    state.equipment.push({
      id: uid("eq"),
      kind: kind,
      color: state.color || COLORS[0],
      x: 0.5,
      y: 0.5,
      size: 0.022,
    });
    render();
    syncBoardToSession();
    if (hasClipFrames()) syncCurrentAnimFrame();
    closeSidebarMobile();
    selectHandTool();
  }

  function clearBoard() {
    if (!window.confirm("Effacer tout le dessin, les joueurs et le matériel ?")) return;
    pushUndo();
    state.shapes = [];
    state.players = [];
    state.equipment = [];
    state.animations = [];
    animCursor = -1;
    syncAnimUi();
    render();
    syncBoardToSession();
  }

  function newBoard() {
    if (boardHasContent()) {
      var enregistrer = window.confirm(
        "Ce tableau contient des éléments.\n\nEnregistrer dans la bibliothèque avant de créer un nouveau tableau ?"
      );
      if (enregistrer) {
        var ok = saveToUserLibrary("schema", false);
        if (!ok) return;
      } else if (!window.confirm("Créer un nouveau tableau sans enregistrer l’actuel ?")) {
        return;
      }
    }
    syncBoardToSession();
    var sess = activeSession();
    var num = sess ? sess.boards.length + 1 : 1;
    state = freshBoardState("Tableau " + num);
    animCursor = -1;
    undoStack = [];
    redoStack = [];
    updateUndoButtons();
    if (sess) {
      sess.boards.push(cloneBoard(state));
    }
    applyTheme();
    syncUiFromState();
    render();
    renderSessionsList();
    scheduleSave();
    showToast("Nouveau tableau créé");
  }

  function duplicateBoard() {
    syncBoardToSession();
    var copy = cloneBoard(state);
    copy.id = uid("board");
    copy.name = (state.name || "Tableau") + " (copie)";
    var sess = activeSession();
    if (sess) sess.boards.push(copy);
    state = copy;
    undoStack = [];
    redoStack = [];
    updateUndoButtons();
    syncUiFromState();
    renderSessionsList();
    scheduleSave();
    showToast("Tableau dupliqué");
  }

  function loadLibraryItem(item) {
    pushUndo();
    state.field = item.field || state.field;
    state.players = normalizePlayers(
      (item.players || []).map(function (p) {
        return Object.assign({ id: uid("pl"), r: 0.028 }, p);
      })
    );
    state.equipment = JSON.parse(JSON.stringify(item.equipment || []));
    if (item.kind === "clip" && item.animations && item.animations.length) {
      state.animations = normalizeAnimationsList(JSON.parse(JSON.stringify(item.animations)));
      if (item.shapes && item.shapes.length) {
        var anyFrameShapes = state.animations.some(function (fr) {
          return fr.shapes && fr.shapes.length;
        });
        if (!anyFrameShapes) state.animations[0].shapes = cloneShapes(item.shapes);
        if (item.players && item.players.length && !state.animations[0].players.length) {
          state.animations[0].players = cloneJson(item.players);
        }
        if (item.equipment && item.equipment.length && !state.animations[0].equipment.length) {
          state.animations[0].equipment = cloneJson(item.equipment);
        }
      }
      animCursor = 0;
      applyAnimFrame(0);
    } else {
      state.shapes = cloneShapes(item.shapes);
      state.animations = [];
      animCursor = -1;
    }
    applyTheme();
    syncUiFromState();
    render();
    syncBoardToSession();
    var label = item.kind === "clip" ? "Clip" : "Schéma";
    showToast(label + " chargé : " + item.name);
  }

  function deleteLibraryItem(id) {
    userLibrary = userLibrary.filter(function (item) {
      return item.id !== id;
    });
    renderLibrary();
    scheduleSave();
    showToast("Élément supprimé de la bibliothèque");
  }

  /**
   * @param {'schema'|'clip'} kind
   * @param {boolean} [silentPrompt] true si le nom vient d’être demandé ailleurs
   * @returns {boolean} false si annulé
   */
  function saveToUserLibrary(kind, silentPrompt) {
    if (kind === "clip" && state.animations.length < 2) {
      showToast("Enregistrez au moins 2 images clés pour un clip", 3000);
      return false;
    }
    syncCurrentAnimFrame();
    var defaultName =
      kind === "clip"
        ? (state.name || "Mon clip") + " (clip)"
        : state.name || "Mon schéma";
    var promptLabel =
      kind === "clip"
        ? "Nom du clip à enregistrer dans la bibliothèque :"
        : "Nom du schéma à enregistrer dans la bibliothèque :";
    var name = silentPrompt ? defaultName : window.prompt(promptLabel, defaultName);
    if (name === null) return false;
    name = (name || defaultName).trim();
    if (!name) return false;
    var snap = cloneBoard(state);
    var entry = {
      id: uid("lib"),
      kind: kind,
      name: name,
      field: state.field,
      shapes: snap.shapes,
      players: snap.players,
      equipment: snap.equipment,
    };
    if (kind === "clip") {
      entry.animations = JSON.parse(JSON.stringify(state.animations));
    }
    userLibrary.push(entry);
    renderLibrary();
    scheduleSave();
    showToast(
      (kind === "clip" ? "Clip" : "Schéma") + " « " + name + " » enregistré — cliquez son nom dans la liste pour le rouvrir",
      3200
    );
    return true;
  }

  function renderLibrary() {
    var list = document.getElementById("tn-library-list");
    var empty = document.getElementById("tn-library-empty");
    if (!list) return;
    list.innerHTML = "";
    if (empty) empty.hidden = userLibrary.length > 0;
    userLibrary.forEach(function (item) {
      var li = document.createElement("li");
      li.className = "tn-library__row";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tn-lib-item";
      var prefix = item.kind === "clip" ? "🎬 Clip — " : "★ Schéma — ";
      btn.textContent = prefix + item.name;
      btn.addEventListener("click", function () {
        loadLibraryItem(item);
      });
      var del = document.createElement("button");
      del.type = "button";
      del.className = "tn-lib-del";
      del.setAttribute("aria-label", "Supprimer " + item.name);
      del.textContent = "×";
      del.addEventListener("click", function (ev) {
        ev.stopPropagation();
        if (window.confirm('Supprimer « ' + item.name + ' » de la bibliothèque ?')) {
          deleteLibraryItem(item.id);
        }
      });
      li.appendChild(btn);
      li.appendChild(del);
      list.appendChild(li);
    });
  }

  function renderSessionsList() {
    var sel = document.getElementById("tn-session-select");
    var boards = document.getElementById("tn-board-select");
    if (!sel) return;
    sel.innerHTML = "";
    sessions.list.forEach(function (s) {
      var opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.name;
      if (s.id === sessions.activeId) opt.selected = true;
      sel.appendChild(opt);
    });
    if (!boards) return;
    boards.innerHTML = "";
    var sess = activeSession();
    if (!sess) return;
    sess.boards.forEach(function (b) {
      var opt2 = document.createElement("option");
      opt2.value = b.id;
      opt2.textContent = b.name;
      if (b.id === state.id) opt2.selected = true;
      boards.appendChild(opt2);
    });
  }

  function exportPng() {
    if (!canvasEl) return;
    try {
      var url = canvasEl.toDataURL("image/png");
      var a = document.createElement("a");
      a.href = url;
      a.download = (state.name || "tableau-noir").replace(/\s+/g, "-") + ".png";
      a.click();
      showToast("PNG exporté");
    } catch (e) {
      showMsg("Export PNG impossible.", true);
    }
  }

  function exportPdf() {
    var JSPDF = window.jspdf && window.jspdf.jsPDF;
    if (!JSPDF || !canvasEl) {
      showMsg("Export PDF indisponible (jsPDF).", true);
      return;
    }
    try {
      var data = canvasEl.toDataURL("image/jpeg", 0.92);
      var pdf = new JSPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      var pw = pdf.internal.pageSize.getWidth();
      var ph = pdf.internal.pageSize.getHeight();
      var margin = 8;
      var iw = pw - margin * 2;
      var ih = (canvasEl.height / canvasEl.width) * iw;
      if (ih > ph - margin * 2) {
        ih = ph - margin * 2;
        iw = (canvasEl.width / canvasEl.height) * ih;
      }
      pdf.setFontSize(14);
      pdf.text(state.name || "Tableau Noir", margin, margin + 4);
      pdf.addImage(data, "JPEG", margin, margin + 8, iw, ih);
      pdf.save((state.name || "tableau-noir").replace(/\s+/g, "-") + ".pdf");
      showToast("PDF exporté");
    } catch (e) {
      showMsg("Erreur export PDF.", true);
    }
  }

  function shareBoard() {
    if (!canvasEl) return;
    canvasEl.toBlob(function (blob) {
      if (!blob) return;
      var file = new File([blob], "tableau-noir.png", { type: "image/png" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ title: state.name, files: [file] }).catch(function () {});
      } else {
        exportPng();
        showToast("Partage : fichier PNG téléchargé");
      }
    }, "image/png");
  }

  function clampZoom(scale) {
    return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, scale));
  }

  function syncZoomUi() {
    var label = document.getElementById("tn-zoom-level");
    if (label) label.textContent = Math.round(panZoom.scale * 100) + "%";
  }

  function zoomBy(factor) {
    panZoom.scale = clampZoom(panZoom.scale * factor);
    applyPanZoomTransform();
    syncZoomUi();
  }

  function zoomIn() {
    zoomBy(ZOOM_STEP);
  }

  function zoomOut() {
    zoomBy(1 / ZOOM_STEP);
  }

  function runTopbarAction(action) {
    var overflow = document.getElementById("tn-topbar-overflow");
    if (overflow) overflow.removeAttribute("open");
    if (action === "new") newBoard();
    else if (action === "png") exportPng();
    else if (action === "pdf") exportPdf();
    else if (action === "share") shareBoard();
  }

  function applyPanZoomTransform() {
    if (!viewportEl) return;
    viewportEl.style.transform = "translate(" + panZoom.tx + "px," + panZoom.ty + "px) scale(" + panZoom.scale + ")";
  }

  function resetView() {
    panZoom = { scale: 1, tx: 0, ty: 0 };
    applyPanZoomTransform();
    syncZoomUi();
  }

  function captureAnimKeyframe() {
    if (!state.players.length) {
      showToast("Ajoutez des joueurs avant de capturer une image clé");
      return;
    }
    pushUndo();
    syncCurrentAnimFrame();
    state.animations.push(captureAnimFrameData());
    animCursor = state.animations.length - 1;
    syncAnimUi();
    render();
    scheduleSave();
    showToast("Image " + state.animations.length + " capturée");
  }

  function updateAnimKeyframe() {
    if (!state.players.length) {
      showToast("Ajoutez des joueurs sur le terrain");
      return;
    }
    if (animCursor < 0 || animCursor >= state.animations.length) {
      showToast("Sélectionnez une image avec ‹ › ou capturez-en une nouvelle");
      return;
    }
    pushUndo();
    state.animations[animCursor] = captureAnimFrameData();
    syncAnimUi();
    scheduleSave();
    showToast("Image " + (animCursor + 1) + " mise à jour");
  }

  function cycleAnimSpeed() {
    animSpeedIndex = (animSpeedIndex + 1) % ANIM_SPEEDS.length;
    syncAnimSpeedBtn();
    showToast("Vitesse de lecture : " + ANIM_SPEEDS[animSpeedIndex].label);
  }

  function goAnimFrame(delta) {
    if (!state.animations.length) return;
    var next = animCursor < 0 ? 0 : animCursor + delta;
    next = Math.max(0, Math.min(state.animations.length - 1, next));
    syncCurrentAnimFrame();
    applyAnimFrame(next);
    scheduleSave();
  }

  function deleteAnimFrame() {
    if (animCursor < 0 || !state.animations.length) return;
    if (!window.confirm("Supprimer l’image " + (animCursor + 1) + " ?")) return;
    pushUndo();
    state.animations.splice(animCursor, 1);
    if (!state.animations.length) animCursor = -1;
    else animCursor = Math.min(animCursor, state.animations.length - 1);
    if (animCursor >= 0) applyAnimFrame(animCursor);
    else {
      syncAnimUi();
      render();
    }
    scheduleSave();
    showToast("Image supprimée");
  }

  function playAnimation() {
    if (state.animations.length < 2) {
      showToast("Capturez au moins 2 images clés pour lire le clip");
      return;
    }
    if (animPlaying) {
      stopAnimation();
      return;
    }
    syncCurrentAnimFrame();
    animPlaying = true;
    var playBtn = document.getElementById("tn-anim-play");
    if (playBtn) playBtn.textContent = "⏹️ Arrêter";
    var idx = animCursor >= 0 ? animCursor : 0;
    function step() {
      applyAnimFrame(idx);
      idx = (idx + 1) % state.animations.length;
      if (animPlaying) animFrame = setTimeout(step, animPlaybackMs());
    }
    step();
    showToast("Lecture du clip");
  }

  function stopAnimation() {
    animPlaying = false;
    clearTimeout(animFrame);
    var playBtn = document.getElementById("tn-anim-play");
    if (playBtn) playBtn.textContent = "▶️ Lire le clip";
  }

  function syncMenuBtn() {
    var menuBtn = document.getElementById("tn-menu");
    if (!menuBtn || !sidebarEl) return;
    var open = sidebarEl.classList.contains("is-open");
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    menuBtn.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
  }

  function toggleSidebar() {
    if (!sidebarEl) return;
    sidebarEl.classList.toggle("is-open");
    var backdrop = document.getElementById("tn-sidebar-backdrop");
    if (backdrop) backdrop.hidden = !sidebarEl.classList.contains("is-open");
    syncMenuBtn();
  }

  function bindUi() {
    document.getElementById("tn-undo").addEventListener("click", undo);
    document.getElementById("tn-redo").addEventListener("click", redo);
    document.querySelectorAll("[data-tn-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        runTopbarAction(btn.getAttribute("data-tn-action"));
      });
    });
    document.getElementById("tn-zoom-in").addEventListener("click", zoomIn);
    document.getElementById("tn-zoom-out").addEventListener("click", zoomOut);
    document.getElementById("tn-zoom-reset").addEventListener("click", resetView);
    document.getElementById("tn-clear").addEventListener("click", clearBoard);
    document.getElementById("tn-duplicate").addEventListener("click", duplicateBoard);
    document.getElementById("tn-menu").addEventListener("click", toggleSidebar);
    document.getElementById("tn-close-sidebar").addEventListener("click", toggleSidebar);
    var backdrop = document.getElementById("tn-sidebar-backdrop");
    if (backdrop) {
      backdrop.addEventListener("click", function () {
        if (sidebarEl) sidebarEl.classList.remove("is-open");
        backdrop.hidden = true;
        syncMenuBtn();
      });
    }
    document.getElementById("tn-save-lib-schema").addEventListener("click", function () {
      saveToUserLibrary("schema", false);
    });
    document.getElementById("tn-save-lib-clip").addEventListener("click", function () {
      saveToUserLibrary("clip", false);
    });
    document.getElementById("tn-anim-capture").addEventListener("click", captureAnimKeyframe);
    document.getElementById("tn-anim-update").addEventListener("click", updateAnimKeyframe);
    document.getElementById("tn-anim-speed").addEventListener("click", cycleAnimSpeed);
    document.getElementById("tn-anim-prev").addEventListener("click", function () {
      goAnimFrame(-1);
    });
    document.getElementById("tn-anim-next").addEventListener("click", function () {
      goAnimFrame(1);
    });
    document.getElementById("tn-anim-delete-frame").addEventListener("click", deleteAnimFrame);
    document.getElementById("tn-anim-play").addEventListener("click", playAnimation);
    document.getElementById("tn-reset-view").addEventListener("click", resetView);

    document.getElementById("tn-toggle-grid").addEventListener("click", function () {
      state.grid = !state.grid;
      syncUiFromState();
      render();
      scheduleSave();
    });
    document.getElementById("tn-toggle-theme").addEventListener("click", function () {
      state.theme = state.theme === "light" ? "dark" : "light";
      applyTheme();
      syncUiFromState();
      render();
      scheduleSave();
    });

    var lw = document.getElementById("tn-line-width");
    if (lw) {
      lw.addEventListener("input", function () {
        state.lineWidth = parseInt(lw.value, 10) || 4;
      });
    }

    document.querySelectorAll("[data-tn-field]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.field = btn.getAttribute("data-tn-field");
        syncUiFromState();
        render();
        scheduleSave();
      });
    });
    document.querySelectorAll("[data-tn-tool]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.tool = btn.getAttribute("data-tn-tool");
        syncUiFromState();
        closeSidebarMobile();
      });
    });
    document.querySelectorAll("[data-tn-color]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.color = btn.getAttribute("data-tn-color");
        syncUiFromState();
      });
    });
    document.querySelectorAll("[data-tn-place]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var kind = btn.getAttribute("data-tn-place");
        if (kind === "player") addPlayer();
        else addEquipment(kind);
        closeSidebarMobile();
      });
    });

    var sessSel = document.getElementById("tn-session-select");
    if (sessSel) {
      sessSel.addEventListener("change", function () {
        syncBoardToSession();
        sessions.activeId = sessSel.value;
        var sess = activeSession();
        if (sess && sess.boards[0]) {
          loadBoardState(sess.boards[0]);
          renderSessionsList();
        }
        scheduleSave();
      });
    }
    var boardSel = document.getElementById("tn-board-select");
    if (boardSel) {
      boardSel.addEventListener("change", function () {
        syncBoardToSession();
        var sess = activeSession();
        if (!sess) return;
        var b = sess.boards.filter(function (x) {
          return x.id === boardSel.value;
        })[0];
        if (b) {
          loadBoardState(b);
        }
        scheduleSave();
      });
    }
    document.getElementById("tn-new-session").addEventListener("click", function () {
      var name = window.prompt("Nom de la séance :", "Séance " + (sessions.list.length + 1));
      if (!name) return;
      syncBoardToSession();
      var s = { id: uid("sess"), name: name, boards: [cloneBoard(state)] };
      sessions.list.push(s);
      sessions.activeId = s.id;
      renderSessionsList();
      scheduleSave();
      showToast("Séance créée");
    });

    var pointerOpts = { passive: false };
    viewportEl.addEventListener("pointerdown", onPointerDown, pointerOpts);
    viewportEl.addEventListener("pointermove", onPointerMove, pointerOpts);
    viewportEl.addEventListener("pointerup", onPointerUp, pointerOpts);
    viewportEl.addEventListener("pointercancel", onPointerUp, pointerOpts);

    viewportEl.addEventListener(
      "wheel",
      function (e) {
        if (!e.ctrlKey) return;
        e.preventDefault();
        zoomBy(e.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP);
      },
      { passive: false }
    );

    viewportEl.addEventListener(
      "touchstart",
      function (e) {
        if (e.touches.length !== 2) return;
        pinch.active = true;
        pinch.dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        pinch.scale0 = panZoom.scale;
      },
      { passive: true }
    );
    viewportEl.addEventListener(
      "touchmove",
      function (e) {
        if (!pinch.active || e.touches.length !== 2) return;
        e.preventDefault();
        var d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        panZoom.scale = clampZoom(pinch.scale0 * (d / pinch.dist));
        applyPanZoomTransform();
        syncZoomUi();
      },
      { passive: false }
    );
    viewportEl.addEventListener("touchend", function () {
      pinch.active = false;
    });

    window.addEventListener("resize", resizeCanvas);
  }

  function init() {
    if (!canvasEl) return;
    bindUi();
    loadPersisted().then(function () {
      if (!sessions.list.length) {
        ensureDefaultWorkspace();
      }
      applyTheme();
      syncUiFromState();
      if (animCursor >= 0) applyAnimFrame(animCursor);
      else render();
      renderLibrary();
      renderSessionsList();
      resizeCanvas();
      syncZoomUi();
      updateUndoButtons();
    });
  }

  function loadBoardState(board) {
    state = cloneBoard(board);
    state.animations = normalizeAnimationsList(state.animations);
    normalizePlayersInState();
    animCursor = state.animations.length ? 0 : -1;
    undoStack = [];
    redoStack = [];
    updateUndoButtons();
    applyTheme();
    syncUiFromState();
    if (animCursor >= 0) applyAnimFrame(animCursor);
    else render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
