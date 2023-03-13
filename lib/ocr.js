/*
 * @prettier
 */

'use strict';

const fs = require(`fs`);
const path = require(`path`);

const async = require(`async`);
const _ = require(`lodash`);
const pdfjsLib = require(`pdfjs-dist/legacy/build/pdf.js`);
const { Image, createCanvas } = require(`canvas`);
const Tesseract = require(`tesseract.js`);

const conf = require(`../conf/conf.json`);
const OCRConf = require(`../conf/ocr.json`);

let Self = {};

Self.SCHEDULER;
Self.WORKERS = [];
Self.ready = false;

// Init tesseract workers & scheduler
Self.init = function (cb) {
  if (Self.ready) return cb(null, Self.ready);
  Self.SCHEDULER = Tesseract.createScheduler({
    langPath: path.resolve(__dirname, `../`, OCRConf.tesseract.langPath)
  });
  Self.WORKERS = Array(OCRConf.tesseract.workers)
    .fill(0)
    .map(function (item) {
      return Tesseract.createWorker({
        langPath: path.resolve(__dirname, `../`, OCRConf.tesseract.langPath)
      });
    });
  // Do not use 'parallel' method ([lang].traineddate file bug)
  return async.mapSeries(
    Self.WORKERS,
    function (worker, next) {
      (async function () {
        await worker.load();
        await worker.loadLanguage(`eng`);
        await worker.initialize(`eng`);
        Self.SCHEDULER.addWorker(worker);
        return next();
      })();
    },
    function (err) {
      if (err) return cb(err);
      console.log(`${Self.WORKERS.length} worker(s) initialized`);
      Self.ready = !err;
      return cb(null, Self.ready);
    }
  );
};

// Terminate tesseract workers & scheduler
Self.destroy = function (cb) {
  (async () => {
    await Self.SCHEDULER.terminate();
    return cb();
  })();
};

/**
 * Filter pages
 * @param {array} pages - List of pages that will be filtered
 * @returns {array} List of filtered pages
 */
Self.filterPages = function (pages) {
  let filteredPages = [];
  for (let i = 0; i < pages.length; i++) {
    let item = pages[i];
    if (typeof item === `string`) {
      let parsedPage = parseInt(item);
      if (!isNaN(parsedPage)) filteredPages.push({ p: parsedPage });
    } else if (typeof item === `number`) {
      if (item > -1) filteredPages.push({ p: item });
    } else if (typeof item === `object`) {
      if (!item.p && isNaN(item.p)) continue;
      if (
        (!item.x && isNaN(item.x)) ||
        (!item.y && isNaN(item.y)) ||
        (!item.h && isNaN(item.h)) ||
        (!item.w && isNaN(item.w)) ||
        (!item.scale && isNaN(item.scale))
      )
        filteredPages.push({ id: process.hrtime.bigint().toString(), p: item.p });
      else
        filteredPages.push({
          id: process.hrtime.bigint().toString(),
          p: item.p,
          x: item.x,
          y: item.y,
          h: item.h,
          w: item.w,
          scale: item.scale
        });
    }
  }
  return filteredPages;
};

/**
 * Regroup pages
 * @param {array} pages - List of filtered pages
 * @returns {array} List of filtered pages
 */
Self.regroupPages = function (pages) {
  let mapping = {};
  let regroupedPages = [];
  for (let i = 0; i < pages.length; i++) {
    let item = pages[i];
    if (!item.p && isNaN(item.p)) continue;
    if (typeof mapping[item.p] === `undefined`) {
      regroupedPages.push({ number: item.p, areas: [item] });
      mapping[item.p] = regroupedPages.length - 1;
    } else {
      regroupedPages[mapping[item.p]].areas.push(item);
    }
  }
  return regroupedPages;
};

/**
 * Process a PDF (OCR)
 * @param {string} pdfPath - Path of the PDF file
 * @param {array} pages - List of pages that will be processed
 * @param {function} cb - Callback function(err) (err: error process OR OCR result (the list of "OCRized" pages, containing words & lines data))
 * @returns {undefined} undefined
 */
