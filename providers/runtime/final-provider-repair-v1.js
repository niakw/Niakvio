/* NUVIO_FINAL_PROVIDER_REPAIR_V1 */
;(function(g){
  "use strict";
  if(!g || g.__installNuvioFinalRepairV1) return;

  function log(provider, message){
    if(typeof console !== "undefined" && console.log){
      console.log("[FinalRepair:" + provider + "] " + message);
    }
  }
  function positive(value, fallback){
    var n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
  }
  function normalizeCall(args){
    var first = args && args.length ? args[0] : null;
    if(first && typeof first === "object" && !Array.isArray(first)){
      return {
        tmdbId: first.tmdbId != null ? first.tmdbId : (first.tmdb_id != null ? first.tmdb_id : first.id),
        mediaType: first.mediaType != null ? first.mediaType : (first.type != null ? first.type : first.category),
        season: first.season,
        episode: first.episode
      };
    }
    return {tmdbId:args&&args[0],mediaType:args&&args[1],season:args&&args[2],episode:args&&args[3]};
  }
  function isSeries(type){
    var v=String(type||"").toLowerCase();
    return v==="tv"||v==="series"||v==="show";
  }
  function installTimers(){
    if(typeof g.global === "undefined") g.global = g;
    if(typeof g.setTimeout !== "function"){
      g.setTimeout=function(cb, delay){
        if((Number(delay)||0)<=0 && typeof cb==="function" && typeof Promise!=="undefined"){
          Promise.resolve().then(cb).catch(function(){});
        }
        return 0;
      };
    }
    if(typeof g.clearTimeout !== "function") g.clearTimeout=function(){};
    if(typeof g.setInterval !== "function") g.setInterval=function(){return 0;};
    if(typeof g.clearInterval !== "function") g.clearInterval=function(){};
  }
  function applySourceReplacements(source, replacements){
    var out=String(source||"");
    if(!replacements||typeof replacements!=="object") return out;
    Object.keys(replacements).forEach(function(from){
      out=out.split(String(from)).join(String(replacements[from]));
    });
    return out;
  }
  function decodeUrl(value){
    var s=String(value||"").trim()
      .replace(/&#0*38;|&#x0*26;|&amp;/gi,"&")
      .replace(/\\u0026/gi,"&")
      .replace(/\\\//g,"/");
    if(s.indexOf("//")===0) s="https:"+s;
    return s;
  }
  function directMedia(url){
    var s=String(url||"").toLowerCase();
    return /\.(m3u8|mp4|mkv|webm|mpd)(?:[?#]|$)/i.test(s) ||
      s.indexOf("/master.m3u8")>=0 || s.indexOf("/hls/")>=0 || s.indexOf("/hls2/")>=0;
  }
  function decoy(url){
    var s=String(url||"").toLowerCase();
    return !s || s.indexOf("/troll/")>=0 || s.indexOf("big_buck_bunny")>=0 ||
      s.indexOf("bigbuckbunny")>=0 || s.indexOf("sample-videos")>=0 ||
      s.indexOf("test-videos")>=0 || s.indexOf("example.com")>=0 ||
      s.indexOf("localhost")>=0;
  }
  function originOf(url){
    var m=String(url||"").match(/^(https?:\/\/[^/]+)/i);
    return m?m[1]:"";
  }
  function refererFor(url, stream){
    try{
      var q=String(url||"").match(/[?&]url=([^&#]+)/i);
      if(q){
        var host=decodeURIComponent(q[1]).replace(/^https?:\/\//i,"").replace(/\/.*$/,"");
        if(host && /^[a-z0-9.-]+$/i.test(host)) return "https://"+host+"/";
      }
    }catch(e){}
    if(stream&&stream.headers){
      if(stream.headers.Referer) return stream.headers.Referer;
      if(stream.headers.referer) return stream.headers.referer;
    }
    var o=originOf(url);
    return o?o+"/":"";
  }
  function headersFor(url, stream){
    var h={};
    if(stream&&stream.headers&&typeof stream.headers==="object"){
      Object.keys(stream.headers).forEach(function(k){h[k]=stream.headers[k];});
    }
    var r=refererFor(url,stream), o=originOf(r||url);
    if(r&&!h.Referer&&!h.referer) h.Referer=r;
    if(o&&!h.Origin&&!h.origin) h.Origin=o;
    return h;
  }
  function candidateUrls(text, base){
    var s=decodeUrl(text||""), out=[], seen={};
    function add(value){
      if(!value) return;
      var u=decodeUrl(value).replace(/^['"]|['"]$/g,"");
      if(u.indexOf("//")===0) u="https:"+u;
      if(u.indexOf("/")===0 && base) u=originOf(base)+u;
      if(!/^https?:\/\//i.test(u)) return;
      if(!seen[u]){seen[u]=true;out.push(u);}
    }
    var patterns=[
      /(?:file|src|url|hls|video_url|stream_url)\s*[:=]\s*["']([^"']+\.(?:m3u8|mp4|mkv|webm|mpd)[^"']*)["']/ig,
      /sources?\s*[:=]\s*\[[\s\S]{0,800}?["'](https?:\\?\/\\?\/[^"']+\.(?:m3u8|mp4|mkv|webm|mpd)[^"']*)["']/ig,
      /<source[^>]+src=["']([^"']+)["']/ig,
      /data-(?:src|file|url)=["']([^"']+)["']/ig,
      /["'](https?:\\?\/\\?\/[^"']+\.(?:m3u8|mp4|mkv|webm|mpd)[^"']*)["']/ig
    ];
    patterns.forEach(function(rx){var m;while((m=rx.exec(s))!==null)add(m[1]);});
    return out;
  }
  function iframeUrls(text, base){
    var s=decodeUrl(text||""), out=[], seen={}, rx=/<iframe[^>]+src=["']([^"']+)["']/ig,m;
    while((m=rx.exec(s))!==null){
      var u=decodeUrl(m[1]);
      if(u.indexOf("/")===0&&base)u=originOf(base)+u;
      if(/^https?:\/\//i.test(u)&&!seen[u]){seen[u]=true;out.push(u);}
    }
    return out;
  }
  async function resolveUrl(url, stream, depth){
    url=decodeUrl(url);
    depth=Number(depth)||0;
    if(decoy(url)) return null;
    if(directMedia(url)) return {url:url,headers:headersFor(url,stream),isDirect:true};
    if(depth>2) return null;
    var resp;
    try{
      resp=await g.fetch(url,{headers:headersFor(url,stream),redirect:"follow"});
    }catch(e){return null;}
    if(!resp||Number(resp.status)>=400) return null;
    var body="";
    try{body=await resp.text();}catch(e){return null;}
    var media=candidateUrls(body,url);
    for(var i=0;i<media.length;i++){
      if(!decoy(media[i])) return {url:media[i],headers:headersFor(url,stream),isDirect:true,originalUrl:url};
    }
    var frames=iframeUrls(body,url);
    for(var j=0;j<frames.length;j++){
      if(frames[j]===url) continue;
      var nested=await resolveUrl(frames[j],stream,depth+1);
      if(nested) return nested;
    }
    return null;
  }
  function rewriteSimple(url, rewrites){
    var out=String(url||"");
    if(!rewrites||typeof rewrites!=="object") return out;
    Object.keys(rewrites).forEach(function(from){out=out.split(from).join(String(rewrites[from]));});
    return out;
  }
  function makeFetchProxy(config, nativeFetch){
    var selectedSuffix=null;
    return async function(input, init){
      var url=typeof input==="string"?input:(input&&input.url?input.url:String(input||""));
      url=decodeUrl(rewriteSimple(url,config.fetchRewrites));
      var fail=config.domainFailover;
      if(fail&&fail.match&&url.indexOf(fail.match)>=0){
        var suffixes=Array.isArray(fail.suffixes)?fail.suffixes:[];
        var order=selectedSuffix?[selectedSuffix].concat(suffixes.filter(function(s){return s!==selectedSuffix;})):suffixes;
        var lastError=null,lastResponse=null;
        for(var i=0;i<order.length;i++){
          var suffix=order[i];
          var candidate=url.replace(fail.match,fail.replacePrefix+suffix);
          if(config.provider==="purstream") log(config.provider,"probe ."+suffix+" "+candidate.slice(0,120));
          try{
            var response=await nativeFetch(candidate,init);
            lastResponse=response;
            if(response&&Number(response.status)>=200&&Number(response.status)<400){
              selectedSuffix=suffix;
              if(config.provider==="purstream") log(config.provider,"selected ."+suffix+" status="+response.status);
              return response;
            }
          }catch(e){lastError=e;}
        }
        if(lastResponse) return lastResponse;
        if(lastError) throw lastError;
      }
      if(selectedSuffix&&fail&&fail.rewriteSiteMatch&&url.indexOf(fail.rewriteSiteMatch)>=0){
        url=url.replace(fail.rewriteSiteMatch,fail.rewriteSitePrefix+selectedSuffix);
      }
      return nativeFetch(url,init);
    };
  }
  function textOf(stream){
    if(!stream||typeof stream!=="object")return"";
    return [stream.name,stream.title,stream.description,stream.size,stream.url].filter(function(v){return v!=null;}).join(" ");
  }
  function episodeMatch(stream,season,episode){
    var t=textOf(stream),s=String(season),e=String(episode);
    if(!t)return false;
    return new RegExp("S0*"+s+"\\s*E0*"+e,"i").test(t) ||
      new RegExp("\\b0*"+s+"x0*"+e+"\\b","i").test(t) ||
      new RegExp("(?:saison|season)\\s*0*"+s+"[^0-9]{0,16}(?:episode|ep)\\s*0*"+e,"i").test(t);
  }
  async function postProcess(result,config,call){
    if(!Array.isArray(result)) return [];
    var out=[], seen={};
    for(var i=0;i<result.length;i++){
      var stream=result[i];
      if(!stream||typeof stream!=="object"||!stream.url)continue;
      var url=decodeUrl(stream.url);
      if(decoy(url))continue;
      var candidate={};
      Object.keys(stream).forEach(function(k){candidate[k]=stream[k];});
      candidate.url=url;
      if(config.resolveEmbeds&&!directMedia(url)){
        var resolved=await resolveUrl(url,candidate,0);
        if(resolved){
          candidate.url=resolved.url;
          candidate.headers=resolved.headers;
          candidate.isDirect=true;
        }else if(config.dropUnresolvedEmbeds){
          continue;
        }
      }
      if(config.directOnly&&(!directMedia(candidate.url)||decoy(candidate.url)))continue;
      if(!seen[candidate.url]){seen[candidate.url]=true;out.push(candidate);}
    }
    if(isSeries(call.mediaType)&&config.filterEpisodeLabels){
      var exact=out.filter(function(s){return episodeMatch(s,call.season,call.episode);});
      if(exact.length)out=exact;
    }
    if(isSeries(call.mediaType)&&Number(config.maxSeriesStreams)>0&&out.length>Number(config.maxSeriesStreams)){
      out=out.slice(0,Number(config.maxSeriesStreams));
    }
    return out;
  }

  g.__installNuvioFinalRepairV1=function(config){
    installTimers();
    var original=null,loading=null,wrapped;
    wrapped=async function(){
      var call=normalizeCall(arguments), series=isSeries(call.mediaType);
      if(series&&config.normalizeMissingEpisodes!==false){
        call.season=positive(call.season,config.fallbackSeason||1);
        call.episode=positive(call.episode,config.fallbackEpisode||1);
      }
      log(config.provider,"call tmdb="+call.tmdbId+" type="+call.mediaType+" S"+call.season+"E"+call.episode);
      if(!original){
        if(!loading){
          loading=(async function(){
            var nativeFetch=g.fetch.bind(g);
            var response=await nativeFetch(config.sourceUrl,{headers:{"Accept":"text/javascript,*/*;q=0.8"}});
            if(!response||Number(response.status)>=400)throw new Error("source fetch failed: "+(response&&response.status));
            var source=applySourceReplacements(await response.text(),config.sourceReplacements);
            if(!source||source.length<32)throw new Error("source empty");
            var before=g.getStreams;
            g.fetch=makeFetchProxy(config,nativeFetch);
            (0,eval)(source+"\n//# sourceURL="+config.sourceUrl);
            var candidate=null;
            if(typeof g.getStreams==="function"&&g.getStreams!==wrapped&&g.getStreams!==before)candidate=g.getStreams;
            if(!candidate&&typeof module!=="undefined"&&module.exports&&typeof module.exports.getStreams==="function")candidate=module.exports.getStreams;
            if(!candidate&&g.__provider&&typeof g.__provider.getStreams==="function")candidate=g.__provider.getStreams;
            g.getStreams=wrapped;
            if(typeof module!=="undefined"&&module.exports)module.exports={getStreams:wrapped};
            if(!candidate)throw new Error("original getStreams missing");
            original=candidate;
            log(config.provider,"source installed");
          })().catch(function(e){loading=null;throw e;});
        }
        await loading;
      }
      var result=await original.call(this,call.tmdbId,call.mediaType,call.season,call.episode);
      result=await postProcess(result,config,call);
      log(config.provider,"result count="+result.length);
      return result;
    };
    wrapped.__nuvioFinalRepairV1=true;
    return wrapped;
  };
})(typeof globalThis!=="undefined"?globalThis:this);
