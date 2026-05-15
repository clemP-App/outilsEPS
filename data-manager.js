/**
 * Données globales Outils EPS — IndexedDB (outilsEPSDB).
 * Export / import JSON, migration depuis localStorage.
 */
var DataManager = (function () {
  "use strict";

  var DB_NAME = "outilsEPSDB";
  var DB_VERSION = 1;
  var APP_NAME = "OutilsEPS";
  var BACKUP_VERSION = "1.0";
  var BACKUP_FILENAME = "outilsEPS-backup.json";

  var STORE_NAMES = ["classes", "eleves", "dispenses", "championnats", "parametres"];

  var APP_KEY = "outils_eps_app_v1";
  var LEGACY_DISPENSES = "outils_eps_dispenses_v1";
  var LEGACY_CHAMPIONNAT = "outils_eps_championnat_poule_v1";
  var LEGACY_COMPOSITION = "outils_eps_composition_equipes_v1";
  var LEGACY_MASQUER_TERM = "outils_eps_dispenses_masquer_term_v1";
  var LEGACY_HIIT_PRESETS = "outils_eps_hiit_presets_v1";
  var PARAM_HIIT_PRESETS_ID = "timer-hiit-tabata-presets";
  var DB_UNAVAILABLE_MSG = "IndexedDB n'est pas disponible sur cet appareil.";

  var db = null;
  var initPromise = null;
  var dbUnavailable = false;

  function genererId(prefix) {
    var p = prefix || "id";
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return p + "_" + crypto.randomUUID();
    }
    return p + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
  }

  function promisifyRequest(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error || new Error("Erreur IndexedDB"));
      };
    });
  }

  function transaction(storeNames, mode) {
    return db.transaction(storeNames, mode);
  }

  function storeTx(storeName, mode) {
    return transaction([storeName], mode).objectStore(storeName);
  }

  function initDB() {
    if (db) return Promise.resolve(db);
    if (initPromise) return initPromise;

    initPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB n'est pas disponible sur ce navigateur."));
        return;
      }
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        var database = e.target.result;
        STORE_NAMES.forEach(function (name) {
          if (!database.objectStoreNames.contains(name)) {
            database.createObjectStore(name, { keyPath: "id" });
          }
        });
      };
      req.onsuccess = function () {
        db = req.result;
        db.onversionchange = function () {
          db.close();
          db = null;
          initPromise = null;
        };
        resolve(db);
      };
      req.onerror = function () {
        reject(req.error || new Error("Impossible d'ouvrir la base de données."));
      };
    })
      .then(function () {
        return maybeMigrateFromLocalStorage();
      })
      .then(function () {
        return maybeMigrateHiitPresetsFromLocalStorage();
      })
      .then(function () {
        return db;
      })
      .catch(function (err) {
        dbUnavailable = true;
        db = null;
        if (typeof console !== "undefined" && console.warn) {
          console.warn(
            "DataManager : " + (err && err.message ? err.message : "initialisation impossible")
          );
        }
        return null;
      });

    return initPromise;
  }

  function requireDb() {
    if (db) return Promise.resolve(db);
    return initDB().then(function (database) {
      if (!database) {
        return Promise.reject(new Error(DB_UNAVAILABLE_MSG));
      }
      return database;
    });
  }

  function cloneData(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getAll(storeName) {
    return requireDb().then(function () {
      return promisifyRequest(storeTx(storeName, "readonly").getAll());
    });
  }

  function getById(storeName, id) {
    return requireDb().then(function () {
      return promisifyRequest(storeTx(storeName, "readonly").get(id));
    });
  }

  function addItem(storeName, item) {
    if (!item || !item.id) {
      return Promise.reject(new Error("Chaque élément doit avoir un champ id."));
    }
    return requireDb().then(function () {
      return promisifyRequest(storeTx(storeName, "readwrite").add(cloneData(item)));
    });
  }

  function updateItem(storeName, item) {
    if (!item || !item.id) {
      return Promise.reject(new Error("Chaque élément doit avoir un champ id."));
    }
    return requireDb().then(function () {
      return promisifyRequest(storeTx(storeName, "readwrite").put(cloneData(item)));
    });
  }

  function deleteItem(storeName, id) {
    return requireDb().then(function () {
      return promisifyRequest(storeTx(storeName, "readwrite").delete(id));
    });
  }

  function clearStore(storeName) {
    return requireDb().then(function () {
      return promisifyRequest(storeTx(storeName, "readwrite").clear());
    });
  }

  function clearAllData() {
    return requireDb().then(function () {
      return Promise.all(STORE_NAMES.map(clearStore));
    });
  }

  function bulkPut(storeName, items) {
    if (!items || !items.length) return Promise.resolve();
    return requireDb().then(function () {
      return new Promise(function (resolve, reject) {
        var tx = transaction([storeName], "readwrite");
        var store = tx.objectStore(storeName);
        var i;
        for (i = 0; i < items.length; i++) {
          store.put(cloneData(items[i]));
        }
        tx.oncomplete = function () {
          resolve();
        };
        tx.onerror = function () {
          reject(tx.error || new Error("Erreur lors de l'import."));
        };
      });
    });
  }

  function hasAnyData() {
    return Promise.all(STORE_NAMES.map(getAll)).then(function (arrays) {
      return arrays.some(function (arr) {
        return arr.length > 0;
      });
    });
  }

  function readLocalStorage(key) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function detectLegacyLocalStorage() {
    var sources = [];
    var app = readLocalStorage(APP_KEY);
    if (app) sources.push({ type: "app", data: app });
    var disp = readLocalStorage(LEGACY_DISPENSES);
    if (disp && Array.isArray(disp) && disp.length) {
      if (!app || !app.dispenses || !app.dispenses.length) {
        sources.push({ type: "dispenses", data: disp });
      }
    }
    var champ = readLocalStorage(LEGACY_CHAMPIONNAT);
    if (champ && champ.teams) sources.push({ type: "championnat", data: champ });
    var compo = readLocalStorage(LEGACY_COMPOSITION);
    if (compo) sources.push({ type: "composition", data: compo });
    try {
      if (localStorage.getItem(LEGACY_MASQUER_TERM) === "1") {
        sources.push({ type: "masquer_term", data: true });
      }
    } catch (e2) {
      /* ignore */
    }
    return sources;
  }

  function clearLegacyLocalStorage() {
    try {
      localStorage.removeItem(APP_KEY);
      localStorage.removeItem(LEGACY_DISPENSES);
      localStorage.removeItem(LEGACY_CHAMPIONNAT);
      localStorage.removeItem(LEGACY_COMPOSITION);
      localStorage.removeItem(LEGACY_MASQUER_TERM);
      localStorage.removeItem(LEGACY_HIIT_PRESETS);
    } catch (e) {
      /* ignore */
    }
  }

  function maybeMigrateHiitPresetsFromLocalStorage() {
    if (!db) return Promise.resolve(false);
    return promisifyRequest(storeTx("parametres", "readonly").get(PARAM_HIIT_PRESETS_ID)).then(
      function (existing) {
        if (existing && Array.isArray(existing.presets) && existing.presets.length) {
          return false;
        }
        var arr = readLocalStorage(LEGACY_HIIT_PRESETS);
        if (!arr || !Array.isArray(arr) || !arr.length) {
          return false;
        }
        return promisifyRequest(
          storeTx("parametres", "readwrite").put({ id: PARAM_HIIT_PRESETS_ID, presets: arr })
        ).then(function () {
          try {
            localStorage.removeItem(LEGACY_HIIT_PRESETS);
          } catch (e) {
            /* ignore */
          }
          return true;
        });
      }
    );
  }

  function splitLegacyApp(app) {
    var classes = [];
    var eleves = [];
    var dispenses = Array.isArray(app.dispenses) ? app.dispenses : [];
    var championnats = Array.isArray(app.championnats) ? app.championnats : [];
    var parametres = [];

    if (app.parametres && typeof app.parametres === "object" && !Array.isArray(app.parametres)) {
      parametres.push({ id: "legacy-parametres", value: app.parametres });
    } else if (Array.isArray(app.parametres)) {
      parametres = app.parametres.slice();
    }

    (app.classes || []).forEach(function (c) {
      if (!c || !c.id) return;
      classes.push({ id: c.id, nom: (c.nom || "").trim() || "Sans nom" });
      (c.eleves || []).forEach(function (e) {
        if (!e || !e.id) return;
        eleves.push({
          id: e.id,
          classeId: c.id,
          nom: e.nom || "",
          prenom: e.prenom || "",
          sexe: e.sexe || "",
          niveau: e.niveau || "",
          commentaire: e.commentaire || "",
        });
      });
    });

    return { classes: classes, eleves: eleves, dispenses: dispenses, championnats: championnats, parametres: parametres };
  }

  function migrateLegacyPayload(sources) {
    var payload = {
      classes: [],
      eleves: [],
      dispenses: [],
      championnats: [],
      parametres: [],
    };
    var i;
    for (i = 0; i < sources.length; i++) {
      var s = sources[i];
      if (s.type === "app") {
        var split = splitLegacyApp(s.data);
        payload.classes = split.classes;
        payload.eleves = split.eleves;
        payload.dispenses = split.dispenses;
        payload.championnats = split.championnats;
        payload.parametres = split.parametres;
      } else if (s.type === "dispenses") {
        payload.dispenses = s.data;
      } else if (s.type === "championnat") {
        payload.championnats = [
          {
            id: genererId("championnat"),
            nom: "Championnat",
            teams: s.data.teams || [],
            matches: Array.isArray(s.data.matches) ? s.data.matches : [],
          },
        ];
      } else if (s.type === "composition") {
        var compo = s.data;
        payload.parametres.push({
          id: "composition-equipes",
          listeBrute: compo.listeBrute || "",
          players: compo.players || [],
          nbEquipes: compo.nbEquipes || 2,
          assignments: compo.assignments || null,
        });
      } else if (s.type === "masquer_term") {
        payload.parametres.push({ id: "dispenses-masquer-terminees", value: true });
      }
    }
    return payload;
  }

  /**
   * Import atomique : une transaction multi-stores efface puis réécrit tout le payload.
   * En cas d’erreur, IndexedDB annule la transaction (données précédentes conservées).
   */
  function importPayloadToStores(payload) {
    return requireDb().then(function () {
      return new Promise(function (resolve, reject) {
        var tx = transaction(STORE_NAMES, "readwrite");
        var i;
        var j;
        var storeName;
        var store;
        var items;

        tx.onerror = function () {
          reject(tx.error || new Error("Erreur lors de l'import."));
        };
        tx.onabort = function () {
          reject(
            tx.error ||
              new Error("Import annulé : les données précédentes ont été conservées.")
          );
        };
        tx.oncomplete = function () {
          resolve();
        };

        for (i = 0; i < STORE_NAMES.length; i++) {
          tx.objectStore(STORE_NAMES[i]).clear();
        }

        for (i = 0; i < STORE_NAMES.length; i++) {
          storeName = STORE_NAMES[i];
          items = payload[storeName] || [];
          store = tx.objectStore(storeName);
          for (j = 0; j < items.length; j++) {
            store.put(cloneData(items[j]));
          }
        }
      });
    });
  }

  function maybeMigrateFromLocalStorage() {
    var sources = detectLegacyLocalStorage();
    if (!sources.length) return Promise.resolve(false);

    return hasAnyData().then(function (hasData) {
      if (hasData) return false;
      var msg =
        "Des données ont été trouvées dans le stockage précédent (localStorage).\n\n" +
        "Souhaitez-vous les migrer vers IndexedDB ?\n\n" +
        "Les anciennes données ne seront supprimées qu'après une migration réussie.";
      if (!confirm(msg)) return false;
      var payload = migrateLegacyPayload(sources);
      return importPayloadToStores(payload).then(function () {
        clearLegacyLocalStorage();
        return true;
      });
    });
  }

  function validateBackup(data) {
    if (!data || typeof data !== "object") {
      return "Fichier JSON invalide.";
    }
    if (!data.metadata || data.metadata.app !== APP_NAME) {
      return "Ce fichier n'est pas une sauvegarde OutilsEPS.";
    }
    if (!Array.isArray(data.classes)) {
      return "Structure invalide : le champ « classes » est manquant ou incorrect.";
    }
    return validatePayload(normalizeImportData(data));
  }

  function validatePayload(payload) {
    var i;
    for (i = 0; i < STORE_NAMES.length; i++) {
      var key = STORE_NAMES[i];
      var arr = payload[key];
      if (!Array.isArray(arr)) {
        return "Structure invalide : « " + key + " ».";
      }
      var j;
      for (j = 0; j < arr.length; j++) {
        if (!arr[j] || !arr[j].id) {
          return "Donnée invalide : élément sans identifiant dans « " + key + " ».";
        }
        if (key === "eleves" && !arr[j].classeId) {
          return "Donnée invalide : élève sans classe associée.";
        }
      }
    }
    var total =
      payload.classes.length +
      payload.eleves.length +
      payload.dispenses.length +
      payload.championnats.length +
      payload.parametres.length;
    if (total === 0) {
      return "Aucune donnée à importer dans ce fichier.";
    }
    return null;
  }

  function normalizeImportData(data) {
    var classes = (data.classes || []).slice();
    var eleves = (data.eleves || []).slice();
    var parametres = data.parametres;
    if (parametres && !Array.isArray(parametres) && typeof parametres === "object") {
      parametres = [{ id: "legacy-parametres", value: parametres }];
    }
    if (!eleves.length && classes.length) {
      var classesNorm = [];
      classes.forEach(function (c) {
        if (!c || !c.id) return;
        classesNorm.push({ id: c.id, nom: (c.nom || "").trim() || "Sans nom" });
        if (Array.isArray(c.eleves)) {
          c.eleves.forEach(function (e) {
            if (!e || !e.id) return;
            eleves.push({
              id: e.id,
              classeId: c.id,
              nom: e.nom || "",
              prenom: e.prenom || "",
              sexe: e.sexe || "",
              niveau: e.niveau || "",
              commentaire: e.commentaire || "",
            });
          });
        }
      });
      classes = classesNorm;
    } else {
      classes = classes.map(function (c) {
        return { id: c.id, nom: (c.nom || "").trim() || "Sans nom" };
      });
    }
    return {
      classes: classes,
      eleves: eleves,
      dispenses: data.dispenses || [],
      championnats: data.championnats || [],
      parametres: Array.isArray(parametres) ? parametres : [],
    };
  }

  function exportAllData() {
    return Promise.all([
      getAll("classes"),
      getAll("eleves"),
      getAll("dispenses"),
      getAll("championnats"),
      getAll("parametres"),
    ]).then(function (arrays) {
      return {
        metadata: {
          app: APP_NAME,
          version: BACKUP_VERSION,
          exportedAt: new Date().toISOString(),
        },
        classes: arrays[0],
        eleves: arrays[1],
        dispenses: arrays[2],
        championnats: arrays[3],
        parametres: arrays[4],
      };
    });
  }

  function downloadJson(data, filename) {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 0);
  }

  function exportBackupFile() {
    return exportAllData().then(function (data) {
      downloadJson(data, BACKUP_FILENAME);
      return data;
    });
  }

  var IMPORT_CONFIRM_MSG =
    "Attention : cette importation va remplacer toutes les données actuellement enregistrées sur cet appareil. Cette action est irréversible. Voulez-vous continuer ?";

  function importAllData(data, options) {
    options = options || {};
    var err = validateBackup(data);
    if (err) {
      return Promise.reject(new Error(err));
    }
    if (!options.skipConfirm && !confirm(IMPORT_CONFIRM_MSG)) {
      return Promise.resolve({ cancelled: true });
    }
    var payload = normalizeImportData(data);
    return importPayloadToStores(payload).then(function () {
      return { success: true, imported: payload };
    });
  }

  function importBackupFromFile(file, options) {
    if (!file) {
      return Promise.reject(new Error("Aucun fichier sélectionné."));
    }
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          importAllData(data, options)
            .then(resolve)
            .catch(reject);
        } catch (e) {
          reject(new Error("Fichier JSON invalide."));
        }
      };
      reader.onerror = function () {
        reject(new Error("Impossible de lire le fichier."));
      };
      reader.readAsText(file, "UTF-8");
    });
  }

  function pickAndImportBackup(options) {
    return new Promise(function (resolve, reject) {
      var input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json,.json";
      input.style.display = "none";
      document.body.appendChild(input);
      input.addEventListener("change", function () {
        var file = input.files && input.files[0];
        document.body.removeChild(input);
        if (!file) {
          resolve({ cancelled: true, reason: "no-file" });
          return;
        }
        importBackupFromFile(file, options)
          .then(resolve)
          .catch(reject);
      });
      input.click();
    });
  }

  /* --- API métier (async) --- */

  function getElevesByClasseId(classeId) {
    return getAll("eleves").then(function (all) {
      return all.filter(function (e) {
        return e.classeId === classeId;
      });
    });
  }

  function getClasses() {
    return Promise.all([getAll("classes"), getAll("eleves")]).then(function (res) {
      var classes = res[0];
      var eleves = res[1];
      return classes.map(function (c) {
        return {
          id: c.id,
          nom: c.nom,
          eleves: eleves
            .filter(function (e) {
              return e.classeId === c.id;
            })
            .map(function (e) {
              var copy = Object.assign({}, e);
              delete copy.classeId;
              return copy;
            }),
        };
      });
    });
  }

  function getClasseById(id) {
    return Promise.all([getById("classes", id), getElevesByClasseId(id)]).then(function (res) {
      var c = res[0];
      if (!c) return null;
      return {
        id: c.id,
        nom: c.nom,
        eleves: res[1].map(function (e) {
          var copy = Object.assign({}, e);
          delete copy.classeId;
          return copy;
        }),
      };
    });
  }

  function syncElevesForClasse(classeId, eleves) {
    return getElevesByClasseId(classeId).then(function (existing) {
      var existingIds = {};
      var newIds = {};
      var ops = [];
      var i;
      existing.forEach(function (e) {
        existingIds[e.id] = true;
      });
      (eleves || []).forEach(function (e) {
        newIds[e.id] = true;
        var item = {
          id: e.id,
          classeId: classeId,
          nom: e.nom || "",
          prenom: e.prenom || "",
          sexe: e.sexe || "",
          niveau: e.niveau || "",
          commentaire: e.commentaire || "",
        };
        if (existingIds[e.id]) ops.push(updateItem("eleves", item));
        else ops.push(addItem("eleves", item));
      });
      for (i = 0; i < existing.length; i++) {
        if (!newIds[existing[i].id]) ops.push(deleteItem("eleves", existing[i].id));
      }
      return Promise.all(ops);
    });
  }

  function addClasse(classe) {
    var id = classe.id || genererId("classe");
    var item = {
      id: id,
      nom: (classe.nom || "").trim() || "Sans nom",
    };
    return addItem("classes", item).then(function () {
      if (classe.eleves && classe.eleves.length) {
        return syncElevesForClasse(id, classe.eleves).then(function () {
          return id;
        });
      }
      return id;
    });
  }

  function updateClasse(id, patch) {
    return getById("classes", id).then(function (c) {
      if (!c) return false;
      var ops = [];
      if (patch.nom !== undefined) {
        c.nom = (patch.nom || "").trim() || c.nom;
        ops.push(updateItem("classes", c));
      }
      if (patch.eleves !== undefined) {
        ops.push(syncElevesForClasse(id, patch.eleves));
      }
      return Promise.all(ops).then(function () {
        return true;
      });
    });
  }

  function deleteClasse(id) {
    return getElevesByClasseId(id)
      .then(function (eleves) {
        return Promise.all(
          eleves.map(function (e) {
            return deleteItem("eleves", e.id);
          })
        );
      })
      .then(function () {
        return deleteItem("classes", id);
      })
      .then(function () {
        return true;
      })
      .catch(function () {
        return false;
      });
  }

  function getElevesFromClasse(id) {
    return getElevesByClasseId(id).then(function (list) {
      return list.map(function (e) {
        var copy = Object.assign({}, e);
        delete copy.classeId;
        return copy;
      });
    });
  }

  function getDispenses() {
    return getAll("dispenses");
  }

  function saveDispenses(liste) {
    return clearStore("dispenses").then(function () {
      var items = Array.isArray(liste) ? liste : [];
      if (!items.length) return;
      return bulkPut("dispenses", items);
    });
  }

  function getChampionnatActif() {
    return getAll("championnats").then(function (list) {
      if (!list.length) return { teams: [], matches: [] };
      var c = list[0];
      return {
        teams: Array.isArray(c.teams) ? c.teams.slice() : [],
        matches: Array.isArray(c.matches) ? c.matches.slice() : [],
      };
    });
  }

  function saveChampionnatActif(state) {
    return getAll("championnats").then(function (list) {
      var bloc = {
        id: list[0] ? list[0].id : genererId("championnat"),
        nom: list[0] && list[0].nom ? list[0].nom : "Championnat",
        teams: state.teams || [],
        matches: state.matches || [],
      };
      if (list.length) return updateItem("championnats", bloc);
      return addItem("championnats", bloc);
    });
  }

  function getParametre(id) {
    return getById("parametres", id);
  }

  function saveParametre(record) {
    if (!record || !record.id) {
      return Promise.reject(new Error("Paramètre sans id."));
    }
    return getById("parametres", record.id).then(function (existing) {
      if (existing) return updateItem("parametres", record);
      return addItem("parametres", record);
    });
  }

  function deleteParametre(id) {
    return deleteItem("parametres", id);
  }

  var STORAGE_CATEGORIES = [
    {
      id: "classes",
      label: "Classes & niveau",
      stores: ["classes", "eleves"],
    },
    {
      id: "dispenses",
      label: "Dispenses EPS",
      stores: ["dispenses"],
      paramIds: ["dispenses-masquer-terminees"],
    },
    {
      id: "championnat",
      label: "Championnat poule",
      stores: ["championnats"],
    },
    {
      id: "composition",
      label: "Composition équipes",
      paramIds: ["composition-equipes"],
    },
    {
      id: "compteur-bonus",
      label: "Compteur bonus",
      paramIds: ["compteur-bonus-settings"],
    },
    {
      id: "timer-hiit",
      label: "Timer HIIT / Tabata",
      paramIds: [PARAM_HIIT_PRESETS_ID],
    },
  ];

  function jsonByteSize(data) {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch (e) {
      return 0;
    }
  }

  function formatBytes(bytes) {
    var n = Math.max(0, bytes || 0);
    if (n < 1024) return n + " o";
    if (n < 1024 * 1024) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + " Ko";
    return (n / (1024 * 1024)).toFixed(2) + " Mo";
  }

  function countLabelForCategory(cat, storeData) {
    var parts = [];
    (cat.stores || []).forEach(function (store) {
      var n = (storeData[store] || []).length;
      if (store === "classes") {
        parts.push(n + " classe" + (n !== 1 ? "s" : ""));
      } else if (store === "eleves") {
        parts.push(n + " élève" + (n !== 1 ? "s" : ""));
      } else if (store === "dispenses") {
        parts.push(n + " dispense" + (n !== 1 ? "s" : ""));
      } else if (store === "championnats") {
        parts.push(n + " championnat" + (n !== 1 ? "s" : ""));
      }
    });
    (cat.paramIds || []).forEach(function (pid) {
      var entries = (storeData.parametres || []).filter(function (p) {
        return p.id === pid;
      });
      if (!entries.length) return;
      if (pid === PARAM_HIIT_PRESETS_ID) {
        var presets = entries[0].presets;
        var n = Array.isArray(presets) ? presets.length : 0;
        if (n) parts.push(n + " raccourci" + (n !== 1 ? "s" : ""));
      } else {
        parts.push("réglages enregistrés");
      }
    });
    return parts.length ? parts.join(", ") : "Aucune donnée";
  }

  function getStorageBreakdown() {
    return Promise.all(STORE_NAMES.map(getAll)).then(function (arrays) {
      var storeData = {};
      STORE_NAMES.forEach(function (name, i) {
        storeData[name] = arrays[i];
      });

      var assignedParamIds = {};
      STORAGE_CATEGORIES.forEach(function (cat) {
        (cat.paramIds || []).forEach(function (id) {
          assignedParamIds[id] = true;
        });
      });

      var categories = STORAGE_CATEGORIES.map(function (cat) {
        var bytes = 0;
        (cat.stores || []).forEach(function (store) {
          bytes += jsonByteSize(storeData[store] || []);
        });
        (cat.paramIds || []).forEach(function (pid) {
          var found = (storeData.parametres || []).filter(function (p) {
            return p.id === pid;
          });
          if (found.length) bytes += jsonByteSize(found);
        });
        return {
          id: cat.id,
          label: cat.label,
          bytes: bytes,
          countLabel: countLabelForCategory(cat, storeData),
          empty: bytes === 0,
        };
      });

      var otherParams = (storeData.parametres || []).filter(function (p) {
        return p && p.id && !assignedParamIds[p.id];
      });
      if (otherParams.length) {
        categories.push({
          id: "autres",
          label: "Autres données",
          bytes: jsonByteSize(otherParams),
          countLabel: otherParams.length + " entrée" + (otherParams.length !== 1 ? "s" : ""),
          empty: false,
        });
      }

      var totalBytes = categories.reduce(function (sum, c) {
        return sum + c.bytes;
      }, 0);

      return { totalBytes: totalBytes, categories: categories };
    });
  }

  function clearStorageCategory(categoryId) {
    var cat = null;
    var i;
    for (i = 0; i < STORAGE_CATEGORIES.length; i++) {
      if (STORAGE_CATEGORIES[i].id === categoryId) {
        cat = STORAGE_CATEGORIES[i];
        break;
      }
    }
    if (!cat && categoryId !== "autres") {
      return Promise.reject(new Error("Catégorie inconnue."));
    }

    if (categoryId === "autres") {
      return getAll("parametres").then(function (all) {
        var assigned = {};
        STORAGE_CATEGORIES.forEach(function (c) {
          (c.paramIds || []).forEach(function (id) {
            assigned[id] = true;
          });
        });
        var ops = all
          .filter(function (p) {
            return p && p.id && !assigned[p.id];
          })
          .map(function (p) {
            return deleteParametre(p.id);
          });
        return Promise.all(ops);
      });
    }

    var ops = [];
    (cat.stores || []).forEach(function (store) {
      ops.push(clearStore(store));
    });
    if (cat.paramIds && cat.paramIds.length) {
      ops.push(
        getAll("parametres").then(function (all) {
          return Promise.all(
            cat.paramIds
              .filter(function (pid) {
                return all.some(function (p) {
                  return p.id === pid;
                });
              })
              .map(function (pid) {
                return deleteParametre(pid);
              })
          );
        })
      );
    }
    return Promise.all(ops);
  }

  var ready = initDB();

  return {
    DB_NAME: DB_NAME,
    STORE_NAMES: STORE_NAMES,
    PARAM_HIIT_PRESETS_ID: PARAM_HIIT_PRESETS_ID,
    BACKUP_FILENAME: BACKUP_FILENAME,
    IMPORT_CONFIRM_MSG: IMPORT_CONFIRM_MSG,
    ready: ready,
    initDB: initDB,
    genererId: genererId,
    getAll: getAll,
    getById: getById,
    addItem: addItem,
    updateItem: updateItem,
    deleteItem: deleteItem,
    clearStore: clearStore,
    clearAllData: clearAllData,
    exportAllData: exportAllData,
    exportBackupFile: exportBackupFile,
    importAllData: importAllData,
    importBackupFromFile: importBackupFromFile,
    pickAndImportBackup: pickAndImportBackup,
    validateBackup: validateBackup,
    getClasses: getClasses,
    getClasseById: getClasseById,
    addClasse: addClasse,
    updateClasse: updateClasse,
    deleteClasse: deleteClasse,
    getElevesFromClasse: getElevesFromClasse,
    getDispenses: getDispenses,
    saveDispenses: saveDispenses,
    getChampionnatActif: getChampionnatActif,
    saveChampionnatActif: saveChampionnatActif,
    getParametre: getParametre,
    saveParametre: saveParametre,
    deleteParametre: deleteParametre,
    STORAGE_CATEGORIES: STORAGE_CATEGORIES,
    formatBytes: formatBytes,
    getStorageBreakdown: getStorageBreakdown,
    clearStorageCategory: clearStorageCategory,
  };
})();
