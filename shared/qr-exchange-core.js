/**
 * Format d'échange QR OutilsEPS (v1) — encode / decode, checksum, validation.
 * Utilisable en navigateur (QrExchangeCore) et en Node (module.exports).
 */
(function (root, factory) {
  "use strict";
  var api = factory(getLzString());
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.QrExchangeCore = api;
  }

  function getLzString() {
    if (typeof module !== "undefined" && module.exports) {
      try {
        return require("../vendor/lz-string.min.js");
      } catch (e) {
        return null;
      }
    }
    return typeof LZString !== "undefined" ? LZString : null;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this, function (LZ) {
  "use strict";

  var FORMAT_VERSION = 1;
  var PROTOCOL = "outilseps://qr";
  var SUPPORTED_TOOLS = [
    "table-marque",
    "compteur-ptb",
    "compteur-bonus",
    "vitesse-plots",
    "zone-impact",
  ];

  function stableStringify(obj) {
    if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
    if (Array.isArray(obj)) {
      return "[" + obj.map(stableStringify).join(",") + "]";
    }
    var keys = Object.keys(obj).sort();
    return (
      "{" +
      keys
        .map(function (k) {
          return JSON.stringify(k) + ":" + stableStringify(obj[k]);
        })
        .join(",") +
      "}"
    );
  }

  function checksumForBody(body) {
    var str = stableStringify(body);
    var h = 5381;
    var i;
    for (i = 0; i < str.length; i++) {
      h = ((h << 5) + h) ^ str.charCodeAt(i);
    }
    return (h >>> 0).toString(16);
  }

  function genererExportId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return (
      "exp_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 10)
    );
  }

  function trimLabel(value, maxLen) {
    if (value == null) return "";
    var s = String(value).trim();
    if (!s) return "";
    return s.length > (maxLen || 80) ? s.slice(0, maxLen || 80) : s;
  }

  function buildExportRecord(toolId, payload, meta) {
    meta = meta || {};
    if (SUPPORTED_TOOLS.indexOf(toolId) < 0) {
      throw new Error("Outil non pris en charge pour l'export QR : " + toolId);
    }
    if (!payload || typeof payload !== "object") {
      throw new Error("Payload invalide.");
    }
    var body = {
      v: FORMAT_VERSION,
      toolId: toolId,
      exportId: meta.exportId || genererExportId(),
      createdAt: meta.createdAt || new Date().toISOString(),
      payload: payload,
    };
    var classeLabel = trimLabel(meta.classeLabel);
    var groupeLabel = trimLabel(meta.groupeLabel);
    var auteurLabel = trimLabel(meta.auteurLabel);
    if (classeLabel) body.classeLabel = classeLabel;
    if (groupeLabel) body.groupeLabel = groupeLabel;
    if (auteurLabel) body.auteurLabel = auteurLabel;
    body.checksum = checksumForBody({
      v: body.v,
      toolId: body.toolId,
      exportId: body.exportId,
      createdAt: body.createdAt,
      classeLabel: body.classeLabel,
      groupeLabel: body.groupeLabel,
      auteurLabel: body.auteurLabel,
      payload: body.payload,
    });
    return body;
  }

  function validateExportRecord(record) {
    if (!record || typeof record !== "object") {
      return "Données QR invalides.";
    }
    if (record.v !== FORMAT_VERSION) {
      return "Version de format non supportée (v" + record.v + ").";
    }
    if (SUPPORTED_TOOLS.indexOf(record.toolId) < 0) {
      return "Outil inconnu : " + record.toolId;
    }
    if (!record.exportId || typeof record.exportId !== "string") {
      return "Identifiant d'export manquant.";
    }
    if (!record.createdAt || typeof record.createdAt !== "string") {
      return "Date de création manquante.";
    }
    if (!record.payload || typeof record.payload !== "object") {
      return "Payload métier manquant.";
    }
    if (!record.checksum) {
      return "Checksum manquant.";
    }
    var expected = checksumForBody({
      v: record.v,
      toolId: record.toolId,
      exportId: record.exportId,
      createdAt: record.createdAt,
      classeLabel: record.classeLabel,
      groupeLabel: record.groupeLabel,
      auteurLabel: record.auteurLabel,
      payload: record.payload,
    });
    if (record.checksum !== expected) {
      return "Checksum invalide — les données ont peut-être été altérées.";
    }
    return null;
  }

  function compressJson(json) {
    if (!LZ || !LZ.compressToEncodedURIComponent) {
      throw new Error("Compression LZ-String indisponible.");
    }
    return LZ.compressToEncodedURIComponent(json);
  }

  function decompressJson(encoded) {
    if (!LZ || !LZ.decompressFromEncodedURIComponent) {
      throw new Error("Compression LZ-String indisponible.");
    }
    var out = LZ.decompressFromEncodedURIComponent(encoded);
    if (out === null || out === "") {
      throw new Error("Impossible de décompresser les données QR.");
    }
    return out;
  }

  function encodeRecord(record) {
    var err = validateExportRecord(record);
    if (err) throw new Error(err);
    var json = JSON.stringify(record);
    var compressed = compressJson(json);
    return PROTOCOL + "?v=" + FORMAT_VERSION + "&d=" + compressed;
  }

  function parseQrUrl(raw) {
    if (!raw || typeof raw !== "string") {
      return { error: "Contenu QR vide." };
    }
    var text = raw.trim();
    var d = "";
    var v = FORMAT_VERSION;

    if (text.indexOf(PROTOCOL) === 0) {
      var q = text.indexOf("?");
      var query = q >= 0 ? text.slice(q + 1) : "";
      var parts = query.split("&");
      var pi;
      for (pi = 0; pi < parts.length; pi++) {
        var kv = parts[pi].split("=");
        if (kv[0] === "d" && kv.length > 1) {
          d = decodeURIComponent(kv.slice(1).join("="));
        } else if (kv[0] === "v" && kv[1]) {
          v = parseInt(kv[1], 10);
        }
      }
    } else if (text.indexOf("d=") >= 0) {
      var match = text.match(/[?&]d=([^&]+)/);
      if (match) d = decodeURIComponent(match[1]);
    } else {
      d = text;
    }

    if (!d) {
      return { error: "Paramètre de données (d=) introuvable dans le QR." };
    }
    if (v !== FORMAT_VERSION) {
      return { error: "Version de protocole non supportée (v" + v + ")." };
    }

    try {
      var json = decompressJson(d);
      var record = JSON.parse(json);
      var valErr = validateExportRecord(record);
      if (valErr) return { error: valErr };
      return { record: record };
    } catch (e) {
      return { error: e.message || "Décodage QR impossible." };
    }
  }

  function toolTitle(toolId) {
    var titles = {
      "table-marque": "Table de marque",
      "compteur-ptb": "Compteur PTB",
      "compteur-bonus": "Compteur bonus",
      "vitesse-plots": "Vitesse aux plots",
      "zone-impact": "Zone d'impact",
    };
    return titles[toolId] || toolId;
  }

  return {
    FORMAT_VERSION: FORMAT_VERSION,
    PROTOCOL: PROTOCOL,
    SUPPORTED_TOOLS: SUPPORTED_TOOLS,
    stableStringify: stableStringify,
    checksumForBody: checksumForBody,
    genererExportId: genererExportId,
    buildExportRecord: buildExportRecord,
    validateExportRecord: validateExportRecord,
    encodeRecord: encodeRecord,
    parseQrUrl: parseQrUrl,
    toolTitle: toolTitle,
  };
});
