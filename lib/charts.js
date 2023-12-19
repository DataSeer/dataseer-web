/*
 * @prettier
 */

'use strict';

const _ = require(`lodash`);
const pug = require(`pug`);
const puppeteer = require(`puppeteer`);

const path = require(`path`);

const Params = require(`./params.js`);
const Url = require(`./url.js`);

const conf = require(`../conf/conf.json`);
const chartsConf = require(`../conf/charts.json`);

let Self = {};

/**
 * Build ASAP pie graphic
 * @param {object} opts - Available options
 * @param {string} opts.data - Data sent to the template
 * @param {string} opts.data.urls.current - Current Url of the graphic (including token)
 * @param {string} opts.data.urls.document - Public Url of the document
 * @param {string} opts.data.urls.report - Report data of the document (use DocumentsController.getReportData())
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: HTML string OR undefined)
 * @returns {undefined} undefined
 */
Self.buildASAPPie = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  // Check all optionnal data
  if (typeof _.get(opts, `data.urls`) === `undefined`) opts.data.urls = {};
  if (typeof _.get(opts, `data.urls.document`) === `undefined`) opts.data.urls.document = ``;
  if (typeof _.get(opts, `data.urls.report`) === `undefined`) opts.data.urls.report = ``;
  if (typeof _.get(opts, `data.urls.current`) === `undefined`) opts.data.urls.current = ``;
  return cb(
    null,
    pug.renderFile(path.join(__dirname, `../views/charts/asap/pie.pug`), {
      conf: conf,
      document_url: opts.data.urls.document,
      assessed_at: new Date().toUTCString(),
      report_url: opts.data.urls.report
    })
  );
};

/**
 * Build rendered ASAP pie graphic
 * @param {object} opts - Available options
 * @param {string} opts.render - Convert HTML to image
 * @param {string} opts.url - Current Url of the graphic (including token)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: HTML string (or Buffer) OR undefined)
 * @returns {undefined} undefined
 */
Self.buildRenderedASAPPie = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `url`) === `undefined`) return cb(new Error(`Missing required data: opts.url`));
  if (typeof _.get(opts, `render`) === `undefined`) opts.render = { type: `html` };
  if (
    typeof _.get(opts, `render.type`) === `undefined` ||
    !(opts.render.type === `jpeg` || opts.render.type === `png` || opts.render.type === `webp`)
  )
    opts.render.type = chartsConf.render.type;
  if (
    typeof _.get(opts, `render.quality`) === `undefined` ||
    isNaN(opts.render.quality) ||
    opts.render.quality > 100 ||
    opts.render.quality < 0
  )
    opts.render.quality = chartsConf.render.quality;
  if (
    typeof _.get(opts, `render.width`) === `undefined` ||
    isNaN(opts.render.width) ||
    opts.render.width > 1920 ||
    opts.render.width <= 0
  )
    opts.render.width = chartsConf.render.width;
  if (
    typeof _.get(opts, `render.height`) === `undefined` ||
    isNaN(opts.render.height) ||
    opts.render.height > 1080 ||
    opts.render.height <= 0
  )
    opts.render.height = chartsConf.render.height;
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Build viewport params
    let viewportOpts = {};
    if (opts.render.width) viewportOpts.width = opts.render.width;
    if (opts.render.height) viewportOpts.height = opts.render.height;
    if (Object.keys(viewportOpts).length > 0) await page.setViewport(viewportOpts);

    await page.on(`pageerror`, function (err) {
      console.log(err);
      (async () => {
        await browser.close();
        return cb(err);
      })();
    });

    // Define a window.onCustomEvent function on the page.
    await page.exposeFunction(`onCustomEvent`, (e) => {
      if (e.type === `build`) {
        (async () => {
          if (opts.render.type === `jpeg` || opts.render.type === `png` || opts.render.type === `webp`) {
            // c.f. https://pptr.dev/#?product=Puppeteer&version=v11.0.0&show=api-pagescreenshotoptions
            let image = await page.screenshot({
              type: opts.render.type,
              quality: opts.render.type === `jpeg` || opts.render.type === `webp` ? opts.render.quality : undefined
            });
            await browser.close();
            return cb(null, image);
          } else {
            let html = await page.content();
            await browser.close();
            return cb(null, html);
          }
        })();
      }
    });

    /**
     * Attach an event listener to page to capture a custom event on page load/navigation.
     * @param {string} type Event name.
     * @returns {!Promise}
     */
    function listenFor(type) {
      return page.evaluateOnNewDocument((type) => {
        document.addEventListener(type, (e) => {
          window.onCustomEvent({ type, detail: e.detail });
        });
      }, type);
    }

    await listenFor(`build`); // Listen for "app-ready" custom event on page load.
    await page.goto(opts.url);
  })();
};

