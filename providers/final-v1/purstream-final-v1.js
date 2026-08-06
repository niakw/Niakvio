/* NUVIO_FINAL_PROVIDER_PROXY_V1 */
;(function(g,config){
  "use strict";
  var installed=null,loading=null;
  async function proxy(){
    if(!installed){
      if(!loading){
        loading=(async function(){
          var response=await g.fetch(config.loaderUrl,{headers:{"Accept":"text/javascript,*/*;q=0.8"}});
          if(!response||Number(response.status)>=400)throw new Error("FinalRepair loader fetch failed: "+(response&&response.status));
          var source=await response.text();
          if(!source||source.length<32)throw new Error("FinalRepair loader empty");
          (0,eval)(source+"\n//# sourceURL="+config.loaderUrl);
          if(typeof g.__installNuvioFinalRepairV1!=="function")throw new Error("FinalRepair installer missing");
          installed=g.__installNuvioFinalRepairV1(config);
          g.getStreams=proxy;
          if(typeof module!=="undefined"&&module.exports)module.exports={getStreams:proxy};
        })().catch(function(error){loading=null;throw error;});
      }
      await loading;
    }
    return installed.apply(this,arguments);
  }
  proxy.__nuvioFinalRepairProxyV1=true;
  g.getStreams=proxy;
  if(typeof module!=="undefined"&&module.exports)module.exports={getStreams:proxy};
})(typeof globalThis!=="undefined"?globalThis:this,{"provider":"purstream","loaderUrl":"https://raw.githubusercontent.com/niakw/Niakvio/1976f9c55d90ff8316ae2378b158454e91185ab1/providers/runtime/final-provider-repair-v1.js","sourceUrl":"https://raw.githubusercontent.com/niakw/Niakvio/ac38674974ad44dfd2423963e8b28e49e658f913/providers/purstream--published-baseline--8e14e434a2868d4f.js","normalizeMissingEpisodes":true,"fallbackSeason":1,"fallbackEpisode":1,"domainFailover":{"match":"api.purstream.club","replacePrefix":"api.purstream.","rewriteSiteMatch":"purstream.club","rewriteSitePrefix":"purstream.","suffixes":["store","club","mx","ch","ac","cx","art","co","me","to"]}});
