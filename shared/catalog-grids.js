/**
 * Catalogue collaboratif : envoi, chargement et votes via Supabase.
 */
(function (global) {
  "use strict";

  var ns = global.OutilsEPS || (global.OutilsEPS = {});
  var catalog = ns.catalog || (ns.catalog = {});
  var VOTER_ID_KEY = "outilseps_voter_id";
  var LOCAL_VOTES_KEY = "outilseps_catalog_grid_votes_v1";

  function cleanName(s) {
    return String(s == null ? "" : s)
      .replace(/\s+/g, " ")
      .trim();
  }

  function randomId() {
    if (global.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "v_" + Date.now() + "_" + Math.random().toString(36).slice(2, 12);
  }

  /** Identifiant anonyme du navigateur (localStorage). */
  catalog.getVoterFingerprint = function () {
    try {
      var id = localStorage.getItem(VOTER_ID_KEY);
      if (id && id.length >= 8) return id;
      id = randomId();
      localStorage.setItem(VOTER_ID_KEY, id);
      return id;
    } catch (e) {
      return randomId();
    }
  };

  function loadLocalVoteMap() {
    try {
      var raw = localStorage.getItem(LOCAL_VOTES_KEY);
      var obj = raw ? JSON.parse(raw) : {};
      return obj && typeof obj === "object" ? obj : {};
    } catch (e) {
      return {};
    }
  }

  function saveLocalVote(gridId, voteType) {
    try {
      var map = loadLocalVoteMap();
      if (voteType) map[gridId] = voteType;
      else delete map[gridId];
      localStorage.setItem(LOCAL_VOTES_KEY, JSON.stringify(map));
    } catch (e) {
      /* ignore */
    }
  }

  catalog.getLocalVoteForGrid = function (gridId) {
    return loadLocalVoteMap()[gridId] || null;
  };

  function mapRowToRubric(row) {
    var data = row.grid_data && typeof row.grid_data === "object" ? row.grid_data : {};
    return {
      id: row.id,
      catalogGridId: row.id,
      title: row.title || data.title || "Grille",
      apsa: row.activity || data.apsa || "",
      cycle: data.cycle || "",
      niveau: row.level || data.niveau || "",
      author: row.author_name || "",
      source: "catalog",
      updatedAt: row.updated_at || row.created_at || "",
      createdAt: row.created_at || "",
      levels: Array.isArray(data.levels) ? data.levels : [],
      items: Array.isArray(data.items) ? data.items : [],
      upvotes: Number(row.upvotes || 0),
      downvotes: Number(row.downvotes || 0),
      status: row.status,
      gridHash: row.grid_hash,
    };
  }

  function userMessageFromValidation(errors) {
    if (!errors || !errors.length) return "La grille n'a pas pu être proposée au catalogue.";
    var e = errors[0];
    if (e.indexOf("3 lignes") !== -1 || e.indexOf("3 colonnes") !== -1 || e.indexOf("vide") !== -1) {
      return "La grille n'a pas été proposée au catalogue car elle est trop petite.";
    }
    if (e.indexOf("interdit") !== -1 || e.indexOf("renseignés") !== -1) {
      return "La grille n'a pas été proposée au catalogue car elle contient du contenu non autorisé.";
    }
    if (e.indexOf("volumineuse") !== -1) {
      return "La grille n'a pas été proposée au catalogue car elle est trop volumineuse.";
    }
    return "La grille n'a pas été proposée au catalogue : " + e;
  }

  function isDuplicateError(err) {
    var code = err && (err.code || (err.data && err.data.code));
    return (
      err &&
      (err.status === 409 ||
        code === "23505" ||
        (err.message && err.message.indexOf("duplicate") !== -1) ||
        (err.message && err.message.indexOf("unique") !== -1))
    );
  }

  /**
   * @param {object} grid - rubrique normalisée
   * @param {object} options
   * @param {boolean} options.shareToCatalog - défaut true si omis
   * @param {string} options.source - 'teacher' | 'outilseps'
   */
  catalog.submitGridToCatalog = function (grid, options) {
    options = options || {};
    if (options.shareToCatalog === false) {
      return Promise.resolve({ submitted: false, skipped: true, message: "" });
    }
    if (!ns.isSupabaseConfigured || !ns.isSupabaseConfigured()) {
      return Promise.resolve({
        submitted: false,
        message: "Catalogue en ligne non configuré (Supabase).",
      });
    }

    var validation = catalog.validateGridForCatalog
      ? catalog.validateGridForCatalog(grid, options)
      : { valid: false, errors: ["Validation indisponible."] };

    if (!validation.valid) {
      return Promise.resolve({
        submitted: false,
        errors: validation.errors,
        message: userMessageFromValidation(validation.errors),
      });
    }

    var source = options.source === "outilseps" ? "outilseps" : "teacher";
    var authorName = source === "outilseps" ? "OutilsEPS" : "Enseignant1";
    var levelText = validation.levelText || cleanName(grid.niveau || grid.cycle || "");

    return catalog.generateGridHash(grid).then(function (hash) {
      var payload = {
        title: cleanName(grid.title),
        activity: cleanName(grid.apsa),
        level: levelText,
        author_name: authorName,
        source: source,
        grid_data: grid,
        grid_hash: hash,
        rows_count: validation.rowsCount,
        columns_count: validation.columnsCount,
        status: "published",
      };

      return ns
        .supabaseRest("catalog_grids", "", {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: payload,
        })
        .then(function (rows) {
          return {
            submitted: true,
            message: "Grille ajoutée au catalogue enseignant.",
            row: Array.isArray(rows) ? rows[0] : rows,
          };
        })
        .catch(function (err) {
          if (isDuplicateError(err)) {
            return {
              submitted: false,
              duplicate: true,
              message: "Cette grille semble déjà présente dans le catalogue.",
            };
          }
          return {
            submitted: false,
            message: (err && err.message) || "Envoi au catalogue impossible.",
            error: err,
          };
        });
    });
  };

  /** Grilles publiées depuis Supabase. */
  catalog.loadPublishedCatalogGrids = function () {
    if (!ns.isSupabaseConfigured || !ns.isSupabaseConfigured()) {
      return Promise.resolve([]);
    }
    var query =
      "?select=id,created_at,updated_at,title,activity,level,author_name,source,grid_data,grid_hash,rows_count,columns_count,status,upvotes,downvotes" +
      "&status=eq.published" +
      "&order=created_at.desc";
    return ns.supabaseRest("catalog_grids", query).then(function (rows) {
      return (Array.isArray(rows) ? rows : []).map(mapRowToRubric);
    });
  };

  /**
   * @param {string} gridId - uuid Supabase
   * @param {'up'|'down'} voteType
   */
  catalog.voteCatalogGrid = function (gridId, voteType) {
    if (!ns.isSupabaseConfigured || !ns.isSupabaseConfigured()) {
      return Promise.reject(new Error("Supabase non configuré."));
    }
    var fingerprint = catalog.getVoterFingerprint();
    return ns
      .supabaseRpc("vote_catalog_grid", {
        p_grid_id: gridId,
        p_vote_type: voteType,
        p_voter_fingerprint: fingerprint,
      })
      .then(function (result) {
        if (result && result.vote_type) saveLocalVote(gridId, result.vote_type);
        if (result && result.status === "archived") saveLocalVote(gridId, null);
        return result;
      });
  };

  /** Fusion catalogue Supabase + JSON statique legacy si Supabase vide ou non configuré. */
  catalog.loadCatalogWithLegacyFallback = function (legacyUrl) {
    var legacy = legacyUrl || "../shared/evaluation-rubrics-catalog.json";
    var configured = ns.isSupabaseConfigured && ns.isSupabaseConfigured();
    return catalog
      .loadPublishedCatalogGrids()
      .then(function (online) {
        if (online.length) return online;
        if (configured) return [];
        if (global.navigator && global.navigator.onLine === false) return [];
        return fetch(legacy, { cache: "no-store" })
        .then(function (res) {
          if (!res.ok) throw new Error("legacy");
          return res.json();
        })
        .then(function (data) {
          var list = Array.isArray(data) ? data : data.rubrics || [];
          return list.map(function (r) {
            r = r && typeof r === "object" ? r : {};
            r.source = "catalog";
            r.upvotes = r.upvotes || 0;
            r.downvotes = r.downvotes || 0;
            return r;
          });
        })
        .catch(function () {
          return [];
        });
      })
      .catch(function (err) {
        if (global.navigator && global.navigator.onLine === false) return [];
        return fetch(legacy, { cache: "no-store" })
          .then(function (res) {
            if (!res.ok) throw err || new Error("legacy");
            return res.json();
          })
          .then(function (data) {
            var list = Array.isArray(data) ? data : data.rubrics || [];
            list = list.map(function (r) {
              r = r && typeof r === "object" ? r : {};
              r.source = "catalog";
              r.catalogLegacyFallback = true;
              return r;
            });
            if (list.length) return list;
            throw err || new Error("catalog");
          })
          .catch(function () {
            throw err || new Error("catalog");
          });
      });
  };
})(typeof window !== "undefined" ? window : global);
