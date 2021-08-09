/*
 * @prettier
 */

'use strict';

const fetch = require(`node-fetch`);
const FormData = require(`form-data`);
const _ = require(`lodash`);
const pug = require(`pug`);
const jsdom = require(`jsdom`);
const { JSDOM } = jsdom;

const path = require(`path`);

const Params = require(`./params.js`);
const Url = require(`./url.js`);

const service = require(`../conf/services/hypothesis.json`);

let Self = {};

/**
 * Find all annotaions linked to the given URL
 * @param {object} opts - Available options
 * @param {string} opts.url - Given URL
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: json response OR undefined)
 * @returns {undefined} undefined
 */
Self.findAnnotations = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(service, `root`) === `undefined`) return cb(new Error(`Missing required data: service.root`));
  if (typeof _.get(service, `user`) === `undefined`) return cb(new Error(`Missing required data: service.user`));
  if (typeof _.get(service, `routes.search`) === `undefined`)
    return cb(new Error(`Missing required data: service.routes.search`));
  if (typeof _.get(opts, `url`) === `undefined`) return cb(new Error(`Missing required data: opts.url`));
  // Call "search" URL
  let url = Url.build(service.routes.search, { user: service.user, uri: opts.url }, service.root);
  return fetch(url, {
    method: `GET`,
    headers: { 'Authorization': `Bearer ${service.token}` }
  })
    .then(function (res) {
      // res.status >= 200 && res.status < 300
      if (res.ok) return res;
      throw new Error(res.statusText);
    })
    .then(function (res) {
      return res.json();
    })
    .then(function (json) {
      return cb(null, json);
    })
    .catch(function (err) {
      return cb(err);
    });
};

/**
 * Find an annotaion linked to the given URL
 * @param {object} opts - Available options
 * @param {string} opts.url - Given URL
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: json response OR undefined)
 * @returns {undefined} undefined
 */
Self.findAnnotation = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `url`) === `undefined`) return cb(new Error(`Missing required data: opts.url`));
  return Self.findAnnotations(opts, function (err, res) {
    if (err) return cb(err);
    if (!res.rows) cb(null, new Error(`Unable to find annotation`));
    else {
      if (res.rows.length > 0) return cb(null, res.rows[0]);
      else return cb();
    }
  });
};

/**
 * Create an annotaion
 * @param {object} opts - Available options
 * @param {string} opts.url - Given URL
 * @param {string} opts.text - Given Text
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: json response OR undefined)
 * @returns {undefined} undefined
 */
Self.createAnnotation = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(service, `root`) === `undefined`) return cb(new Error(`Missing required data: service.root`));
  if (typeof _.get(service, `annotations.selectors`) === `undefined`)
    return cb(new Error(`Missing required data: service.annotations.selectors`));
  if (typeof _.get(service, `annotations.group`) === `undefined`)
    return cb(new Error(`Missing required data: service.annotations.group`));
  if (typeof _.get(service, `user`) === `undefined`) return cb(new Error(`Missing required data: service.user`));
  if (typeof _.get(service, `routes.create`) === `undefined`)
    return cb(new Error(`Missing required data: service.routes.create`));
  if (typeof _.get(opts, `url`) === `undefined`) return cb(new Error(`Missing required data: opts.url`));
  if (typeof _.get(opts, `text`) === `undefined`) return cb(new Error(`Missing required data: opts.text`));
  return fetch(opts.url)
    .then(function (res) {
      // res.status >= 200 && res.status < 300
      if (res.ok) return res;
      throw new Error(res.statusText);
    })
    .then(function (res) {
      return res.text();
    })
    .then(function (htmlString) {
      const dom = new JSDOM(htmlString);
      if (!dom) return cb(null, new Error(`Bad URL: Invalid HTML`));
      let elem = dom.window.document.getElementById(`${service.annotations.selectors.title}`);
      let title = elem ? elem.textContent : ``;
      let text = dom.window.document.querySelector(`html`).textContent;
      let arr = text.split(`${title}`);
      let textQuoteSelector, textPositionSelector;
      if (arr.length > 4) {
        textQuoteSelector = Object.assign({}, service.annotations.selectors.TextQuoteSelector, {
          prefix: arr[arr.length - 5].substr(arr[arr.length - 5].length - 32),
          exact: title,
          suffix: arr[arr.length - 4].substring(0, 32)
        });
        let start = arr.slice(0, arr.length - 4).reduce((acc, item) => acc + item.length, 0);
        let end = start + title.length;
        textPositionSelector = Object.assign({}, service.annotations.selectors.TextPositionSelector, {
          end: end,
          start: start
        });
      }
      let rangeSelector = Object.assign({}, service.annotations.selectors.RangeSelector, {
        startOffset: 0,
        endOffset: title.length
      });
      // Call "create" URL
      let url = Url.build(service.routes.create, {}, service.root);
      return fetch(url, {
        method: `POST`,
        body: JSON.stringify({
          uri: opts.url,
          text: opts.text,
          group: service.annotations.group,
          document: { title: title },
          target: [{ source: opts.url, selector: [rangeSelector, textQuoteSelector, textPositionSelector] }]
        }),
        headers: { 'Authorization': `Bearer ${service.token}` }
      })
        .then(function (res) {
          // res.status >= 200 && res.status < 300
          if (res.ok) return res;
          throw new Error(res.statusText);
        })
        .then(function (res) {
          return res.json();
        })
        .then(function (json) {
          return cb(null, json);
        })
        .catch(function (err) {
          return cb(err);
        });
    })
    .catch(function (err) {
      return cb(err);
    });
};

