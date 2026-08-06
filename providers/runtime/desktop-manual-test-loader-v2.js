/* NUVIO_DESKTOP_MANUAL_TEST_LOADER_V2 */
;(function(g){
  "use strict";
  if(!g || g.__installNuvioDesktopManualTestV2) return;

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

  function textOf(stream){
    if(!stream || typeof stream !== "object") return "";
    return [
      stream.name, stream.title, stream.description,
      stream.size, stream.url
    ].filter(function(v){ return v != null; }).join(" ");
  }

  function episodeMatch(stream, season, episode){
    var text = textOf(stream);
    if(!text) return false;
    var s = String(season), e = String(episode);
    var patterns = [
      new RegExp("S0*" + s + "\\s*E0*" + e, "i"),
      new RegExp("\\b0*" + s + "x0*" + e + "\\b", "i"),
      new RegExp("saison\\s*0*" + s + "[^0-9]{0,16}(?:episode|ep)\\s*0*" + e, "i"),
      new RegExp("season\\s*0*" + s + "[^0-9]{0,16}(?:episode|ep)\\s*0*" + e, "i")
    ];
    for(var i = 0; i < patterns.length; i++){
      if(patterns[i].test(text)) return true;
    }
    return false;
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

  function applySourceReplacements(source, replacements){
    var output = String(source || "");
    if(!replacements || typeof replacements !== "object") return output;
    Object.keys(replacements).forEach(function(from){
      var to = String(replacements[from]);
      output = output.split(String(from)).join(to);
    });
    return output;
  }

  g.__installNuvioDesktopManualTestV2 = function(config){
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

      if(typeof console !== "undefined" && console.log){
        console.log("[DesktopV2:" + config.provider + "] call tmdb=" + call.tmdbId +
          " type=" + call.mediaType + " S" + call.season + "E" + call.episode);
      }

      if(!original){
        if(!loading){
          loading = (async function(){
            var response = await g.fetch(config.sourceUrl, {
              headers: {"Accept":"text/javascript,*/*;q=0.8"}
            });
            if(!response || Number(response.status) >= 400){
              throw new Error("DesktopV2 source fetch failed: " + (response && response.status));
            }
            var source = await response.text();
            source = applySourceReplacements(source, config.sourceReplacements);
            if(!source || source.length < 32){
              throw new Error("DesktopV2 source empty");
            }

            var beforeGlobal = g.getStreams;
            (0, eval)(source + "\n//# sourceURL=" + config.sourceUrl);

            var candidate = null;
            if(typeof g.getStreams === "function" &&
               g.getStreams !== wrapped &&
               g.getStreams !== beforeGlobal){
              candidate = g.getStreams;
            }
            if(!candidate && typeof module !== "undefined" &&
               module.exports && typeof module.exports.getStreams === "function"){
              candidate = module.exports.getStreams;
            }
            if(!candidate && g.__provider && typeof g.__provider.getStreams === "function"){
              candidate = g.__provider.getStreams;
            }

            g.getStreams = wrapped;
            if(typeof module !== "undefined" && module.exports){
              module.exports = {getStreams: wrapped};
            }
            if(!candidate) throw new Error("DesktopV2 original getStreams missing");

            original = candidate;
            if(typeof console !== "undefined" && console.log){
              console.log("[DesktopV2:" + config.provider + "] source installed");
            }
            return candidate;
          })().catch(function(error){
            loading = null;
            throw error;
          });
        }
        await loading;
      }

      var result = await original.call(
        this,
        call.tmdbId,
        call.mediaType,
        call.season,
        call.episode
      );

      if(series && Array.isArray(result)){
        var output = result;
        if(config.filterEpisodeLabels){
          var exact = result.filter(function(stream){
            return episodeMatch(stream, call.season, call.episode);
          });
          if(exact.length) output = exact;
        }
        if(Number(config.maxSeriesStreams) > 0 &&
           output.length > Number(config.maxSeriesStreams)){
          output = output.slice(0, Number(config.maxSeriesStreams));
        }
        result = output;
      }

      if(typeof console !== "undefined" && console.log){
        console.log("[DesktopV2:" + config.provider + "] result count=" +
          (Array.isArray(result) ? result.length : -1));
      }
      return result;
    };

    wrapped.__nuvioDesktopManualTestV2 = true;
    return wrapped;
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
