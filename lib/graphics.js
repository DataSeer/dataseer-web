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
 * @param {string} opts.data.urls.document - Public Url of the document
 * @param {string} opts.data.urls.report - Report data of the document (use DocumentsController.getReportData())
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
  // const dom = new JSDOM(
  //   pug.renderFile(path.join(__dirname, `../views/graphics/asap/pie.pug`), {
  //     conf: conf,
  //     document_url: opts.data.urls.document,
  //     assessed_at: new Date().toUTCString(),
  //     report_url: opts.data.urls.report
  //   }),
  //   {
  //     resources: `usable`,
  //     runScripts: `dangerously`
  //   }
  // );
  // if (!dom) return cb(null, new Error(`graphic not built`));
  // const _window = dom.window;
  // _window.document.addEventListener(`load`, () => {
  //   return cb(null, dom.serialize());
  // });
  return cb(
    null,
    pug.renderFile(path.join(__dirname, `../views/graphics/asap/pie.pug`), {
      conf: conf,
      document_url: opts.data.urls.document,
      assessed_at: new Date().toUTCString(),
      report_url: opts.data.urls.report
    })
  );
};

module.exports = Self;
