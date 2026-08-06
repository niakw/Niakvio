/* NUVIO_DESKTOP_MANUAL_TEST_PROXY_V2 */
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
            throw new Error("DesktopV2 loader fetch failed: " + (response && response.status));
          }
          var source = await response.text();
          if(!source || source.length < 32) throw new Error("DesktopV2 loader empty");
          (0, eval)(source + "\n//# sourceURL=" + config.loaderUrl);
          if(typeof g.__installNuvioDesktopManualTestV2 !== "function"){
            throw new Error("DesktopV2 installer missing");
          }
          installed = g.__installNuvioDesktopManualTestV2(config);
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

  proxy.__nuvioDesktopManualProxyV2 = true;
  g.getStreams = proxy;
  if(typeof module !== "undefined" && module.exports){
    module.exports = {getStreams: proxy};
  }
})(typeof globalThis !== "undefined" ? globalThis : this, {"provider":"hindmoviez","loaderUrl":"https://raw.githubusercontent.com/niakw/Niakvio/dc5cd6b481d3d14faee376a614d23d24e56f3dae/providers/runtime/desktop-manual-test-loader-v2.js","sourceUrl":"https://raw.githubusercontent.com/niakw/Niakvio/ac38674974ad44dfd2423963e8b28e49e658f913/providers/hindmoviez--aio--86b8c3a4dff3c98c.js","normalizeMissingEpisodes":true,"fallbackSeason":1,"fallbackEpisode":1,"filterEpisodeLabels":true,"maxSeriesStreams":24,"sourceReplacements":{}});
