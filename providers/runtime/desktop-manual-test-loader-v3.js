/* NUVIO_DESKTOP_MANUAL_TEST_LOADER_V3 */
;(function(g){
  "use strict";
  if(!g || g.__installNuvioDesktopManualTestV3) return;

  function positive(value, fallback){
    var n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
  }

  function normalizeCall(args){
    var first = args && args.length ? args[0] : null;
    if(first && typeof first === "object" && !Array.isArray(first)){
      return {
        tmdbId: first.tmdbId != null ? first.tmdbId :
          (first.tmdb_id != null ? first.tmdb_id : first.id),
        mediaType: first.mediaType != null ? first.mediaType :
          (first.type != null ? first.type : first.category),
        season: first.season,
        episode: first.episode
      };
    }
    return {
      tmdbId: args ? args[0] : undefined,
      mediaType: args ? args[1] : undefined,
      season: args ? args[2] : undefined,
      episode: args ? args[3] : undefined
    };
  }

  function isSeries(type){
    var value = String(type || "").toLowerCase();
    return value === "tv" || value === "series" || value === "show";
  }

  function installTimers(){
    if(typeof g.global === "undefined") g.global = g;
    if(typeof g.setTimeout !== "function"){
      g.setTimeout = function(callback, delay){
        if((Number(delay) || 0) <= 0 && typeof callback === "function" && typeof Promise !== "undefined"){
          Promise.resolve().then(callback).catch(function(){});
        }
        return 0;
      };
    }
    if(typeof g.clearTimeout !== "function") g.clearTimeout = function(){};
    if(typeof g.setInterval !== "function") g.setInterval = function(){ return 0; };
    if(typeof g.clearInterval !== "function") g.clearInterval = function(){};
  }

  function fetchShimSource(replacements){
    if(!replacements || typeof replacements !== "object" || !Object.keys(replacements).length) return "";
    return [
      "const __NUVIO_DESKTOP_V3_NATIVE_FETCH = globalThis.fetch.bind(globalThis);",
      "const __NUVIO_DESKTOP_V3_REWRITES = " + JSON.stringify(replacements) + ";",
      "const fetch = function(input, init){",
      "  let next = input;",
      "  try {",
      "    let raw = (input && typeof input === 'object' && input.url) ? String(input.url) : String(input);",
      "    Object.keys(__NUVIO_DESKTOP_V3_REWRITES).forEach(function(from){",
      "      raw = raw.split(String(from)).join(String(__NUVIO_DESKTOP_V3_REWRITES[from]));",
      "    });",
      "    if(input && typeof input === 'object' && input.url && typeof Request !== 'undefined') next = new Request(raw, input);",
      "    else next = raw;",
      "  } catch(_error) {}",
      "  return __NUVIO_DESKTOP_V3_NATIVE_FETCH(next, init);",
      "};"
    ].join("\n") + "\n";
  }

  g.__installNuvioDesktopManualTestV3 = function(config){
    installTimers();
    var original = null;
    var loading = null;
    var wrapped;

    wrapped = async function(){
      var call = normalizeCall(arguments);
      var series = isSeries(call.mediaType);
      if(series && config.normalizeMissingEpisodes !== false){
        call.season = positive(call.season, config.fallbackSeason || 1);
        call.episode = positive(call.episode, config.fallbackEpisode || 1);
      }
      console.log("[DesktopV3:" + config.provider + "] call tmdb=" + call.tmdbId +
        " type=" + call.mediaType + " S" + call.season + "E" + call.episode);

      if(!original){
        if(!loading){
          loading = (async function(){
            var response = await g.fetch(config.sourceUrl, {headers:{"Accept":"text/javascript,*/*;q=0.8"}});
            if(!response || Number(response.status) >= 400) throw new Error("DesktopV3 source fetch failed: " + (response && response.status));
            var source = await response.text();
            if(!source || source.length < 32) throw new Error("DesktopV3 source empty");
            source = fetchShimSource(config.fetchReplacements) + source;

            var beforeGlobal = g.getStreams;
            (0, eval)(source + "\n//# sourceURL=" + config.sourceUrl);

            var candidate = null;
            if(typeof g.getStreams === "function" && g.getStreams !== wrapped && g.getStreams !== beforeGlobal) candidate = g.getStreams;
            if(!candidate && typeof module !== "undefined" && module.exports && typeof module.exports.getStreams === "function") candidate = module.exports.getStreams;
            if(!candidate && g.__provider && typeof g.__provider.getStreams === "function") candidate = g.__provider.getStreams;

            g.getStreams = wrapped;
            if(typeof module !== "undefined" && module.exports) module.exports = {getStreams: wrapped};
            if(!candidate) throw new Error("DesktopV3 original getStreams missing");
            original = candidate;
            console.log("[DesktopV3:" + config.provider + "] source installed");
            return candidate;
          })().catch(function(error){ loading = null; throw error; });
        }
        await loading;
      }

      var result = await original.call(this, call.tmdbId, call.mediaType, call.season, call.episode);
      console.log("[DesktopV3:" + config.provider + "] result count=" + (Array.isArray(result) ? result.length : -1));
      return result;
    };

    wrapped.__nuvioDesktopManualTestV3 = true;
    return wrapped;
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
