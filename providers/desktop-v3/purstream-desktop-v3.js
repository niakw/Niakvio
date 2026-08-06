/* NUVIO_DESKTOP_PURSTREAM_TEST_PROXY_V3 */
;(function(g, config){
  "use strict";
  var installed = null;
  var loading = null;

  async function proxy(){
    if(!installed){
      if(!loading){
        loading = (async function(){
          var response = await g.fetch(config.loaderUrl, {
            headers: {"Accept":"text/javascript,*/*;q=0.8"}
          });
          if(!response || Number(response.status) >= 400){
            throw new Error("DesktopV3 loader fetch failed: " + (response && response.status));
          }
          var source = await response.text();
          if(!source || source.length < 32) throw new Error("DesktopV3 loader empty");
          (0, eval)(source + "\n//# sourceURL=" + config.loaderUrl);
          if(typeof g.__installNuvioDesktopManualTestV3 !== "function"){
            throw new Error("DesktopV3 installer missing");
          }
          installed = g.__installNuvioDesktopManualTestV3(config);
          g.getStreams = proxy;
          if(typeof module !== "undefined" && module.exports){
            module.exports = {getStreams: proxy};
          }
        })().catch(function(error){
          loading = null;
          throw error;
        });
      }
      await loading;
    }
    return installed.apply(this, arguments);
  }

  proxy.__nuvioDesktopPurstreamProxyV3 = true;
  g.getStreams = proxy;
  if(typeof module !== "undefined" && module.exports){
    module.exports = {getStreams: proxy};
  }
})(typeof globalThis !== "undefined" ? globalThis : this, {
  "provider":"purstream",
  "loaderUrl":"https://raw.githubusercontent.com/niakw/Niakvio/f5ca21c9b07d0e8f738c64594f05481c98824e45/providers/runtime/desktop-manual-test-loader-v3.js",
  "sourceUrl":"https://raw.githubusercontent.com/niakw/Niakvio/ac38674974ad44dfd2423963e8b28e49e658f913/providers/purstream--published-baseline--8e14e434a2868d4f.js",
  "normalizeMissingEpisodes":true,
  "fallbackSeason":1,
  "fallbackEpisode":1,
  "fetchReplacements":{
    "api.purstream.club":"api.purstream.art",
    "purstream.club":"purstream.art"
  }
});
