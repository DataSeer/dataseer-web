/*
 * @prettier
 */

'use strict';

const URLMANAGER = {
  getParamsOfCurrentURL: function () {
    let currentUrl = new URL(window.location.href),
      result = {};
    for (let key of currentUrl.searchParams.keys()) {
      result[key] = currentUrl.searchParams.getAll(key);
    }
    for (let key in result) {
      if (result[key].length === 1) result[key] = result[key][0];
    }
    return result;
  },
  buildURL: function (url, params = {}, opts = {}) {
    let currentUrl = new URL(window.location.href); // get the current URL
    let root = typeof opts.root === `string` && opts.root.length > 0 ? opts.root : CONF.root; // get the root of the URL
    let fullUrl = urljoin(root, url);
    let result = new URL(fullUrl); // get the current URL
    // Add params into the new URL
    for (let key in params) {
      if (typeof params[key] !== `undefined`) {
        result.searchParams.append(key, params[key]);
      }
    }
    // Add token (from the current URL) in the new URL if there is no token specified in params
    if (!params.token && opts.setToken) {
      let currentToken = currentUrl.searchParams.get(`token`);
      if (currentToken) result.searchParams.append(`token`, currentToken);
    }
    // if specified, keep origin in the URL
    if (opts.origin) return result.href;
    // else, use the pathname (to disable "bad origin" bugs)
    else {
      let p = result.searchParams.toString();
      return `${result.pathname}${p ? `?${p}` : ``}`;
    }
  },
  buildParams: function (params = {}) {
    let currentUrl = new URL(window.location.href.split(`?`)[0]); // get the current URL (without params)
    // Add params into the new URL
    for (let key in params) {
      if (typeof params[key] !== `undefined`) {
        if (typeof currentUrl.searchParams.get(key) !== `undefined`) currentUrl.searchParams.set(key, params[key]);
        else currentUrl.searchParams.append(key, params[key]);
      }
    }
    return `?${currentUrl.searchParams.toString()}`;
  },
  extractIdsFromCurrentURL: function () {
    let matches = window.location.href.toString().match(/(\w+\/[0-9a-f]{24})/gm);
    return Array.isArray(matches)
      ? matches.reduce(function (acc, item) {
        let split = item.split(`/`);
        if (split.length === 2) acc[split[0]] = split[1];
        return acc;
      }, {})
      : {};
  }
};
