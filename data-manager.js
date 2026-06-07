/**
 * Données globales Outils EPS — IndexedDB (outilsEPSDB).
 * Export / import JSON, migration depuis localStorage.
 */
var DataManager = (function () {
  "use strict";

  var DB_NAME = "outilsEPSDB";
  var DB_VERSION = 7;
  var APP_NAME = "OutilsEPS";
  var BACKUP_VERSION = "1.0";
  var BACKUP_FILENAME = "outilsEPS-backup.json";
  var PYRAMIDE_VICTOIRES_ID = "pyramide-victoires";
  var SC =
    typeof SessionsCore !== "undefined"
      ? SessionsCore
      : {
          SESSION_TOOLS: {
            COMPOSITION: "composition-equipes",
            TOURNOI: "tournoi-elimination",
            PYRAMIDE: "pyramide-victoires",
            CHAMPIONNAT: "championnat-poule",
            ORIENTATION: "course-orientation",
            DEFI_ATP: "defi-atp",
            PHOTO_FINISH: "photo-finish",
            RELAIS: "relais",
          },
          courseOrientationDataId: function (sid) {
            return "course-orientation__" + sid;
          },
          defiAtpDataId: function (sid) {
            return "defi-atp__" + sid;
          },
          MIGRATION_FLAG_ID: "migration-sessions-v1",
          LEGACY_TOURNOI_LS_KEY: "outils_eps_tournoi_elimination_v1",
          isSessionTool: function () {
            return true;
          },
          activeSessionParamId: function (t) {
            return "active-session__" + t;
          },
          compositionDataId: function (sid) {
            return "composition-equipes__" + sid;
          },
          legacySessionName: function (t) {
            return "Legacy — " + t;
          },
          validateSession: function () {
            return null;
          },
          normalizeSession: function (r) {
            return r;
          },
          filterSessionsForTool: function (list, toolId) {
            return (list || []).filter(function (s) {
              return s && s.toolId === toolId && !s.archived;
            });
          },
        };

  var STORE_NAMES = [
    "classes",
    "eleves",
    "dispenses",
    "oublisMateriel",
    "radarPerfs",
    "sessions",
    "championnats",
    "tournoisElimination",
    "parametres",
    "importsEleves",
    "tableauxSuivi",
  ];

  var INDEXED_STORES = ["championnats", "tournoisElimination"];

  var APP_KEY = "outils_eps_app_v1";
  var LEGACY_DISPENSES = "outils_eps_dispenses_v1";
  var LEGACY_CHAMPIONNAT = "outils_eps_championnat_poule_v1";
  var LEGACY_COMPOSITION = "outils_eps_composition_equipes_v1";
  var LEGACY_MASQUER_TERM = "outils_eps_dispenses_masquer_term_v1";
  var LEGACY_HIIT_PRESETS = "outils_eps_hiit_presets_v1";
  var PARAM_HIIT_PRESETS_ID = "timer-hiit-tabata-presets";
  var DB_UNAVAILABLE_MSG = "IndexedDB n'est pas disponible sur cet appareil.";
  var LOCAL_STORAGE_BACKUP_PREFIXES = ["outils_eps", "outilseps", "OutilsEPS"];

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

  var STORAGE_QUOTA_WARN_RATIO = 0.75;
  var STORAGE_QUOTA_CRITICAL_RATIO = 0.9;
  var STORAGE_QUOTA_NOTICE_RATIO = 0.5;

  function isQuotaExceededError(err) {
    if (!err) return false;
    return err.name === "QuotaExceededError" || err.code === 22;
  }

  function storageErrorMessage(err) {
    if (isQuotaExceededError(err)) {
      return (
        "Espace de stockage insuffisant sur cet appareil. Ouvrez « Sauvegarde et restauration » " +
        "pour supprimer des données (par ex. imports élèves) ou exportez une sauvegarde puis libérez de la place."
      );
    }
    if (err && err.message) return err.message;
    return "Erreur IndexedDB";
  }

  function wrapDbError(err) {
    return new Error(storageErrorMessage(err));
  }

  function promisifyRequest(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(wrapDbError(req.error));
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
        var tx = e.target.transaction;
        STORE_NAMES.forEach(function (name) {
          if (!database.objectStoreNames.contains(name)) {
            var store = database.createObjectStore(name, { keyPath: "id" });
            if (name === "sessions") {
              store.createIndex("toolId", "toolId", { unique: false });
            }
            if (name === "importsEleves") {
              store.createIndex("exportId", "exportId", { unique: false });
              store.createIndex("toolId", "toolId", { unique: false });
            }
          }
        });
        INDEXED_STORES.forEach(function (name) {
          if (!database.objectStoreNames.contains(name)) return;
          var store = tx.objectStore(name);
          if (!store.indexNames.contains("sessionId")) {
            store.createIndex("sessionId", "sessionId", { unique: false });
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
        return maybeMigrateSessions();
      })
      .then(function () {
        return migrateRadarPerfsFromParametres();
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

  function shouldBackupLocalStorageKey(key) {
    key = String(key || "");
    return LOCAL_STORAGE_BACKUP_PREFIXES.some(function (prefix) {
      return key.indexOf(prefix) === 0;
    });
  }

  function exportLocalStorageData() {
    var out = [];
    if (typeof localStorage === "undefined") return out;
    try {
      var i;
      for (i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (!shouldBackupLocalStorageKey(key)) continue;
        out.push({ id: key, value: localStorage.getItem(key) || "" });
      }
    } catch (e) {
      return out;
    }
    out.sort(function (a, b) {
      return String(a.id).localeCompare(String(b.id));
    });
    return out;
  }

  function restoreLocalStorageData(entries) {
    if (typeof localStorage === "undefined" || !Array.isArray(entries)) return;
    try {
      entries.forEach(function (entry) {
        if (!entry || !entry.id || !shouldBackupLocalStorageKey(entry.id)) return;
        localStorage.setItem(String(entry.id), String(entry.value == null ? "" : entry.value));
      });
    } catch (e) {
      /* IndexedDB reste la source principale si localStorage refuse l'ecriture. */
    }
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
          reject(wrapDbError(tx.error));
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
    var oublisMateriel = Array.isArray(app.oublisMateriel) ? app.oublisMateriel : [];
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
          dateNaissance: e.dateNaissance || "",
          sexe: e.sexe || "",
          niveau: e.niveau || "",
          vma: e.vma || "",
          commentaire: e.commentaire || "",
          equipe: e.equipe || "",
          equipeCouleur: e.equipeCouleur || "",
        });
      });
    });

    return { classes: classes, eleves: eleves, dispenses: dispenses, oublisMateriel: oublisMateriel, championnats: championnats, parametres: parametres };
  }

  function migrateLegacyPayload(sources) {
    var payload = {
      classes: [],
      eleves: [],
      dispenses: [],
      oublisMateriel: [],
      radarPerfs: [],
      sessions: [],
      championnats: [],
      tournoisElimination: [],
      parametres: [],
      importsEleves: [],
      tableauxSuivi: [],
    };
    var i;
    for (i = 0; i < sources.length; i++) {
      var s = sources[i];
      if (s.type === "app") {
        var split = splitLegacyApp(s.data);
        payload.classes = split.classes;
        payload.eleves = split.eleves;
        payload.dispenses = split.dispenses;
        payload.oublisMateriel = split.oublisMateriel;
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
          reject(wrapDbError(tx.error));
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
      }).then(function () {
        return linkOrphanSessionData();
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
    var si;
    for (si = 0; si < (payload.sessions || []).length; si++) {
      var sessErr = SC.validateSession(payload.sessions[si]);
      if (sessErr) return sessErr;
    }
    var total =
      payload.classes.length +
      payload.eleves.length +
      payload.dispenses.length +
      payload.oublisMateriel.length +
      (payload.radarPerfs || []).length +
      (payload.sessions || []).length +
      payload.championnats.length +
      payload.tournoisElimination.length +
      payload.parametres.length +
      (payload.importsEleves || []).length +
      (payload.tableauxSuivi || []).length +
      (payload.localStorageData || []).length;
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
              dateNaissance: e.dateNaissance || "",
              sexe: e.sexe || "",
              niveau: e.niveau || "",
              vma: e.vma || "",
              commentaire: e.commentaire || "",
              equipe: e.equipe || "",
              equipeCouleur: e.equipeCouleur || "",
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
      oublisMateriel: data.oublisMateriel || [],
      radarPerfs: data.radarPerfs || [],
      sessions: data.sessions || [],
      championnats: data.championnats || [],
      tournoisElimination: data.tournoisElimination || [],
      parametres: Array.isArray(parametres) ? parametres : [],
      importsEleves: data.importsEleves || [],
      tableauxSuivi: data.tableauxSuivi || [],
      localStorageData: Array.isArray(data.localStorageData) ? data.localStorageData : [],
    };
  }

  var BACKUP_STORE_LABELS = {
    classes: "Classes",
    eleves: "Élèves",
    dispenses: "Dispenses / inaptitudes",
    oublisMateriel: "Oublis de matériel",
    radarPerfs: "Radar vitesse",
    sessions: "Séances",
    championnats: "Championnats",
    tournoisElimination: "Tournois / pyramides",
    parametres: "Réglages et données d'outils",
    importsEleves: "Imports élèves QR",
    tableauxSuivi: "Tableaux de suivi",
  };

  var BACKUP_STORE_PREFIXES = {
    classes: "classe",
    eleves: "eleve",
    dispenses: "dispense",
    oublisMateriel: "oubli",
    radarPerfs: "radar",
    sessions: "session",
    championnats: "championnat",
    tournoisElimination: "tournoi",
    parametres: "parametre",
    importsEleves: "import",
    tableauxSuivi: "tableau",
  };

  function stableStringify(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) {
      return (
        "[" +
        value
          .map(function (item) {
            return stableStringify(item);
          })
          .join(",") +
        "]"
      );
    }
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map(function (key) {
          return JSON.stringify(key) + ":" + stableStringify(value[key]);
        })
        .join(",") +
      "}"
    );
  }

  function sameStoredData(a, b) {
    return stableStringify(a) === stableStringify(b);
  }

  function payloadFromStoreArrays(arrays) {
    return {
      classes: arrays[0],
      eleves: arrays[1],
      dispenses: arrays[2],
      oublisMateriel: arrays[3],
      radarPerfs: arrays[4],
      sessions: arrays[5],
      championnats: arrays[6],
      tournoisElimination: arrays[7],
      parametres: arrays[8],
      importsEleves: arrays[9],
      tableauxSuivi: arrays[10],
    };
  }

  function getCurrentPayload() {
    return Promise.all(STORE_NAMES.map(getAll)).then(payloadFromStoreArrays);
  }

  function buildIdIndexes(payload) {
    var indexes = {};
    STORE_NAMES.forEach(function (storeName) {
      indexes[storeName] = {};
      (payload[storeName] || []).forEach(function (item) {
        if (item && item.id) indexes[storeName][item.id] = item;
      });
    });
    return indexes;
  }

  function countPayloadItems(payload) {
    return STORE_NAMES.reduce(function (total, storeName) {
      return total + ((payload[storeName] || []).length || 0);
    }, 0);
  }

  function emptyMergeStats() {
    return {
      imported: 0,
      current: 0,
      identical: 0,
      added: 0,
      different: 0,
      skipped: 0,
      willImport: 0,
    };
  }

  function uniqueMergeId(storeName, oldId, usedIds) {
    var prefix = BACKUP_STORE_PREFIXES[storeName] || "import";
    var id = genererId(prefix);
    while (usedIds[storeName][id]) {
      id = genererId(prefix);
    }
    usedIds[storeName][id] = true;
    return id;
  }

  function remapParametreId(id, sessionMap) {
    var sessionId;
    if (!id) return id;
    if (id.indexOf("composition-equipes__") === 0) {
      sessionId = id.slice("composition-equipes__".length);
      return "composition-equipes__" + (sessionMap[sessionId] || sessionId);
    }
    if (id.indexOf("course-orientation__") === 0) {
      sessionId = id.slice("course-orientation__".length);
      return "course-orientation__" + (sessionMap[sessionId] || sessionId);
    }
    if (id.indexOf("defi-atp__") === 0) {
      sessionId = id.slice("defi-atp__".length);
      return "defi-atp__" + (sessionMap[sessionId] || sessionId);
    }
    return id;
  }

  function remapBackupItem(storeName, item, idMaps) {
    var copy = cloneData(item);
    if (storeName === "eleves" && copy.classeId) {
      copy.classeId = idMaps.classes[copy.classeId] || copy.classeId;
    }
    if (storeName === "sessions" && copy.classeId) {
      copy.classeId = idMaps.classes[copy.classeId] || copy.classeId;
    }
    if (
      (storeName === "championnats" || storeName === "tournoisElimination") &&
      copy.sessionId
    ) {
      copy.sessionId = idMaps.sessions[copy.sessionId] || copy.sessionId;
    }
    if (storeName === "parametres") {
      if (copy.sessionId) copy.sessionId = idMaps.sessions[copy.sessionId] || copy.sessionId;
      copy.id = remapParametreId(copy.id, idMaps.sessions);
      if (copy.sessionId && copy.id.indexOf("active-session__") === 0) {
        copy.sessionId = idMaps.sessions[copy.sessionId] || copy.sessionId;
      }
      if (copy.id === SYNTHESE_ALIASES_ID && Array.isArray(copy.aliases)) {
        copy.aliases = copy.aliases.map(function (alias) {
          var a = Object.assign({}, alias);
          if (a.classeId) a.classeId = idMaps.classes[a.classeId] || a.classeId;
          if (a.eleveId) a.eleveId = idMaps.eleves[a.eleveId] || a.eleveId;
          return a;
        });
      }
    }
    return copy;
  }

  function buildBackupMergePlan(currentPayload, importedPayload, options) {
    options = options || {};
    var currentIndexes = buildIdIndexes(currentPayload);
    var usedIds = {};
    var idMaps = {};
    var additions = {};
    var stores = [];
    var summary = emptyMergeStats();

    STORE_NAMES.forEach(function (storeName) {
      usedIds[storeName] = {};
      idMaps[storeName] = {};
      additions[storeName] = [];
      (currentPayload[storeName] || []).forEach(function (item) {
        if (item && item.id) usedIds[storeName][item.id] = true;
      });
    });

    STORE_NAMES.forEach(function (storeName) {
      var imported = importedPayload[storeName] || [];
      var current = currentPayload[storeName] || [];
      var stats = emptyMergeStats();
      stats.imported = imported.length;
      stats.current = current.length;

      imported.forEach(function (item) {
        if (!item || !item.id) return;
        var existing = currentIndexes[storeName][item.id];
        var next = remapBackupItem(storeName, item, idMaps);

        if (!existing && !usedIds[storeName][next.id]) {
          idMaps[storeName][item.id] = next.id;
          usedIds[storeName][next.id] = true;
          additions[storeName].push(next);
          stats.added += 1;
          return;
        }

        if (existing && sameStoredData(existing, next)) {
          idMaps[storeName][item.id] = existing.id;
          stats.identical += 1;
          return;
        }

        next.id = uniqueMergeId(storeName, item.id, usedIds);
        idMaps[storeName][item.id] = next.id;
        additions[storeName].push(next);
        stats.different += 1;
      });

      stats.willImport = additions[storeName].length;
      stores.push({
        storeName: storeName,
        label: BACKUP_STORE_LABELS[storeName] || storeName,
        current: stats.current,
        imported: stats.imported,
        identical: stats.identical,
        added: stats.added,
        different: stats.different,
        skipped: stats.skipped,
        willImport: stats.willImport,
      });

      summary.current += stats.current;
      summary.imported += stats.imported;
      summary.identical += stats.identical;
      summary.added += stats.added;
      summary.different += stats.different;
      summary.skipped += stats.skipped;
      summary.willImport += stats.willImport;
    });

    return {
      metadata: importedPayload.metadata || null,
      summary: summary,
      stores: stores,
      additions: options.includeAdditions === false ? null : additions,
    };
  }

  function previewBackupImport(data) {
    var err = validateBackup(data);
    if (err) return Promise.reject(new Error(err));
    var importedPayload = normalizeImportData(data);
    importedPayload.metadata = data.metadata || null;
    return getCurrentPayload().then(function (currentPayload) {
      var plan = buildBackupMergePlan(currentPayload, importedPayload, { includeAdditions: false });
      plan.replace = {
        current: countPayloadItems(currentPayload),
        imported: countPayloadItems(importedPayload),
      };
      return plan;
    });
  }

  function importMergePayloadToStores(additions) {
    return requireDb().then(function () {
      return new Promise(function (resolve, reject) {
        var tx = transaction(STORE_NAMES, "readwrite");
        tx.onerror = function () {
          reject(wrapDbError(tx.error));
        };
        tx.onabort = function () {
          reject(tx.error || new Error("Fusion annulee : les donnees existantes ont ete conservees."));
        };
        tx.oncomplete = function () {
          resolve();
        };

        STORE_NAMES.forEach(function (storeName) {
          var store = tx.objectStore(storeName);
          (additions[storeName] || []).forEach(function (item) {
            store.put(cloneData(item));
          });
        });
      }).then(function () {
        return linkOrphanSessionData();
      });
    });
  }

  function importBackupMerge(data) {
    var err = validateBackup(data);
    if (err) return Promise.reject(new Error(err));
    var importedPayload = normalizeImportData(data);
    return getCurrentPayload().then(function (currentPayload) {
      var plan = buildBackupMergePlan(currentPayload, importedPayload);
      if (!plan.summary.willImport) {
        return { success: true, merged: false, plan: plan };
      }
      return importMergePayloadToStores(plan.additions).then(function () {
        return { success: true, merged: true, plan: plan };
      });
    });
  }

  function exportAllData() {
    return Promise.all([
      getAll("classes"),
      getAll("eleves"),
      getAll("dispenses"),
      getAll("oublisMateriel"),
      getAll("radarPerfs"),
      getAll("sessions"),
      getAll("championnats"),
      getAll("tournoisElimination"),
      getAll("parametres"),
      getAll("importsEleves"),
      getAll("tableauxSuivi"),
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
        oublisMateriel: arrays[3],
        radarPerfs: arrays[4],
        sessions: arrays[5],
        championnats: arrays[6],
        tournoisElimination: arrays[7],
        parametres: arrays[8],
        importsEleves: arrays[9],
        tableauxSuivi: arrays[10],
        localStorageData: exportLocalStorageData(),
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
      restoreLocalStorageData(data.localStorageData);
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

  function compareTexteFr(a, b) {
    return String(a || "").localeCompare(String(b || ""), "fr", { sensitivity: "base" });
  }

  /** Tri nom puis prénom (ordre alphabétique français). */
  function sortElevesAlphabetique(eleves) {
    return (eleves || []).slice().sort(function (a, b) {
      var cmpNom = compareTexteFr(a.nom, b.nom);
      if (cmpNom !== 0) return cmpNom;
      return compareTexteFr(a.prenom, b.prenom);
    });
  }

  function sortClassesAlphabetique(classes) {
    return (classes || []).slice().sort(function (a, b) {
      return compareTexteFr(a.nom, b.nom);
    });
  }

  function mapEleveSansClasseId(e) {
    var copy = Object.assign({}, e);
    delete copy.classeId;
    return copy;
  }

  function getElevesByClasseId(classeId) {
    return getAll("eleves").then(function (all) {
      return all.filter(function (e) {
        return e.classeId === classeId;
      });
    });
  }

  function getClasses(options) {
    options = options || {};
    return Promise.all([getAll("classes"), getAll("eleves")]).then(function (res) {
      var classes = res[0];
      var eleves = res[1];
      var includeArchived = !!options.includeArchived;
      return sortClassesAlphabetique(
        classes
          .filter(function (c) {
            if (!c) return false;
            if (includeArchived) return true;
            return !c.archived;
          })
          .map(function (c) {
            return {
              id: c.id,
              nom: c.nom,
              archived: !!c.archived,
              eleves: sortElevesAlphabetique(
                eleves
                  .filter(function (e) {
                    return e.classeId === c.id;
                  })
                  .map(mapEleveSansClasseId)
              ),
            };
          })
      );
    });
  }

  function getClasseById(id) {
    return Promise.all([getById("classes", id), getElevesByClasseId(id)]).then(function (res) {
      var c = res[0];
      if (!c) return null;
      return {
        id: c.id,
        nom: c.nom,
        archived: !!c.archived,
        eleves: sortElevesAlphabetique(res[1].map(mapEleveSansClasseId)),
      };
    });
  }

  function syncElevesForClasse(classeId, eleves) {
    eleves = sortElevesAlphabetique(eleves);
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
          dateNaissance: e.dateNaissance || "",
          sexe: e.sexe || "",
          niveau: e.niveau || "",
          vma: e.vma || "",
          commentaire: e.commentaire || "",
          equipe: e.equipe || "",
          equipeCouleur: e.equipeCouleur || "",
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
      archived: !!classe.archived,
    };
    return addItem("classes", item).then(function () {
      if (classe.eleves && classe.eleves.length) {
        return syncElevesForClasse(id, sortElevesAlphabetique(classe.eleves)).then(function () {
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
      if (patch.archived !== undefined) {
        c.archived = !!patch.archived;
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

  function setClasseArchived(id, archived) {
    return getById("classes", id).then(function (c) {
      if (!c) return false;
      c.archived = !!archived;
      return updateItem("classes", c).then(function () {
        return true;
      });
    });
  }

  function getElevesFromClasse(id) {
    return getElevesByClasseId(id).then(function (list) {
      return sortElevesAlphabetique(list.map(mapEleveSansClasseId));
    });
  }

  /**
   * Met à jour un élève dans le store (fiche Classes).
   * @param {string} eleveId
   * @param {object} patch — champs partiels (sexe, niveau, vma, equipe, equipeCouleur…)
   */
  function updateEleve(eleveId, patch) {
    if (!eleveId || !patch || typeof patch !== "object") {
      return Promise.resolve(false);
    }
    return getById("eleves", eleveId).then(function (e) {
      if (!e) return false;
      var item = {
        id: e.id,
        classeId: e.classeId,
        nom: e.nom || "",
        prenom: e.prenom || "",
        dateNaissance:
          patch.dateNaissance !== undefined ? patch.dateNaissance : e.dateNaissance || "",
        sexe: patch.sexe !== undefined ? patch.sexe : e.sexe || "",
        niveau: patch.niveau !== undefined ? patch.niveau : e.niveau || "",
        vma: patch.vma !== undefined ? patch.vma : e.vma || "",
        commentaire: patch.commentaire !== undefined ? patch.commentaire : e.commentaire || "",
        equipe: patch.equipe !== undefined ? patch.equipe : e.equipe || "",
        equipeCouleur:
          patch.equipeCouleur !== undefined ? patch.equipeCouleur : e.equipeCouleur || "",
      };
      return updateItem("eleves", item).then(function () {
        return true;
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

  function getOublisMateriel() {
    return getAll("oublisMateriel");
  }

  function saveOublisMateriel(liste) {
    return clearStore("oublisMateriel").then(function () {
      var items = Array.isArray(liste) ? liste : [];
      if (!items.length) return;
      return bulkPut("oublisMateriel", items);
    });
  }

  function getRadarPerfs() {
    return getAll("radarPerfs");
  }

  function saveRadarPerfs(liste) {
    return clearStore("radarPerfs").then(function () {
      var items = Array.isArray(liste) ? liste : [];
      if (!items.length) return;
      return bulkPut("radarPerfs", items);
    });
  }

  function migrateRadarPerfsFromParametres() {
    return getAll("radarPerfs").then(function (existing) {
      if (existing.length) return;
      return getParametre("radar-perfs").then(function (rec) {
        if (!rec || !Array.isArray(rec.perfs) || !rec.perfs.length) return;
        return saveRadarPerfs(rec.perfs).then(function () {
          return deleteParametre("radar-perfs");
        });
      });
    });
  }

  function getTableauxSuivi() {
    return getAll("tableauxSuivi");
  }

  function saveTableauxSuivi(liste) {
    return clearStore("tableauxSuivi").then(function () {
      var items = Array.isArray(liste) ? liste : [];
      if (!items.length) return;
      return bulkPut("tableauxSuivi", items);
    });
  }

  /* --- Sessions (multi-séances par outil) --- */

  function getBySession(storeName, sessionId) {
    if (!sessionId) return Promise.resolve([]);
    return requireDb().then(function () {
      var store = storeTx(storeName, "readonly");
      if (!store.indexNames.contains("sessionId")) {
        return getAll(storeName).then(function (all) {
          return all.filter(function (r) {
            return r && r.sessionId === sessionId;
          });
        });
      }
      return promisifyRequest(store.index("sessionId").getAll(sessionId));
    });
  }

  function getSessionById(sessionId) {
    return getById("sessions", sessionId);
  }

  function listSessionsByTool(toolId, options) {
    options = options || {};
    return getAll("sessions").then(function (all) {
      var list = SC.filterSessionsForTool(all, toolId, {
        includeArchived: !!options.includeArchived,
      });
      if (options.limit && options.limit > 0) {
        list = list.slice(0, options.limit);
      }
      return list;
    });
  }

  function getActiveSessionId(toolId) {
    return getParametre(SC.activeSessionParamId(toolId)).then(function (rec) {
      return rec && rec.sessionId ? rec.sessionId : null;
    });
  }

  function setActiveSessionId(toolId, sessionId) {
    return saveParametre({
      id: SC.activeSessionParamId(toolId),
      sessionId: sessionId || null,
      updatedAt: new Date().toISOString(),
    });
  }

  function touchSession(sessionId) {
    return getSessionById(sessionId).then(function (s) {
      if (!s) return null;
      var now = new Date().toISOString();
      s.lastOpenedAt = now;
      s.updatedAt = now;
      return updateItem("sessions", s).then(function () {
        return s;
      });
    });
  }

  function createSession(input) {
    var err = SC.validateSession(
      Object.assign({}, input, { id: input.id || genererId("session") })
    );
    if (err) return Promise.reject(new Error(err));
    var session = SC.normalizeSession(
      Object.assign({ archived: false }, input, {
        id: input.id || genererId("session"),
      })
    );
    return addItem("sessions", session).then(function () {
      return setActiveSessionId(session.toolId, session.id).then(function () {
        return session;
      });
    });
  }

  function updateSessionRecord(session) {
    var err = SC.validateSession(session);
    if (err) return Promise.reject(new Error(err));
    var norm = SC.normalizeSession(session, session.updatedAt);
    norm.updatedAt = new Date().toISOString();
    return updateItem("sessions", norm).then(function () {
      return norm;
    });
  }

  function renameSession(sessionId, nomSession) {
    return getSessionById(sessionId).then(function (s) {
      if (!s) return Promise.reject(new Error("Séance introuvable."));
      s.nomSession = (nomSession || "").trim() || s.nomSession;
      return updateSessionRecord(s);
    });
  }

  function setSessionArchived(sessionId, archived) {
    return getSessionById(sessionId).then(function (s) {
      if (!s) return Promise.reject(new Error("Séance introuvable."));
      s.archived = !!archived;
      return updateSessionRecord(s);
    });
  }

  function openSession(sessionId) {
    return getSessionById(sessionId).then(function (s) {
      if (!s) return Promise.reject(new Error("Séance introuvable ou corrompue."));
      if (s.archived) return Promise.reject(new Error("Cette séance est archivée."));
      return touchSession(sessionId).then(function (updated) {
        return setActiveSessionId(updated.toolId, updated.id).then(function () {
          return updated;
        });
      });
    });
  }

  function deleteSessionData(sessionId) {
    return Promise.all([
      getBySession("championnats", sessionId),
      getBySession("tournoisElimination", sessionId),
      getParametre(SC.compositionDataId(sessionId)).then(function (p) {
        return p ? deleteParametre(p.id) : null;
      }),
      getParametre(SC.courseOrientationDataId(sessionId)).then(function (p) {
        return p ? deleteParametre(p.id) : null;
      }),
      getParametre(SC.defiAtpDataId(sessionId)).then(function (p) {
        return p ? deleteParametre(p.id) : null;
      }),
    ]).then(function (res) {
      var ops = [];
      (res[0] || []).forEach(function (c) {
        ops.push(deleteItem("championnats", c.id));
      });
      (res[1] || []).forEach(function (t) {
        ops.push(deleteItem("tournoisElimination", t.id));
      });
      return Promise.all(ops);
    });
  }

  function deleteSession(sessionId) {
    return getSessionById(sessionId).then(function (s) {
      if (!s) return Promise.reject(new Error("Séance introuvable."));
      return getActiveSessionId(s.toolId).then(function (activeId) {
        return deleteSessionData(sessionId)
          .then(function () {
            return deleteItem("sessions", sessionId);
          })
          .then(function () {
            if (activeId === sessionId) {
              return setActiveSessionId(s.toolId, null);
            }
          });
      });
    });
  }

  function getChampionnatForSession(sessionId) {
    return getBySession("championnats", sessionId).then(function (list) {
      var c = list[0];
      if (!c) {
        return { dataId: null, teams: [], matches: [], poules: [], importMeta: {}, nom: null };
      }
      return {
        dataId: c.id,
        nom: c.nom || null,
        poules: Array.isArray(c.poules) ? c.poules.slice() : [],
        teams: Array.isArray(c.teams) ? c.teams.slice() : [],
        matches: Array.isArray(c.matches) ? c.matches.slice() : [],
        importMeta: c.importMeta && typeof c.importMeta === "object" ? cloneData(c.importMeta) : {},
      };
    });
  }

  function saveChampionnatForSession(sessionId, state, meta) {
    if (!sessionId) {
      return Promise.reject(new Error("Aucune séance active."));
    }
    meta = meta || {};
    return getBySession("championnats", sessionId).then(function (list) {
      var bloc = {
        id: list[0] ? list[0].id : genererId("championnat"),
        sessionId: sessionId,
        nom: meta.nom || (list[0] && list[0].nom) || "Championnat",
        poules: state.poules || [],
        teams: state.teams || [],
        matches: state.matches || [],
        importMeta: state.importMeta && typeof state.importMeta === "object" ? cloneData(state.importMeta) : {},
        updatedAt: new Date().toISOString(),
      };
      if (list.length) return updateItem("championnats", bloc);
      return addItem("championnats", bloc);
    }).then(function () {
      return touchSession(sessionId);
    });
  }

  function getChampionnatActif() {
    return getActiveSessionId(SC.SESSION_TOOLS.CHAMPIONNAT).then(function (sid) {
      if (!sid) return { teams: [], matches: [] };
      return getChampionnatForSession(sid).then(function (d) {
        return { poules: d.poules || [], teams: d.teams, matches: d.matches };
      });
    });
  }

  function saveChampionnatActif(state) {
    return getActiveSessionId(SC.SESSION_TOOLS.CHAMPIONNAT).then(function (sid) {
      if (!sid) return Promise.reject(new Error("Aucune séance championnat active."));
      return saveChampionnatForSession(sid, state);
    });
  }

  function duplicateChampionnatSession(sourceSessionId, options) {
    options = options || {};
    var nomSession = (options.nomSession || "").trim().replace(/\s+/g, " ");
    return getSessionById(sourceSessionId).then(function (sourceSession) {
      if (!sourceSession) {
        return Promise.reject(new Error("Seance source introuvable."));
      }
      if (sourceSession.toolId !== SC.SESSION_TOOLS.CHAMPIONNAT) {
        return Promise.reject(new Error("Cette seance n'est pas une seance de championnat."));
      }
      return getChampionnatForSession(sourceSessionId).then(function (sourceState) {
        var sessionNom = nomSession || sourceSession.nomSession + " (copie)";
        var newState = {
          poules: cloneData(sourceState.poules || []),
          teams: cloneData(sourceState.teams || []),
          matches: cloneData(sourceState.matches || []),
          importMeta: cloneData(sourceState.importMeta || {}),
        };
        return createSession({
          toolId: SC.SESSION_TOOLS.CHAMPIONNAT,
          nomSession: sessionNom,
          classeId: sourceSession.classeId || null,
          classeNomSnapshot: sourceSession.classeNomSnapshot || null,
        }).then(function (newSession) {
          return saveChampionnatForSession(newSession.id, newState, { nom: sessionNom }).then(function () {
            return newSession;
          });
        });
      });
    });
  }

  function getTournoiForSession(sessionId) {
    return getBySession("tournoisElimination", sessionId).then(function (list) {
      var rec = list.filter(function (r) {
        return r && r.kind === "tournoi-elimination";
      })[0];
      if (!rec || !rec.payload) {
        return { dataId: null, payload: null };
      }
      return { dataId: rec.id, payload: cloneData(rec.payload) };
    });
  }

  function saveTournoiForSession(sessionId, payload) {
    if (!sessionId) return Promise.reject(new Error("Aucune séance active."));
    return getBySession("tournoisElimination", sessionId).then(function (list) {
      var existing = list.filter(function (r) {
        return r && r.kind === "tournoi-elimination";
      })[0];
      var bloc = {
        id: existing ? existing.id : genererId("tournoi"),
        sessionId: sessionId,
        kind: "tournoi-elimination",
        nom: existing && existing.nom ? existing.nom : "Tournoi éliminatoire",
        payload: cloneData(payload),
        updatedAt: new Date().toISOString(),
      };
      if (existing) return updateItem("tournoisElimination", bloc);
      return addItem("tournoisElimination", bloc);
    }).then(function () {
      return touchSession(sessionId);
    });
  }

  function getCompositionForSession(sessionId) {
    return getParametre(SC.compositionDataId(sessionId)).then(function (rec) {
      if (!rec) return null;
      return {
        listeBrute: rec.listeBrute || "",
        players: Array.isArray(rec.players) ? rec.players.slice() : [],
        nbEquipes: rec.nbEquipes,
        assignments: rec.assignments,
        teamNames: Array.isArray(rec.teamNames) ? rec.teamNames.slice() : [],
        teamColors: Array.isArray(rec.teamColors) ? rec.teamColors.slice() : [],
      };
    });
  }

  function saveCompositionForSession(sessionId, data) {
    if (!sessionId) return Promise.reject(new Error("Aucune séance active."));
    var record = Object.assign({}, data, {
      id: SC.compositionDataId(sessionId),
      sessionId: sessionId,
      toolId: SC.SESSION_TOOLS.COMPOSITION,
      updatedAt: new Date().toISOString(),
    });
    return saveParametre(record).then(function () {
      return touchSession(sessionId);
    });
  }

  var DEFI_ATP_DEFAULT_STATE = {
    players: [],
    matches: [],
    ladder: [],
    settings: {},
  };

  function normalizeDefiAtpState(raw) {
    if (!raw || typeof raw !== "object") return cloneData(DEFI_ATP_DEFAULT_STATE);
    return {
      players: Array.isArray(raw.players) ? raw.players.slice() : [],
      matches: Array.isArray(raw.matches) ? raw.matches.slice() : [],
      ladder: Array.isArray(raw.ladder) ? raw.ladder.slice() : [],
      settings: raw.settings && typeof raw.settings === "object" ? cloneData(raw.settings) : {},
    };
  }

  function getDefiAtpForSession(sessionId) {
    return getParametre(SC.defiAtpDataId(sessionId)).then(function (rec) {
      if (!rec) return normalizeDefiAtpState(null);
      return normalizeDefiAtpState(rec);
    });
  }

  function saveDefiAtpForSession(sessionId, state) {
    if (!sessionId) return Promise.reject(new Error("Aucune séance active."));
    var record = Object.assign({}, normalizeDefiAtpState(state), {
      id: SC.defiAtpDataId(sessionId),
      sessionId: sessionId,
      toolId: SC.SESSION_TOOLS.DEFI_ATP,
      updatedAt: new Date().toISOString(),
    });
    return saveParametre(record).then(function () {
      return touchSession(sessionId);
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

  var SYNTHESE_ALIASES_ID = "synthese-identite-aliases";

  function normalizeAliasLabel(label) {
    return String(label || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  }

  function getSyntheseIdentityAliases() {
    return getParametre(SYNTHESE_ALIASES_ID).then(function (rec) {
      return rec && Array.isArray(rec.aliases) ? rec.aliases.slice() : [];
    });
  }

  function saveSyntheseIdentityAlias(classeId, label, eleveId) {
    if (!classeId || !label || !eleveId) {
      return Promise.reject(new Error("Alias incomplet."));
    }
    var labelNorm = normalizeAliasLabel(label);
    return getSyntheseIdentityAliases().then(function (aliases) {
      aliases = aliases.filter(function (a) {
        return !(a && a.classeId === classeId && a.labelNorm === labelNorm);
      });
      aliases.push({
        classeId: classeId,
        labelNorm: labelNorm,
        labelOriginal: String(label).trim(),
        eleveId: eleveId,
        createdAt: new Date().toISOString(),
      });
      return saveParametre({
        id: SYNTHESE_ALIASES_ID,
        aliases: aliases,
        updatedAt: new Date().toISOString(),
      }).then(function () {
        return aliases;
      });
    });
  }

  function deleteParametre(id) {
    return deleteItem("parametres", id);
  }

  function getPyramideForSession(sessionId) {
    return getBySession("tournoisElimination", sessionId).then(function (list) {
      var r = list.filter(function (x) {
        return x && x.kind === "pyramide-victoires";
      })[0];
      if (!r) return { dataId: null, players: [], matches: [] };
      return {
        dataId: r.id,
        players: Array.isArray(r.players) ? r.players.slice() : [],
        matches: Array.isArray(r.matches) ? r.matches.slice() : [],
      };
    });
  }

  function savePyramideForSession(sessionId, state) {
    if (!sessionId) return Promise.reject(new Error("Aucune séance active."));
    return getBySession("tournoisElimination", sessionId).then(function (list) {
      var existing = list.filter(function (x) {
        return x && x.kind === "pyramide-victoires";
      })[0];
      var bloc = {
        id: existing ? existing.id : genererId("pyramide"),
        sessionId: sessionId,
        kind: "pyramide-victoires",
        nom: "Pyramide de victoires",
        players: state.players || [],
        matches: state.matches || [],
        updatedAt: new Date().toISOString(),
      };
      if (existing) return updateItem("tournoisElimination", bloc);
      return addItem("tournoisElimination", bloc);
    }).then(function () {
      return touchSession(sessionId);
    });
  }

  function getPhotoFinishForSession(sessionId) {
    return getBySession("tournoisElimination", sessionId).then(function (list) {
      var r = list.filter(function (x) {
        return x && x.kind === "photo-finish";
      })[0];
      if (!r) return null;
      return {
        dataId: r.id,
        settings: r.settings || null,
        sessionInfo: r.sessionInfo || null,
        runners: Array.isArray(r.runners) ? r.runners.slice() : [],
        selectedRunnerIds: Array.isArray(r.selectedRunnerIds) ? r.selectedRunnerIds.slice() : [],
        seriesCounter: Number(r.seriesCounter || 0),
        results: Array.isArray(r.results) ? r.results.slice() : [],
        sessions: Array.isArray(r.sessions) ? r.sessions.slice() : [],
      };
    });
  }

  function savePhotoFinishForSession(sessionId, payload) {
    if (!sessionId) return Promise.reject(new Error("Aucune séance active."));
    payload = payload || {};
    return getBySession("tournoisElimination", sessionId).then(function (list) {
      var existing = list.filter(function (x) {
        return x && x.kind === "photo-finish";
      })[0];
      var bloc = {
        id: existing ? existing.id : genererId("photo-finish"),
        sessionId: sessionId,
        kind: "photo-finish",
        nom: "Photo Finish",
        settings: payload.settings || {},
        sessionInfo: payload.sessionInfo || {},
        runners: payload.runners || [],
        selectedRunnerIds: payload.selectedRunnerIds || [],
        seriesCounter: Number(payload.seriesCounter || 0),
        results: payload.results || [],
        sessions: payload.sessions || [],
        updatedAt: new Date().toISOString(),
      };
      if (existing) return updateItem("tournoisElimination", bloc);
      return addItem("tournoisElimination", bloc);
    }).then(function () {
      return touchSession(sessionId);
    });
  }

  function getRelaisForSession(sessionId) {
    return getBySession("tournoisElimination", sessionId).then(function (list) {
      var r = list.filter(function (x) {
        return x && x.kind === "relais";
      })[0];
      if (!r) return null;
      return {
        dataId: r.id,
        settings: r.settings || null,
        runners: Array.isArray(r.runners) ? r.runners.slice() : [],
        results: Array.isArray(r.results) ? r.results.slice() : [],
      };
    });
  }

  function saveRelaisForSession(sessionId, payload) {
    if (!sessionId) return Promise.reject(new Error("Aucune séance active."));
    payload = payload || {};
    return getBySession("tournoisElimination", sessionId).then(function (list) {
      var existing = list.filter(function (x) {
        return x && x.kind === "relais";
      })[0];
      var bloc = {
        id: existing ? existing.id : genererId("relais"),
        sessionId: sessionId,
        kind: "relais",
        nom: "Relais (prof)",
        settings: payload.settings || {},
        runners: payload.runners || [],
        results: payload.results || [],
        updatedAt: new Date().toISOString(),
      };
      if (existing) return updateItem("tournoisElimination", bloc);
      return addItem("tournoisElimination", bloc);
    }).then(function () {
      return touchSession(sessionId);
    });
  }

  function getPyramideVictoires() {
    return getActiveSessionId(SC.SESSION_TOOLS.PYRAMIDE).then(function (sid) {
      if (!sid) return { players: [], matches: [] };
      return getPyramideForSession(sid);
    });
  }

  function savePyramideVictoires(state) {
    return getActiveSessionId(SC.SESSION_TOOLS.PYRAMIDE).then(function (sid) {
      if (!sid) return Promise.reject(new Error("Aucune séance pyramide active."));
      return savePyramideForSession(sid, state);
    });
  }

  var ORIENTATION_DEFAULT_STATE = {
    parcours: [],
    coureurs: [],
    runs: [],
    settings: {
      penaliteFausseSec: 30,
      bonusCorrecteSec: 0,
      retardMinutes: 10,
      allowDeleteTime: false,
      classementCriteres: [
        { key: "parcoursFaits", order: "desc" },
        { key: "tempsMoyen", order: "asc" },
        { key: "tempsTotal", order: "asc" },
        { key: "erreurs", order: "asc" },
        { key: "validations", order: "desc" },
      ],
    },
  };

  function normalizeOrientationState(raw) {
    var base = cloneData(ORIENTATION_DEFAULT_STATE);
    if (!raw || typeof raw !== "object") return base;
    base.parcours = Array.isArray(raw.parcours) ? raw.parcours.slice() : [];
    base.coureurs = Array.isArray(raw.coureurs) ? raw.coureurs.slice() : [];
    base.runs = Array.isArray(raw.runs) ? raw.runs.slice() : [];
    if (raw.settings && typeof raw.settings === "object") {
      base.settings = Object.assign({}, base.settings, raw.settings);
      if (Array.isArray(raw.settings.classementCriteres)) {
        base.settings.classementCriteres = raw.settings.classementCriteres.slice();
      }
    }
    return base;
  }

  function getCourseOrientationForSession(sessionId) {
    return getParametre(SC.courseOrientationDataId(sessionId)).then(function (rec) {
      if (!rec) return normalizeOrientationState(null);
      return normalizeOrientationState(rec);
    });
  }

  function saveCourseOrientationForSession(sessionId, state) {
    if (!sessionId) return Promise.reject(new Error("Aucune séance active."));
    var record = Object.assign({}, normalizeOrientationState(state), {
      id: SC.courseOrientationDataId(sessionId),
      sessionId: sessionId,
      toolId: SC.SESSION_TOOLS.ORIENTATION,
      updatedAt: new Date().toISOString(),
    });
    return saveParametre(record).then(function () {
      return touchSession(sessionId);
    });
  }

  function nomElevePourCoureur(e) {
    if (!e) return "";
    return ([e.nom, e.prenom].filter(Boolean).join(" ") || "")
      .trim()
      .replace(/\s+/g, " ");
  }

  function duplicateCourseOrientationSession(sourceSessionId, options) {
    options = options || {};
    var classeId = options.classeId || null;
    var nomSession = (options.nomSession || "").trim().replace(/\s+/g, " ");

    return getSessionById(sourceSessionId).then(function (sourceSession) {
      if (!sourceSession) {
        return Promise.reject(new Error("Séance source introuvable."));
      }
      if (sourceSession.toolId !== SC.SESSION_TOOLS.ORIENTATION) {
        return Promise.reject(new Error("Cette séance n’est pas une séance de course d’orientation."));
      }
      return Promise.all([
        getCourseOrientationForSession(sourceSessionId),
        classeId ? getClasseById(classeId) : Promise.resolve(null),
      ]).then(function (res) {
        var sourceState = res[0];
        var classe = res[1];
        if (classeId && !classe) {
          return Promise.reject(new Error("Classe introuvable."));
        }
        var noms = classe
          ? sortElevesAlphabetique(
              (classe.eleves || []).map(function (e) {
                return nomElevePourCoureur(e);
              })
            ).filter(Boolean)
          : [];
        var sessionNom =
          nomSession ||
          (classe ? classe.nom : sourceSession.nomSession + " (copie)");
        var newState = SC.cloneOrientationSessionData(sourceState);
        newState.coureurs = SC.buildOrientationCoureurs(noms, function () {
          return genererId("coureur");
        });
        return createSession({
          toolId: SC.SESSION_TOOLS.ORIENTATION,
          nomSession: sessionNom,
          classeId: classeId,
          classeNomSnapshot: classe ? classe.nom : null,
        }).then(function (newSession) {
          return saveCourseOrientationForSession(newSession.id, newState).then(function () {
            return newSession;
          });
        });
      });
    });
  }

  function readLegacyTournoiLocalStorage() {
    try {
      var raw = localStorage.getItem(SC.LEGACY_TOURNOI_LS_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function maybeMigrateSessions() {
    return getParametre(SC.MIGRATION_FLAG_ID).then(function (flag) {
      if (flag && flag.done) return false;
      return runSessionsMigration().then(function () {
        return saveParametre({
          id: SC.MIGRATION_FLAG_ID,
          done: true,
          migratedAt: new Date().toISOString(),
        });
      });
    });
  }

  function linkOrphanSessionData() {
    return runSessionsMigration(true);
  }

  function runSessionsMigration(orphansOnly) {
    var now = new Date().toISOString();
    var created = {};

    function ensureLegacySession(toolId) {
      if (created[toolId]) return Promise.resolve(created[toolId]);
      var session = SC.normalizeSession({
        id: genererId("session"),
        toolId: toolId,
        nomSession: SC.legacySessionName(toolId, now),
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
        archived: false,
      });
      return addItem("sessions", session).then(function () {
        created[toolId] = session;
        return setActiveSessionId(toolId, session.id).then(function () {
          return session;
        });
      });
    }

    return getAll("championnats")
      .then(function (list) {
        var orphans = list.filter(function (c) {
          return c && !c.sessionId;
        });
        if (!orphans.length) return null;
        return ensureLegacySession(SC.SESSION_TOOLS.CHAMPIONNAT).then(function (session) {
          return Promise.all(
            orphans.map(function (c) {
              c.sessionId = session.id;
              c.updatedAt = now;
              return updateItem("championnats", c);
            })
          );
        });
      })
      .then(function () {
        return getAll("tournoisElimination");
      })
      .then(function (list) {
        var pyramide = list.filter(function (r) {
          return r && (r.id === PYRAMIDE_VICTOIRES_ID || r.kind === "pyramide-victoires");
        });
        var tournois = list.filter(function (r) {
          return r && !r.sessionId && r.id !== PYRAMIDE_VICTOIRES_ID;
        });
        var ops = [];
        if (pyramide.length) {
          ops.push(
            ensureLegacySession(SC.SESSION_TOOLS.PYRAMIDE).then(function (session) {
              return Promise.all(
                pyramide.map(function (r) {
                  var bloc = {
                    id: r.id === PYRAMIDE_VICTOIRES_ID ? genererId("pyramide") : r.id,
                    sessionId: session.id,
                    kind: "pyramide-victoires",
                    nom: r.nom || "Pyramide de victoires",
                    players: r.players || [],
                    matches: r.matches || [],
                    updatedAt: now,
                  };
                  if (r.id === PYRAMIDE_VICTOIRES_ID) {
                    return addItem("tournoisElimination", bloc).then(function () {
                      return deleteItem("tournoisElimination", PYRAMIDE_VICTOIRES_ID);
                    });
                  }
                  return updateItem("tournoisElimination", bloc);
                })
              );
            })
          );
        }
        if (tournois.length) {
          ops.push(
            ensureLegacySession(SC.SESSION_TOOLS.TOURNOI).then(function (session) {
              return Promise.all(
                tournois.map(function (r) {
                  r.sessionId = session.id;
                  r.kind = r.kind || "tournoi-elimination";
                  r.updatedAt = now;
                  return updateItem("tournoisElimination", r);
                })
              );
            })
          );
        }
        return Promise.all(ops);
      })
      .then(function () {
        return getParametre("composition-equipes");
      })
      .then(function (old) {
        if (!old || old.sessionId) return null;
        return ensureLegacySession(SC.SESSION_TOOLS.COMPOSITION).then(function (session) {
          var neu = Object.assign({}, old, {
            id: SC.compositionDataId(session.id),
            sessionId: session.id,
            toolId: SC.SESSION_TOOLS.COMPOSITION,
            updatedAt: now,
          });
          return saveParametre(neu).then(function () {
            return deleteParametre("composition-equipes");
          });
        });
      })
      .then(function () {
        if (orphansOnly) return null;
        var ls = readLegacyTournoiLocalStorage();
        if (!ls || !Array.isArray(ls.rounds)) return null;
        return ensureLegacySession(SC.SESSION_TOOLS.TOURNOI).then(function (session) {
          return getBySession("tournoisElimination", session.id).then(function (existing) {
            var has = existing.some(function (r) {
              return r && r.kind === "tournoi-elimination";
            });
            if (has) return null;
            return saveTournoiForSession(session.id, ls).then(function () {
              try {
                localStorage.removeItem(SC.LEGACY_TOURNOI_LS_KEY);
              } catch (e) {
                /* ignore */
              }
            });
          });
        });
      });
  }

  /** Ordre des groupes dans la page Sauvegarde (aligné sur l’accueil prof). */
  var STORAGE_GROUP_ORDER = ["Gestion de classe", "Séance", "Activités"];

  /** Outils qui enregistrent des données IndexedDB (liste affichée seulement si non vide). */
  var STORAGE_CATEGORIES = [
    {
      id: "classes",
      label: "Classes et élèves",
      groupe: "Gestion de classe",
      stores: ["classes", "eleves"],
    },
    {
      id: "tableau-suivi",
      label: "Appel et notes",
      groupe: "Gestion de classe",
      stores: ["tableauxSuivi"],
    },
    {
      id: "cahier-texte",
      label: "Cahier de texte",
      groupe: "Gestion de classe",
      paramIds: ["cahier-texte-data"],
    },
    {
      id: "imports-eleves",
      label: "Imports élèves (QR)",
      groupe: "Gestion de classe",
      stores: ["importsEleves"],
    },
    {
      id: "dispenses",
      label: "Dispenses / Inaptitudes",
      groupe: "Gestion de classe",
      stores: ["dispenses"],
      paramIds: ["dispenses-masquer-terminees"],
    },
    {
      id: "oublis-materiel",
      label: "Oubli de matériel",
      groupe: "Gestion de classe",
      stores: ["oublisMateriel"],
    },
    {
      id: "sessions",
      label: "Séances actives",
      groupe: "Séance",
      stores: ["sessions"],
      paramPrefix: "active-session__",
    },
    {
      id: "championnat",
      label: "Championnat",
      groupe: "Séance",
      stores: ["championnats"],
    },
    {
      id: "tournoi-elimination",
      label: "Tournoi éliminatoire",
      groupe: "Séance",
      stores: ["tournoisElimination"],
      storeFilter: function (r) {
        return r && r.kind === "tournoi-elimination";
      },
    },
    {
      id: "pyramide-victoires",
      label: "Pyramide de victoires",
      groupe: "Séance",
      stores: ["tournoisElimination"],
      storeFilter: function (r) {
        return r && r.kind === "pyramide-victoires";
      },
    },
    {
      id: "composition",
      label: "Composition d’équipes",
      groupe: "Séance",
      paramPrefix: "composition-equipes",
    },
    {
      id: "tableau-noir",
      label: "Tableau Noir",
      groupe: "Séance",
      paramIds: ["tableau-noir"],
    },
    {
      id: "timer-hiit",
      label: "Timer HIIT / Tabata",
      groupe: "Séance",
      paramIds: [PARAM_HIIT_PRESETS_ID],
    },
    {
      id: "compteur-bonus",
      label: "Compteur bonus",
      groupe: "Séance",
      paramIds: ["compteur-bonus-settings"],
    },
    {
      id: "radar",
      label: "Radar vitesse",
      groupe: "Activités",
      stores: ["radarPerfs"],
      paramIds: ["radar-session", "radar-settings"],
    },
    {
      id: "inducteur-danse",
      label: "Inducteur danse",
      groupe: "Activités",
      paramIds: ["inducteur-danse"],
    },
  ];

  function storeItemsForCategory(cat, storeName, storeData) {
    var items = storeData[storeName] || [];
    if (typeof cat.storeFilter === "function") {
      return items.filter(cat.storeFilter);
    }
    return items;
  }

  function paramsForCategory(cat, parametres) {
    var list = parametres || [];
    var out = [];
    var seen = {};
    (cat.paramIds || []).forEach(function (pid) {
      list.forEach(function (p) {
        if (p && p.id === pid && !seen[p.id]) {
          seen[p.id] = true;
          out.push(p);
        }
      });
    });
    if (cat.paramPrefix) {
      list.forEach(function (p) {
        if (p && p.id && p.id.indexOf(cat.paramPrefix) === 0 && !seen[p.id]) {
          seen[p.id] = true;
          out.push(p);
        }
      });
    }
    return out;
  }

  function isParamAssignedToStorageCategories(p, categories) {
    if (!p || !p.id) return false;
    var i;
    for (i = 0; i < categories.length; i++) {
      var cat = categories[i];
      if ((cat.paramIds || []).indexOf(p.id) >= 0) return true;
      if (cat.paramPrefix && p.id.indexOf(cat.paramPrefix) === 0) return true;
    }
    return false;
  }

  function jsonByteSize(data) {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch (e) {
      return 0;
    }
  }

  function formatBytes(bytes) {
    var n = Math.max(0, bytes || 0);
    if (n >= 1024 * 1024) return (n / (1024 * 1024)).toFixed(2) + " Mo";
    if (n === 0) return "0 Ko";
    var ko = n / 1024;
    return ko.toFixed(ko < 10 ? 1 : 0) + " Ko";
  }

  function countLabelForCategory(cat, storeData) {
    var parts = [];
    (cat.stores || []).forEach(function (store) {
      var n = storeItemsForCategory(cat, store, storeData).length;
      if (store === "classes") {
        parts.push(n + " classe" + (n !== 1 ? "s" : ""));
      } else if (store === "eleves") {
        parts.push(n + " élève" + (n !== 1 ? "s" : ""));
      } else if (store === "dispenses") {
        parts.push(n + " dispense" + (n !== 1 ? "s" : ""));
      } else if (store === "oublisMateriel") {
        parts.push(n + " oubli" + (n !== 1 ? "s" : ""));
      } else if (store === "radarPerfs") {
        parts.push(n + " perf" + (n !== 1 ? "s" : ""));
      } else if (store === "sessions") {
        parts.push(n + " séance" + (n !== 1 ? "s" : ""));
      } else if (store === "championnats") {
        parts.push(n + " championnat" + (n !== 1 ? "s" : ""));
      } else if (cat.id === "tournoi-elimination") {
        parts.push(n + " tournoi éliminatoire" + (n !== 1 ? "s" : ""));
      } else if (cat.id === "pyramide-victoires") {
        parts.push(n + " pyramide" + (n !== 1 ? "s" : ""));
      } else if (store === "importsEleves") {
        parts.push(n + " import" + (n !== 1 ? "s" : "") + " QR");
      } else if (store === "tableauxSuivi") {
        parts.push(n + " feuille" + (n !== 1 ? "s" : "") + " de suivi");
      }
    });
    var paramEntries = paramsForCategory(cat, storeData.parametres);
    if (cat.id === "composition" && paramEntries.length) {
      parts.push(paramEntries.length + " composition" + (paramEntries.length !== 1 ? "s" : ""));
    } else if (cat.id === "cahier-texte" && paramEntries.length) {
      var cahierRec = paramEntries[0];
      var seqs = Array.isArray(cahierRec.sequences) ? cahierRec.sequences : [];
      var nSeq = seqs.length;
      var nSeances = seqs.reduce(function (sum, seq) {
        return sum + (Array.isArray(seq.seances) ? seq.seances.length : 0);
      }, 0);
      if (nSeq) parts.push(nSeq + " séquence" + (nSeq !== 1 ? "s" : ""));
      if (nSeances) parts.push(nSeances + " séance" + (nSeances !== 1 ? "s" : ""));
    } else if (cat.id === "sessions" && paramEntries.length) {
      parts.push(paramEntries.length + " outil" + (paramEntries.length !== 1 ? "s" : "") + " avec séance active");
    } else {
      paramEntries.forEach(function (entry) {
        if (entry.id === PARAM_HIIT_PRESETS_ID) {
          var presets = entry.presets;
          var n = Array.isArray(presets) ? presets.length : 0;
          if (n) parts.push(n + " raccourci" + (n !== 1 ? "s" : "") + " HIIT");
        } else {
          parts.push("réglages enregistrés");
        }
      });
    }
    return parts.length ? parts.join(", ") : "Aucune donnée";
  }

  function getStorageBreakdown() {
    return Promise.all(STORE_NAMES.map(getAll)).then(function (arrays) {
      var storeData = {};
      STORE_NAMES.forEach(function (name, i) {
        storeData[name] = arrays[i];
      });

      var categories = STORAGE_CATEGORIES.map(function (cat) {
        var bytes = 0;
        (cat.stores || []).forEach(function (store) {
          bytes += jsonByteSize(storeItemsForCategory(cat, store, storeData));
        });
        bytes += jsonByteSize(paramsForCategory(cat, storeData.parametres));
        return {
          id: cat.id,
          label: cat.label,
          groupe: cat.groupe || null,
          bytes: bytes,
          countLabel: countLabelForCategory(cat, storeData),
          empty: bytes === 0,
        };
      });

      var otherParams = (storeData.parametres || []).filter(function (p) {
        return p && p.id && !isParamAssignedToStorageCategories(p, STORAGE_CATEGORIES);
      });
      if (otherParams.length) {
        categories.push({
          id: "autres",
          label: "Autres données",
          groupe: null,
          bytes: jsonByteSize(otherParams),
          countLabel: otherParams.length + " entrée" + (otherParams.length !== 1 ? "s" : ""),
          empty: false,
        });
      }

      categories = categories.filter(function (c) {
        return !c.empty;
      });

      var totalBytes = categories.reduce(function (sum, c) {
        return sum + c.bytes;
      }, 0);

      return { totalBytes: totalBytes, categories: categories };
    });
  }

  function storageLevelFromRatio(ratio) {
    if (ratio == null || ratio < 0) return "unknown";
    if (ratio >= STORAGE_QUOTA_CRITICAL_RATIO) return "critical";
    if (ratio >= STORAGE_QUOTA_WARN_RATIO) return "warning";
    if (ratio >= STORAGE_QUOTA_NOTICE_RATIO) return "notice";
    return "ok";
  }

  function getStorageEstimate() {
    if (!navigator.storage || typeof navigator.storage.estimate !== "function") {
      return Promise.resolve({
        supported: false,
        usage: null,
        quota: null,
        ratio: null,
        percent: null,
      });
    }
    return navigator.storage
      .estimate()
      .then(function (est) {
        var usage = est.usage || 0;
        var quota = est.quota || 0;
        var ratio = quota > 0 ? usage / quota : null;
        var percent = ratio != null ? Math.round(ratio * 100) : null;
        return {
          supported: true,
          usage: usage,
          quota: quota,
          ratio: ratio,
          percent: percent,
          level: storageLevelFromRatio(ratio),
        };
      })
      .catch(function () {
        return {
          supported: false,
          usage: null,
          quota: null,
          ratio: null,
          percent: null,
          level: "unknown",
        };
      });
  }

  function getStorageOverview() {
    return Promise.all([getStorageBreakdown(), getStorageEstimate()]).then(function (results) {
      var breakdown = results[0];
      var estimate = results[1];
      return {
        breakdown: breakdown,
        estimate: estimate,
        level: estimate.level || "unknown",
      };
    });
  }

  function storageAlertMessage(level) {
    switch (level) {
      case "critical":
        return (
          "Quota navigateur presque atteint. Les nouveaux enregistrements (imports QR, classes, etc.) " +
          "risquent d’échouer. Supprimez des données ci-dessous, en commençant par les imports élèves, " +
          "ou exportez une sauvegarde puis libérez de l’espace."
        );
      case "warning":
        return (
          "Espace de stockage bientôt saturé sur cet appareil. Pour éviter des erreurs à l’enregistrement, " +
          "supprimez les données dont vous n’avez plus besoin ou exportez une sauvegarde."
        );
      case "notice":
        return (
          "Plus de la moitié du quota navigateur estimé est utilisé. Surveillez l’espace ou supprimez " +
          "d’anciennes données si vous accumulez beaucoup d’imports."
        );
      default:
        return "";
    }
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
        var ops = all
          .filter(function (p) {
            return p && p.id && !isParamAssignedToStorageCategories(p, STORAGE_CATEGORIES);
          })
          .map(function (p) {
            return deleteParametre(p.id);
          });
        return Promise.all(ops);
      });
    }

    var ops = [];
    (cat.stores || []).forEach(function (store) {
      if (typeof cat.storeFilter === "function") {
        ops.push(
          getAll(store).then(function (all) {
            return Promise.all(
              all.filter(cat.storeFilter).map(function (item) {
                return deleteItem(store, item.id);
              })
            );
          })
        );
      } else {
        ops.push(clearStore(store));
      }
    });
    ops.push(
      getAll("parametres").then(function (all) {
        return Promise.all(
          paramsForCategory(cat, all).map(function (p) {
            return deleteParametre(p.id);
          })
        );
      })
    );
    return Promise.all(ops);
  }

  var IRC =
    typeof ImportRecordCore !== "undefined"
      ? ImportRecordCore
      : {
          buildStoredImport: function (r, gen) {
            return {
              item: {
                id: r.id || gen("import"),
                exportId: String(r.exportId),
                toolId: String(r.toolId),
                createdAt: r.createdAt || new Date().toISOString(),
                importedAt: r.importedAt || new Date().toISOString(),
                classeLabel: (r.classeLabel || "").trim(),
                groupeLabel: (r.groupeLabel || "").trim(),
                auteurLabel: (r.auteurLabel || "").trim(),
                checksum: r.checksum || "",
                payload: r.payload,
              },
            };
          },
          matchesFilters: function () {
            return true;
          },
          sortImportsNewestFirst: function (list) {
            return list || [];
          },
        };

  function normalizeImportedRecord(record) {
    var built = IRC.buildStoredImport(record, genererId);
    if (built.error) return Promise.reject(new Error(built.error));
    return Promise.resolve(built.item);
  }

  function saveImportedRecord(record) {
    return normalizeImportedRecord(record).then(function (item) {
      return addItem("importsEleves", item).then(function () {
        return item;
      });
    });
  }

  function hasImportedRecord(exportId) {
    if (!exportId) return Promise.resolve(false);
    return requireDb().then(function () {
      return new Promise(function (resolve, reject) {
        var tx = transaction(["importsEleves"], "readonly");
        var store = tx.objectStore("importsEleves");
        if (!store.indexNames.contains("exportId")) {
          getAll("importsEleves")
            .then(function (all) {
              resolve(
                all.some(function (r) {
                  return r && r.exportId === exportId;
                })
              );
            })
            .catch(reject);
          return;
        }
        var idx = store.index("exportId");
        var req = idx.getAll(exportId);
        req.onsuccess = function () {
          resolve((req.result || []).length > 0);
        };
        req.onerror = function () {
          reject(wrapDbError(req.error));
        };
      });
    });
  }

  function getImportedRecords(filters) {
    filters = filters || {};
    return getAll("importsEleves").then(function (all) {
      var list = (all || []).filter(function (r) {
        return IRC.matchesFilters(r, filters);
      });
      return IRC.sortImportsNewestFirst(list);
    });
  }

  function deleteImportedRecord(id) {
    return deleteItem("importsEleves", id);
  }

  function getImportedRecord(id) {
    if (!id) return Promise.resolve(null);
    return getItem("importsEleves", id);
  }

  function updateImportedRecord(id, patch) {
    if (!id) return Promise.reject(new Error("Import introuvable."));
    return getImportedRecord(id).then(function (item) {
      if (!item) return Promise.reject(new Error("Import introuvable."));
      return updateItem("importsEleves", Object.assign({}, item, patch || {}));
    });
  }

  function clearImportedRecords(filters) {
    if (
      !filters ||
      (!filters.toolId && !filters.classeLabel && !filters.groupeLabel && !filters.auteurLabel)
    ) {
      return clearStore("importsEleves");
    }
    return getImportedRecords(filters).then(function (list) {
      return Promise.all(
        list.map(function (r) {
          return deleteImportedRecord(r.id);
        })
      );
    });
  }

  function exportImportsElevesJson() {
    return getImportedRecords().then(function (list) {
      return {
        metadata: {
          app: APP_NAME,
          kind: "imports-eleves",
          exportedAt: new Date().toISOString(),
        },
        importsEleves: list,
      };
    });
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
    previewBackupImport: previewBackupImport,
    importBackupMerge: importBackupMerge,
    importBackupFromFile: importBackupFromFile,
    pickAndImportBackup: pickAndImportBackup,
    validateBackup: validateBackup,
    getClasses: getClasses,
    getClasseById: getClasseById,
    addClasse: addClasse,
    updateClasse: updateClasse,
    deleteClasse: deleteClasse,
    setClasseArchived: setClasseArchived,
    getElevesFromClasse: getElevesFromClasse,
    updateEleve: updateEleve,
    getDispenses: getDispenses,
    saveDispenses: saveDispenses,
    getOublisMateriel: getOublisMateriel,
    saveOublisMateriel: saveOublisMateriel,
    getRadarPerfs: getRadarPerfs,
    saveRadarPerfs: saveRadarPerfs,
    migrateRadarPerfsFromParametres: migrateRadarPerfsFromParametres,
    getTableauxSuivi: getTableauxSuivi,
    saveTableauxSuivi: saveTableauxSuivi,
    SESSION_TOOLS: SC.SESSION_TOOLS,
    SessionsCore: SC,
    getSessionById: getSessionById,
    listSessionsByTool: listSessionsByTool,
    listRecentSessionsByTool: function (toolId, limit) {
      return listSessionsByTool(toolId, { limit: limit || 20 });
    },
    getActiveSessionId: getActiveSessionId,
    setActiveSessionId: setActiveSessionId,
    createSession: createSession,
    updateSessionRecord: updateSessionRecord,
    renameSession: renameSession,
    setSessionArchived: setSessionArchived,
    openSession: openSession,
    deleteSession: deleteSession,
    getChampionnatForSession: getChampionnatForSession,
    saveChampionnatForSession: saveChampionnatForSession,
    getChampionnatActif: getChampionnatActif,
    saveChampionnatActif: saveChampionnatActif,
    duplicateChampionnatSession: duplicateChampionnatSession,
    getTournoiForSession: getTournoiForSession,
    saveTournoiForSession: saveTournoiForSession,
    getCompositionForSession: getCompositionForSession,
    saveCompositionForSession: saveCompositionForSession,
    getPyramideForSession: getPyramideForSession,
    savePyramideForSession: savePyramideForSession,
    getPhotoFinishForSession: getPhotoFinishForSession,
    savePhotoFinishForSession: savePhotoFinishForSession,
    getRelaisForSession: getRelaisForSession,
    saveRelaisForSession: saveRelaisForSession,
    getPyramideVictoires: getPyramideVictoires,
    savePyramideVictoires: savePyramideVictoires,
    getCourseOrientationForSession: getCourseOrientationForSession,
    saveCourseOrientationForSession: saveCourseOrientationForSession,
    duplicateCourseOrientationSession: duplicateCourseOrientationSession,
    getDefiAtpForSession: getDefiAtpForSession,
    saveDefiAtpForSession: saveDefiAtpForSession,
    PYRAMIDE_VICTOIRES_ID: PYRAMIDE_VICTOIRES_ID,
    getParametre: getParametre,
    saveParametre: saveParametre,
    getSyntheseIdentityAliases: getSyntheseIdentityAliases,
    saveSyntheseIdentityAlias: saveSyntheseIdentityAlias,
    SYNTHESE_ALIASES_ID: SYNTHESE_ALIASES_ID,
    deleteParametre: deleteParametre,
    STORAGE_CATEGORIES: STORAGE_CATEGORIES,
    STORAGE_GROUP_ORDER: STORAGE_GROUP_ORDER,
    formatBytes: formatBytes,
    getStorageBreakdown: getStorageBreakdown,
    getStorageEstimate: getStorageEstimate,
    getStorageOverview: getStorageOverview,
    storageAlertMessage: storageAlertMessage,
    storageErrorMessage: storageErrorMessage,
    isQuotaExceededError: isQuotaExceededError,
    clearStorageCategory: clearStorageCategory,
    saveImportedRecord: saveImportedRecord,
    getImportedRecords: getImportedRecords,
    getImportedRecord: getImportedRecord,
    updateImportedRecord: updateImportedRecord,
    deleteImportedRecord: deleteImportedRecord,
    clearImportedRecords: clearImportedRecords,
    hasImportedRecord: hasImportedRecord,
    exportImportsElevesJson: exportImportsElevesJson,
  };
})();
