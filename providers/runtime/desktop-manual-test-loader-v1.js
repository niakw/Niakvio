/* NUVIO_DESKTOP_MANUAL_TEST_LOADER_V1 */
;(function(g){
  "use strict";
  if(!g || g.__installNuvioDesktopManualTestV1) return;

  g.__installNuvioDesktopManualTestV1 = function(config){
    if(typeof g.global === "undefined") g.global = g;
    if(typeof g.setTimeout !== "function"){
      g.setTimeout = function(callback, delay){
        if((Number(delay)||0) <= 0 && typeof callback === "function" && typeof Promise !== "undefined"){
          Promise.resolve().then(callback).catch(function(){});
        }
        return 0;
      };
    }
    if(typeof g.clearTimeout !== "function") g.clearTimeout = function(){};
    if(typeof g.setInterval !== "function") g.setInterval = function(){ return 0; };
    if(typeof g.clearInterval !== "function") g.clearInterval = function(){};

    if(config.domainReplacements && typeof g.fetch === "function"){
      var state = g.__nuvioDesktopManualFetchV1;
      if(!state){
        state = {nativeFetch:g.fetch.bind(g), rules:Object.create(null)};
        g.__nuvioDesktopManualFetchV1 = state;
        g.fetch = function(input, init){
          var next = input;
          try{
            var raw = (typeof Request !== "undefined" && input instanceof Request) ? input.url : String(input);
            var url = new URL(raw);
            var replacement = state.rules[String(url.hostname).toLowerCase()];
            if(replacement){
              url.hostname = replacement;
              next = (typeof Request !== "undefined" && input instanceof Request)
                ? new Request(url.toString(), input)
                : url.toString();
            }
          }catch(_error){}
          return state.nativeFetch(next, init);
        };
      }
      Object.keys(config.domainReplacements).forEach(function(source){
        state.rules[String(source).toLowerCase()] =
          String(config.domainReplacements[source]).toLowerCase();
      });
    }

    function positive(value, fallback){
      var number = Number(value);
      return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
    }
    function seriesType(type){
      var value = String(type||"").toLowerCase();
      return value === "tv" || value === "series" || value === "show";
    }
    function streamText(stream){
      if(!stream || typeof stream !== "object") return "";
      return [stream.name,stream.title,stream.description,stream.size,stream.url]
        .filter(function(value){ return value != null; }).join(" ");
    }
    function episodeMatch(stream, season, episode){
      var text = streamText(stream);
      if(!text) return false;
      var s = String(season), e = String(episode);
      var patterns = [
        new RegExp("S0*"+s+"\\s*E0*"+e,"i"),
        new RegExp("\\b0*"+s+"x0*"+e+"\\b","i"),
        new RegExp("saison\\s*0*"+s+"[^0-9]{0,16}(?:episode|ep)\\s*0*"+e,"i"),
        new RegExp("season\\s*0*"+s+"[^0-9]{0,16}(?:episode|ep)\\s*0*"+e,"i")
      ];
      for(var i=0;i<patterns.length;i++) if(patterns[i].test(text)) return true;
      return false;
    }

    var original = null, loading = null, wrapped;
    wrapped = async function(tmdbId, mediaType, season, episode){
      var isSeries = seriesType(mediaType);
      if(isSeries){
        season = positive(season,1);
        episode = positive(episode,1);
      }
      if(!original){
        if(!loading){
          loading = (async function(){
            var response = await g.fetch(config.sourceUrl,{
              headers:{"Accept":"text/javascript,*/*;q=0.8"}
            });
            if(!response || Number(response.status)>=400){
              throw new Error("manual source fetch failed: "+(response&&response.status));
            }
            var source = await response.text();
            if(!source || source.length<32) throw new Error("manual source empty");

            var beforeGlobal = g.getStreams;
            var beforeModule = (typeof module!=="undefined" && module.exports)
              ? module.exports.getStreams : null;
            (0,eval)(source+"\n//# sourceURL="+config.sourceUrl);

            var candidate = null;
            if(typeof g.getStreams==="function" &&
               g.getStreams!==wrapped && g.getStreams!==beforeGlobal) candidate=g.getStreams;
            if(!candidate && typeof module!=="undefined" && module.exports &&
               typeof module.exports.getStreams==="function" &&
               module.exports.getStreams!==wrapped &&
               module.exports.getStreams!==beforeModule) candidate=module.exports.getStreams;
            if(!candidate && g.__provider && typeof g.__provider.getStreams==="function"){
              candidate=g.__provider.getStreams;
            }
            if(!candidate) throw new Error("manual original getStreams missing");

            original=candidate;
            g.getStreams=wrapped;
            if(typeof module!=="undefined" && module.exports) module.exports={getStreams:wrapped};
            return candidate;
          })().catch(function(error){ loading=null; throw error; });
        }
        await loading;
      }

      var result = await original.call(this,tmdbId,mediaType,season,episode);
      if(!isSeries || !Array.isArray(result)) return result;
      var output=result;
      if(config.filterEpisodeLabels){
        var exact=result.filter(function(stream){ return episodeMatch(stream,season,episode); });
        if(exact.length) output=exact;
      }
      if(config.maxSeriesStreams>0 && output.length>config.maxSeriesStreams){
        output=output.slice(0,config.maxSeriesStreams);
      }
      return output;
    };

    wrapped.__nuvioDesktopManualTestV1=true;
    return wrapped;
  };
})(typeof globalThis!=="undefined"?globalThis:this);
