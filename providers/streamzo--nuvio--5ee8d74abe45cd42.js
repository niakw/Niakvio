/* NUVIO_DESKTOP_MANUAL_TEST_PROXY_V1 */
;(function(g,config){
  "use strict";
  var installed=null,loading=null;
  async function proxy(){
    if(!installed){
      if(!loading){
        loading=(async function(){
          var response=await g.fetch(config.loaderUrl,{headers:{"Accept":"text/javascript,*/*;q=0.8"}});
          if(!response||Number(response.status)>=400)throw new Error("manual loader fetch failed: "+(response&&response.status));
          var source=await response.text();
          if(!source||source.length<32)throw new Error("manual loader empty");
          (0,eval)(source+"\n//# sourceURL="+config.loaderUrl);
          if(typeof g.__installNuvioDesktopManualTestV1!=="function")throw new Error("manual loader installer missing");
          installed=g.__installNuvioDesktopManualTestV1(config);
          g.getStreams=proxy;
          if(typeof module!=="undefined"&&module.exports)module.exports={getStreams:proxy};
        })().catch(function(error){loading=null;throw error;});
      }
      await loading;
    }
    return installed.apply(this,arguments);
  }
  proxy.__nuvioDesktopManualProxyV1=true;
  g.getStreams=proxy;
  if(typeof module!=="undefined"&&module.exports)module.exports={getStreams:proxy};
})(typeof globalThis!=="undefined"?globalThis:this,{"provider":"streamzo","loaderUrl":"https://raw.githubusercontent.com/niakw/Niakvio/33959ffdddb4e30a4ade73bc567884adb526163a/providers/runtime/desktop-manual-test-loader-v1.js","sourceUrl":"https://raw.githubusercontent.com/niakw/Niakvio/ac38674974ad44dfd2423963e8b28e49e658f913/providers/streamzo--nuvio--5ee8d74abe45cd42.js","filterEpisodeLabels":false,"maxSeriesStreams":0,"domainReplacements":{}});