/**
 * update an annotaion
 * @param {object} opts - Available options
 * @param {string} opts.id - Annotation id
 * @param {string} opts.url - Given URL
 * @param {string} opts.text - Given Text
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: json response OR undefined)
 * @returns {undefined} undefined
 */
Self.updateAnnotation = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(service, `root`) === `undefined`) return cb(new Error(`Missing required data: service.root`));
  if (typeof _.get(service, `user`) === `undefined`) return cb(new Error(`Missing required data: service.user`));
  if (typeof _.get(service, `routes.update`) === `undefined`)
    return cb(new Error(`Missing required data: service.routes.update`));
  if (typeof _.get(opts, `id`) === `undefined`) return cb(new Error(`Missing required data: opts.id`));
  if (typeof _.get(opts, `url`) === `undefined`) return cb(new Error(`Missing required data: opts.url`));
  if (typeof _.get(opts, `text`) === `undefined`) return cb(new Error(`Missing required data: opts.text`));
  // Call "update" URL
  let url = Url.build(service.routes.update.replace(`{id}`, opts.id), {}, service.root);
  return fetch(url, {
    method: `PATCH`,
    body: JSON.stringify({ uri: opts.url, text: opts.text }),
    headers: { 'Authorization': `Bearer ${service.token}` }
  })
    .then(function (res) {
      // res.status >= 200 && res.status < 300
      if (res.ok) return res;
      throw new Error(res.statusText);
    })
    .then(function (res) {
      return res.json();
    })
    .then(function (json) {
      return cb(null, json);
    })
    .catch(function (err) {
      return cb(err);
    });
};

/**
 * Delete an annotaion
 * @param {object} opts - Available options
 * @param {string} opts.id - Annotation id
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: json response OR undefined)
 * @returns {undefined} undefined
 */
Self.deleteAnnotation = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(service, `root`) === `undefined`) return cb(new Error(`Missing required data: service.root`));
  if (typeof _.get(service, `user`) === `undefined`) return cb(new Error(`Missing required data: service.user`));
  if (typeof _.get(service, `routes.delete`) === `undefined`)
    return cb(new Error(`Missing required data: service.routes.delete`));
  if (typeof _.get(opts, `id`) === `undefined`) return cb(new Error(`Missing required data: opts.url`));
  // Call "delete" URL
  let url = Url.build(service.routes.delete.replace(`{id}`, opts.id), {}, service.root);
  return fetch(url, {
    method: `DELETE`,
    headers: { 'Authorization': `Bearer ${service.token}` }
  })
    .then(function (res) {
      // res.status >= 200 && res.status < 300
      if (res.ok) return res;
      throw new Error(res.statusText);
    })
    .then(function (res) {
      return res.json();
    })
    .then(function (json) {
      return cb(null, json);
    })
    .catch(function (err) {
      return cb(err);
    });
};

/**
 * Create or update an annotaion
 * @param {object} opts - Available options
 * @param {string} opts.url - Given URL
 * @param {string} opts.text - Given Text
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: json response OR undefined)
 * @returns {undefined} undefined
 */
Self.updateOrCreateAnnotation = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `url`) === `undefined`) return cb(new Error(`Missing required data: opts.url`));
  return Self.findAnnotation(opts, function (err, res) {
    if (err) return cb(err);
    if (res instanceof Error) return cb(null, res);
    if (!res) {
      // Create new annotation
      return Self.createAnnotation({ url: opts.url, text: opts.text }, cb);
    } else {
      // Update existing annotation
      return Self.updateAnnotation({ id: res.id, url: opts.url, text: opts.text }, cb);
    }
  });
};

/**
 * Build annotation content
 * @param {object} opts - Available options
 * @param {string} opts.data - Data sent to the template
 * @param {string} opts.data.publicUrl - Public Url of the document
 * @param {string} opts.data.reportData - Report data of the document (use DocumentsController.getReportData())
 * @returns {string} TEmplate filled with data (Mardown format)
 */
Self.buildAnnotationContent = function (opts = {}) {
  // Check all required data
  if (typeof _.get(opts, `data`) === `undefined`) return new Error(`Missing required data: opts.data`);
  return pug.renderFile(path.join(__dirname, `../conf/hypothesis/bioRxiv.pug`), opts.data);
};

module.exports = Self;
