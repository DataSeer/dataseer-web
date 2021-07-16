/*
 * @prettier
 */

'use strict';

const URLMANAGER = {
  getParamsOfCurrentURL: function () {
    let currentUrl = new URL(window.location.href),
      result = {};
    for (let key of currentUrl.searchParams.keys()) {
      result[key] = currentUrl.searchParams.get(key);
    }
    return result;
  },
  buildURL: function (url, params = {}, opts = {}) {
    let currentUrl = new URL(window.location.href), // get the current URL
      result = new URL(url, currentUrl.origin); // will contain the new URL
    // Add params into the new URL
    for (let key in params) {
      if (typeof params[key] !== `undefined`) {
        // if (typeof params[key] === `object`) result.searchParams.append(key, JSON.stringify(params[key]));
        // else if (Array.isArray(params[key])) result.searchParams.append(key, params[key].join(`,`));
        // else result.searchParams.append(key, params[key]);
        result.searchParams.append(key, params[key]);
      }
    }
    // Add token (from the current URL) in the new URL if there is no token specified in params
    if (!params.token && opts.setToken) {
      let currentToken = currentUrl.searchParams.get(`token`);
      if (currentToken) result.searchParams.append(`token`, currentToken);
    }
    return result.href;
  },
  buildParams: function (params = {}) {
    let currentUrl = new URL(window.location.href); // get the current URL
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
    return matches.reduce(function (acc, item) {
      let split = item.split(`/`);
      if (split.length === 2) acc[split[0]] = split[1];
      return acc;
    }, {});
  }
};