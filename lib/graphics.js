/*
 * @prettier
 */

'use strict';

const _ = require(`lodash`);
const pug = require(`pug`);
const jsdom = require(`jsdom`);
const { JSDOM } = jsdom;

const path = require(`path`);

const Params = require(`./params.js`);
const Url = require(`./url.js`);

const conf = require(`../conf/conf.json`);

let Self = {};

/**
 * Build ASAP pie graphic
 * @param {object} opts - Available options
 * @param {string} opts.data - Data sent to the template
 * @param {string} opts.data.urls.current - Current Url of the graphic (including token)
 * @param {string} opts.data.urls.document - Public Url of the document
 * @param {string} opts.data.urls.report - Report data of the document (use DocumentsController.getReportData())
 * @param {boolean} opts.data.render - Render done by the server (default: false)
 * @returns {string} TEmplate filled with data (Mardown format)
 */
Self.buildASAPPie = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `data`) === `undefined`) return new Error(`Missing required data: opts.data`);
  if (typeof _.get(opts, `data`) === `undefined`) return new Error(`Missing required data: opts.data`);
  // Check all optionnal data
  if (typeof _.get(opts, `data.urls`) === `undefined`) opts.data.urls = {};
  if (typeof _.get(opts, `data.urls.document`) === `undefined`) opts.data.urls.document = ``;
  if (typeof _.get(opts, `data.urls.report`) === `undefined`) opts.data.urls.report = ``;
  if (typeof _.get(opts, `data.urls.current`) === `undefined`) opts.data.urls.current = ``;
  if (typeof _.get(opts, `data.render`) === `undefined`) opts.data.render = false;
  if (!opts.data.render)
    return cb(
      null,
      pug.renderFile(path.join(__dirname, `../views/graphics/asap/pie.pug`), {
        conf: conf,
        document_url: opts.data.urls.document,
        assessed_at: new Date().toUTCString(),
        report_url: opts.data.urls.report
      })
    );
  const virtualConsole = new jsdom.VirtualConsole(); // Will disable console
  const dom = new JSDOM(
    pug.renderFile(path.join(__dirname, `../views/graphics/asap/pie.pug`), {
      conf: conf,
      document_url: opts.data.urls.document,
      assessed_at: new Date().toUTCString(),
      report_url: opts.data.urls.report
    }),
    {
      virtualConsole: virtualConsole,
      url: opts.data.urls.current,
      resources: `usable`,
      runScripts: `dangerously`
    }
  );
  if (!dom) return cb(null, new Error(`graphic not built`));
  dom.window.document.addEventListener(`build`, () => {
    return cb(null, dom.serialize());
  });
  dom.window.onerror = function (msg, url, noLigne, noColonne, erreur) {
    return cb(new Error(`Error while rendering`));
  };
  virtualConsole.on(`error`, () => {
    return cb(new Error(`Error while rendering`));
  });
};

module.exports = Self;
