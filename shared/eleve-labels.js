/**
 * Persistance locale des libellés (noms, classe, groupe) pour outils élèves.
 */
var EleveLabels = (function () {
  "use strict";

  var META_KEY = "outils_eps_qr_meta_v1";

  function readMeta() {
    try {
      var raw = localStorage.getItem(META_KEY);
      if (!raw) return {};
      var data = JSON.parse(raw);
      return data && typeof data === "object" ? data : {};
    } catch (e) {
      return {};
    }
  }

  function writeMeta(data) {
    try {
      localStorage.setItem(META_KEY, JSON.stringify(data));
    } catch (e) {
      /* quota */
    }
  }

  function toolKey(toolId) {
    return "tool_" + toolId;
  }

  function getToolLabels(toolId) {
    var all = readMeta();
    var t = all[toolKey(toolId)];
    return t && typeof t === "object" ? Object.assign({}, t) : {};
  }

  function saveToolLabels(toolId, patch) {
    var all = readMeta();
    var key = toolKey(toolId);
    var cur = all[key] && typeof all[key] === "object" ? all[key] : {};
    var next = Object.assign({}, cur, patch || {});
    Object.keys(next).forEach(function (k) {
      if (next[k] == null || next[k] === "") delete next[k];
    });
    all[key] = next;
    writeMeta(all);
    return next;
  }

  function getMetaFields() {
    var all = readMeta();
    return {
      classeLabel: all.classeLabel || "",
      groupeLabel: all.groupeLabel || "",
      auteurLabel: all.auteurLabel || "",
    };
  }

  function saveMetaFields(fields) {
    var all = readMeta();
    if (fields.classeLabel != null) all.classeLabel = String(fields.classeLabel).trim();
    if (fields.groupeLabel != null) all.groupeLabel = String(fields.groupeLabel).trim();
    if (fields.auteurLabel != null) all.auteurLabel = String(fields.auteurLabel).trim();
    writeMeta(all);
    return getMetaFields();
  }

  return {
    getToolLabels: getToolLabels,
    saveToolLabels: saveToolLabels,
    getMetaFields: getMetaFields,
    saveMetaFields: saveMetaFields,
  };
})();