/**
 * Build Generic pie graphic
 * @param {object} opts - Available options
 * @param {string} opts.data - Data sent to the template
 * @param {string} opts.data.urls.current - Current Url of the graphic (including token)
 * @param {string} opts.data.urls.document - Public Url of the document
 * @param {string} opts.data.urls.report - Report data of the document (use DocumentsController.getReportData())
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: HTML string OR undefined)
 * @returns {undefined} undefined
 */
Self.buildGenericPie = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `data`) === `undefined`) return cb(new Error(`Missing required data: opts.data`));
  // Check all optionnal data
  if (typeof _.get(opts, `data.urls`) === `undefined`) opts.data.urls = {};
  if (typeof _.get(opts, `data.urls.document`) === `undefined`) opts.data.urls.document = ``;
  if (typeof _.get(opts, `data.urls.report`) === `undefined`) opts.data.urls.report = ``;
  if (typeof _.get(opts, `data.urls.current`) === `undefined`) opts.data.urls.current = ``;
  return cb(
    null,
    pug.renderFile(path.join(__dirname, `../views/charts/generic/pie.pug`), {
      conf: conf,
      document_url: opts.data.urls.document,
      assessed_at: new Date().toUTCString(),
      report_url: opts.data.urls.report
    })
  );
};

/**
 * Build rendered Generic pie graphic
 * @param {object} opts - Available options
 * @param {string} opts.render - Convert HTML to image
 * @param {string} opts.url - Current Url of the graphic (including token)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: HTML string (or Buffer) OR undefined)
 * @returns {undefined} undefined
 */
Self.buildRenderedGenericPie = function (opts = {}, cb) {
  // Check all required data
  if (typeof _.get(opts, `url`) === `undefined`) return cb(new Error(`Missing required data: opts.url`));
  if (typeof _.get(opts, `render`) === `undefined`) opts.render = { type: `html` };
  if (
    typeof _.get(opts, `render.type`) === `undefined` ||
    !(opts.render.type === `jpeg` || opts.render.type === `png` || opts.render.type === `webp`)
  )
    opts.render.type = chartsConf.render.type;
  if (
    typeof _.get(opts, `render.quality`) === `undefined` ||
    isNaN(opts.render.quality) ||
    opts.render.quality > 100 ||
    opts.render.quality < 0
  )
    opts.render.quality = chartsConf.render.quality;
  if (
    typeof _.get(opts, `render.width`) === `undefined` ||
    isNaN(opts.render.width) ||
    opts.render.width > 1920 ||
    opts.render.width <= 0
  )
    opts.render.width = chartsConf.render.width;
  if (
    typeof _.get(opts, `render.height`) === `undefined` ||
    isNaN(opts.render.height) ||
    opts.render.height > 1080 ||
    opts.render.height <= 0
  )
    opts.render.height = chartsConf.render.height;
  (async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Build viewport params
    let viewportOpts = {};
    if (opts.render.width) viewportOpts.width = opts.render.width;
    if (opts.render.height) viewportOpts.height = opts.render.height;
    if (Object.keys(viewportOpts).length > 0) await page.setViewport(viewportOpts);

    await page.on(`pageerror`, function (err) {
      console.log(err);
      (async () => {
        await browser.close();
        return cb(err);
      })();
    });

    // Define a window.onCustomEvent function on the page.
    await page.exposeFunction(`onCustomEvent`, (e) => {
      if (e.type === `build`) {
        (async () => {
          if (opts.render.type === `jpeg` || opts.render.type === `png` || opts.render.type === `webp`) {
            // c.f. https://pptr.dev/#?product=Puppeteer&version=v11.0.0&show=api-pagescreenshotoptions
            let image = await page.screenshot({
              type: opts.render.type,
              quality: opts.render.type === `jpeg` || opts.render.type === `webp` ? opts.render.quality : undefined
            });
            await browser.close();
            return cb(null, image);
          } else {
            let html = await page.content();
            await browser.close();
            return cb(null, html);
          }
        })();
      }
    });

    /**
     * Attach an event listener to page to capture a custom event on page load/navigation.
     * @param {string} type Event name.
     * @returns {!Promise}
     */
    function listenFor(type) {
      return page.evaluateOnNewDocument((type) => {
        document.addEventListener(type, (e) => {
          window.onCustomEvent({ type, detail: e.detail });
        });
      }, type);
    }

    await listenFor(`build`); // Listen for "app-ready" custom event on page load.
    await page.goto(opts.url);
  })();
};

module.exports = Self;
