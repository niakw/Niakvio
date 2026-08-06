/* NUVIO_PURSTREAM_DESKTOP_V4_DYNAMIC_DOMAIN_FAILOVER */
;(function (g) {
  'use strict';

  var SOURCE_URL = 'https://raw.githubusercontent.com/niakw/Niakvio/ac38674974ad44dfd2423963e8b28e49e658f913/providers/purstream--published-baseline--8e14e434a2868d4f.js';
  var DOMAIN_SUFFIXES = ['club', 'mx', 'ch', 'ac', 'cx', 'art', 'co', 'me', 'to', 'store'];
  var nativeFetch = typeof g.fetch === 'function' ? g.fetch.bind(g) : null;
  var selectedSuffix = null;
  var installed = null;
  var loading = null;

  if (!nativeFetch) {
    throw new Error('PurstreamV4 requires fetch');
  }

  function installTimers() {
    if (typeof g.global === 'undefined') g.global = g;
    if (typeof g.setTimeout !== 'function') {
      g.setTimeout = function (callback, delay) {
        if ((Number(delay) || 0) <= 0 && typeof callback === 'function' && typeof Promise !== 'undefined') {
          Promise.resolve().then(callback).catch(function () {});
        }
        return 0;
      };
    }
    if (typeof g.clearTimeout !== 'function') g.clearTimeout = function () {};
    if (typeof g.setInterval !== 'function') g.setInterval = function () { return 0; };
    if (typeof g.clearInterval !== 'function') g.clearInterval = function () {};
  }

  function inputUrl(input) {
    if (typeof input === 'string') return input;
    if (input && typeof input.url === 'string') return input.url;
    return String(input || '');
  }

  function isPurstreamUrl(url) {
    return /^https?:\/\/(?:api\.)?purstream\.[^/]+/i.test(String(url || ''));
  }

  function rewriteUrl(url, suffix) {
    return String(url || '')
      .replace(/https?:\/\/api\.purstream\.[^/]+/i, 'https://api.purstream.' + suffix)
      .replace(/https?:\/\/purstream\.[^/]+/i, 'https://purstream.' + suffix);
  }

  function rewriteHeaderValue(value, suffix) {
    if (typeof value !== 'string') return value;
    return rewriteUrl(value, suffix);
  }

  function rewriteInit(init, suffix) {
    if (!init || typeof init !== 'object') return init;
    var copy = {};
    Object.keys(init).forEach(function (key) { copy[key] = init[key]; });
    if (init.headers && typeof init.headers === 'object' && !Array.isArray(init.headers)) {
      copy.headers = {};
      Object.keys(init.headers).forEach(function (key) {
        copy.headers[key] = rewriteHeaderValue(init.headers[key], suffix);
      });
    }
    return copy;
  }

  function suffixOrder() {
    var order = [];
    if (selectedSuffix) order.push(selectedSuffix);
    DOMAIN_SUFFIXES.forEach(function (suffix) {
      if (order.indexOf(suffix) === -1) order.push(suffix);
    });
    return order;
  }

  async function purstreamFetch(input, init) {
    var url = inputUrl(input);
    if (!isPurstreamUrl(url)) return nativeFetch(input, init);

    var order = suffixOrder();
    var lastResponse = null;
    var lastError = null;

    for (var i = 0; i < order.length; i += 1) {
      var suffix = order[i];
      var candidateUrl = rewriteUrl(url, suffix);
      try {
        if (typeof console !== 'undefined' && console.log) {
          console.log('[PurstreamV4] probe ' + candidateUrl);
        }
        var response = await nativeFetch(candidateUrl, rewriteInit(init, suffix));
        lastResponse = response;
        if (response && response.ok) {
          selectedSuffix = suffix;
          if (typeof console !== 'undefined' && console.log) {
            console.log('[PurstreamV4] selected .' + suffix + ' status=' + response.status);
          }
          return response;
        }
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[PurstreamV4] rejected .' + suffix + ' status=' + (response && response.status));
        }
      } catch (error) {
        lastError = error;
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[PurstreamV4] failed .' + suffix + ': ' + (error && error.message ? error.message : error));
        }
      }
    }

    if (lastResponse) return lastResponse;
    throw lastError || new Error('PurstreamV4: no reachable official domain');
  }

  installTimers();
  g.fetch = purstreamFetch;

  async function proxy() {
    if (!installed) {
      if (!loading) {
        loading = (async function () {
          var response = await nativeFetch(SOURCE_URL, { headers: { Accept: 'text/javascript,*/*;q=0.8' } });
          if (!response || !response.ok) {
            throw new Error('PurstreamV4 source fetch failed: ' + (response && response.status));
          }
          var source = await response.text();
          if (!source || source.length < 32) throw new Error('PurstreamV4 source empty');

          var before = g.getStreams;
          (0, eval)(source + '\n//# sourceURL=' + SOURCE_URL);

          var candidate = null;
          if (typeof g.getStreams === 'function' && g.getStreams !== proxy && g.getStreams !== before) {
            candidate = g.getStreams;
          }
          if (!candidate && typeof module !== 'undefined' && module.exports && typeof module.exports.getStreams === 'function') {
            candidate = module.exports.getStreams;
          }
          if (!candidate && g.__provider && typeof g.__provider.getStreams === 'function') {
            candidate = g.__provider.getStreams;
          }
          if (!candidate) throw new Error('PurstreamV4 original getStreams missing');

          installed = candidate;
          g.getStreams = proxy;
          if (typeof module !== 'undefined' && module.exports) module.exports = { getStreams: proxy };
          if (typeof console !== 'undefined' && console.log) console.log('[PurstreamV4] source installed');
        })().catch(function (error) {
          loading = null;
          throw error;
        });
      }
      await loading;
    }

    var result = await installed.apply(this, arguments);
    if (typeof console !== 'undefined' && console.log) {
      console.log('[PurstreamV4] result count=' + (Array.isArray(result) ? result.length : -1) +
        ' selected=' + (selectedSuffix ? '.' + selectedSuffix : 'none'));
    }
    return result;
  }

  proxy.__nuvioPurstreamDesktopV4 = true;
  g.getStreams = proxy;
  if (typeof module !== 'undefined' && module.exports) module.exports = { getStreams: proxy };
})(typeof globalThis !== 'undefined' ? globalThis : this);