Self.processPDF = function (pdfPath, pages, cb) {
  if (!Self.ready) return cb(new Error(`tesseract.js workers not ready`));
  let filteredPages = Self.filterPages(pages);
  if (filteredPages.length < 1) return cb(null, new Error(`You must at least process one page`));
  let regroupedPages = Self.regroupPages(filteredPages);
  const scale = OCRConf.tesseract.scale;
  return fs.readFile(pdfPath, function (err, buffer) {
    if (err) return cb(err);
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    return loadingTask.promise.then(
      function (doc) {
        const numPages = doc.numPages;
        let pages = [];
        return async.mapLimit(
          regroupedPages,
          OCRConf.tesseract.mapLimit.pages,
          function (page, next) {
            if (isNaN(page.number)) {
              pages.push(new Error(`Invalid page number : ${page.number} (wrong format)`));
              return next();
            }
            if (page.number > numPages || page.number < 1) {
              pages.push(new Error(`Invalid page number : ${page.number} (out of the range [1-${numPages}])`));
              return next();
            }
            return doc.getPage(page.number).then(function (pdfPage) {
              const viewport = pdfPage.getViewport({ scale: scale }); // Take are of scale -> coordinates could be "wrong"
              const pageCanvas = createCanvas(viewport.width, viewport.height);
              const pageContext = pageCanvas.getContext(`2d`);
              return pdfPage
                .render({
                  canvasContext: pageContext,
                  viewport: viewport
                })
                .promise.then(function () {
                  if (!Array.isArray(page.areas) || page.areas.length < 0) return next();
                  let areas = page.areas.map((area) => {
                    if (isNaN(area.x) || isNaN(area.y) || isNaN(area.w) || isNaN(area.h) || isNaN(area.scale)) {
                      return {
                        id: area.id,
                        x: 0,
                        y: 0,
                        w: viewport.width,
                        h: viewport.height,
                        p: page.number,
                        scale: scale,
                        buffer: pageCanvas.toBuffer(OCRConf.canvas.format, OCRConf.canvas.opts)
                      };
                    }
                    const width = (area.w / area.scale) * scale;
                    const height = (area.h / area.scale) * scale;
                    const x = (area.x / area.scale) * scale;
                    const y = (area.y / area.scale) * scale;
                    let areaCanvas = createCanvas(width, height);
                    let areaContext = areaCanvas.getContext(`2d`);
                    areaContext.putImageData(pageContext.getImageData(x, y, width, height), 0, 0);
                    return {
                      id: area.id,
                      x: x,
                      y: y,
                      w: width,
                      h: height,
                      p: area.p,
                      scale: scale,
                      buffer: areaCanvas.toBuffer(OCRConf.canvas.format, OCRConf.canvas.opts)
                    };
                  });
                  let res = {
                    page: page.number,
                    scale: scale,
                    words: [],
                    lines: [],
                    areas: []
                  };
                  return async.mapLimit(
                    areas,
                    OCRConf.tesseract.mapLimit.images,
                    function (area, _next) {
                      let imgBuffer = Buffer.from(area.buffer, `base64`);
                      (async () => {
                        return Self.SCHEDULER.addJob(`recognize`, imgBuffer)
                          .then(function (detection) {
                            const deltaX = area.x;
                            const deltaY = area.y;
                            let words = detection.data.words.map(function (word) {
                              return {
                                text: word.text,
                                bbox: {
                                  x0: word.bbox.x0 + deltaX,
                                  y0: word.bbox.y0 + deltaY,
                                  x1: word.bbox.x1 + deltaX,
                                  y1: word.bbox.y1 + deltaY
                                },
                                confidence: word.confidence,
                                scale: scale,
                                page: area.p,
                                areaId: area.id
                              };
                            });
                            let lines = detection.data.lines.map(function (line) {
                              return {
                                words: line.words.map(function (word) {
                                  return {
                                    text: word.text,
                                    bbox: {
                                      x0: word.bbox.x0 + deltaX,
                                      y0: word.bbox.y0 + deltaY,
                                      x1: word.bbox.x1 + deltaX,
                                      y1: word.bbox.y1 + deltaY
                                    },
                                    confidence: word.confidence,
                                    scale: scale,
                                    page: area.p,
                                    areaId: area.id
                                  };
                                }),
                                text: line.text,
                                bbox: {
                                  x0: line.bbox.x0 + deltaX,
                                  y0: line.bbox.y0 + deltaY,
                                  x1: line.bbox.x1 + deltaX,
                                  y1: line.bbox.y1 + deltaY
                                },
                                confidence: line.confidence,
                                scale: scale,
                                page: area.p,
                                areaId: area.id
                              };
                            });
                            res.words = res.words.concat(words);
                            res.lines = res.lines.concat(lines);
                            res.areas = res.areas.concat(Object.assign({}, area, { buffer: null }));
                            return _next();
                          })
                          .catch(function (err) {
                            console.log(err);
                            return _next(err);
                          });
                      })();
                    },
                    function (err) {
                      if (err) return next(err);
                      pages.push(res);
                      return next();
                    }
                  );
                });
            });
          },
          function (err) {
            if (err) return cb(err);
            return cb(null, pages);
          }
        );
      },
      function (err) {
        return cb(err);
      }
    );
  });
};

module.exports = Self;
