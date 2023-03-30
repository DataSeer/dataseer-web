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
Self.processPDF = function (opts, cb) {
  const pdfPath = opts.pdfPath;
  const pages = opts.pages;
  if (!Self.ready) return cb(new Error(`tesseract.js workers not ready`));
  let filteredPages = Self.filterPages(pages);
  if (filteredPages.length < 1) return cb(null, new Error(`You must at least process one page`));
  let regroupedPages = Self.regroupPages(filteredPages);
  const scale = OCRConf.tesseract.scale;
  return fs.readFile(pdfPath, function (err, buffer) {
    if (err) return cb(err);
    const loadingTask = pdfjsLib.getDocument({
      data: buffer,
      standardFontDataUrl: path.join(__dirname, `../node_modules/pdfjs-dist/standard_fonts/`)
    });
    return loadingTask.promise.then(
      function (doc) {
        const numPages = doc.numPages;
        let results = [];
        return async.mapLimit(
          regroupedPages,
          OCRConf.tesseract.mapLimit.pages,
          function (page, next) {
            if (isNaN(page.number)) {
              results.push(new Error(`Invalid page number : ${page.number} (wrong format)`));
              return next();
            }
            if (page.number > numPages || page.number < 1) {
              results.push(new Error(`Invalid page number : ${page.number} (out of the range [1-${numPages}])`));
              return next();
            }
            return doc.getPage(page.number).then(function (pdfPage) {
              const viewport = pdfPage.getViewport({ scale: scale }); // Take care of scale -> coordinates could be "wrong"
              let pdfPageData = {
                number: page.number,
                x: 0,
                y: 0,
                w: viewport.width,
                h: viewport.height
              };
              return async.reduce(
                [
                  function (acc, callback) {
                    if (!opts.getTextContent) return callback(null, acc);
                    return Self.getTextContent(
                      {
                        pdfPage,
                        pdfjsLib,
                        viewport,
                        scale,
                        page
                      },
                      function (err, data) {
                        if (err) return callback(err, acc);
                        acc.textContent = data;
                        return callback(null, acc);
                      }
                    );
                  },
                  function (acc, callback) {
                    if (!opts.getTextOCR) return callback(null, acc);
                    return Self.getTextOCR(
                      {
                        pdfPage,
                        viewport,
                        scale,
                        page
                      },
                      function (err, data) {
                        if (err) return callback(err, acc);
                        acc.textOCR = data;
                        return callback(null, acc);
                      }
                    );
                  }
                ],
                pdfPageData,
                function (acc, fn, callback) {
                  return fn(acc, callback);
                },
                function (err, acc) {
                  if (err) return next(err);
                  if (acc.textContent && acc.textOCR)
                    acc.mergedText = Self.mergeWords(acc.textContent.words, acc.textOCR.words);
                  results.push(acc);
                  return next();
                }
              );
            });
          },
          function (err) {
            if (err) return cb(err);
            return cb(null, results);
          }
        );
      },
      function (err) {
        return cb(err);
      }
    );
  });
};

Self.getTextOCR = function (opts, cb) {
  let res = {
    page: opts.page.number,
    scale: opts.scale,
    words: [],
    lines: [],
    areas: []
  };
  const pageCanvas = createCanvas(opts.viewport.width, opts.viewport.height);
  const pageContext = pageCanvas.getContext(`2d`);
  return opts.pdfPage
    .render({
      canvasContext: pageContext,
      viewport: opts.viewport
    })
    .promise.then(function () {
      if (!Array.isArray(opts.page.areas) || opts.page.areas.length < 0) return cb();
      let areas = opts.page.areas.map((area) => {
        if (isNaN(area.x) || isNaN(area.y) || isNaN(area.w) || isNaN(area.h) || isNaN(area.scale)) {
          return {
            id: process.hrtime.bigint().toString(),
            x: 0,
            y: 0,
            w: opts.viewport.width,
            h: opts.viewport.height,
            p: opts.page.number,
            scale: opts.scale,
            buffer: pageCanvas.toBuffer(OCRConf.canvas.format, OCRConf.canvas.opts)
          };
        }
        const width = (area.w / area.scale) * opts.scale;
        const height = (area.h / area.scale) * opts.scale;
        const x = (area.x / area.scale) * opts.scale;
        const y = (area.y / area.scale) * opts.scale;
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
          scale: opts.scale,
          buffer: areaCanvas.toBuffer(OCRConf.canvas.format, OCRConf.canvas.opts)
        };
      });
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
                  let item = {
                    text: word.text,
                    bbox: {
                      x0: word.bbox.x0 + deltaX,
                      y0: word.bbox.y0 + deltaY,
                      x1: word.bbox.x1 + deltaX,
                      y1: word.bbox.y1 + deltaY
                    },
                    confidence: word.confidence,
                    scale: opts.scale,
                    page: area.p,
                    areaId: area.id
                  };
                  item.statistics = {
                    w: item.bbox.x1 - item.bbox.x0,
                    h: item.bbox.y1 - item.bbox.y0
                  };
                  item.statistics.yMid = item.bbox.y0 + item.statistics.h / 2;
                  item.statistics.area = item.statistics.w * item.statistics.h;
                  return item;
                });
                let lines = detection.data.lines.map(function (line) {
                  let item = {
                    text: line.text,
                    bbox: {
                      x0: line.bbox.x0 + deltaX,
                      y0: line.bbox.y0 + deltaY,
                      x1: line.bbox.x1 + deltaX,
                      y1: line.bbox.y1 + deltaY
                    },
                    confidence: line.confidence,
                    scale: opts.scale,
                    page: area.p,
                    areaId: area.id
                  };
                  item.statistics = {
                    w: item.bbox.x1 - item.bbox.x0,
                    h: item.bbox.y1 - item.bbox.y0
                  };
                  item.statistics.yMid = item.bbox.y0 + item.statistics.h / 2;
                  item.statistics.area = item.statistics.w * item.statistics.h;
                  return item;
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
          if (err) return cb(err);
          return cb(null, res);
        }
      );
    });
};

Self.getTextContent = function (opts, cb) {
  return opts.pdfPage.getTextContent().then(function (textContent) {
    let res = {
      page: opts.page.number,
      scale: opts.scale,
      words: [],
      lines: [],
      areas: []
    };
    let data = [];
    if (!textContent || !Array.isArray(textContent.items)) return cb(null, res);
    if (!Array.isArray(opts.page.areas) || opts.page.areas.length < 0) return cb(null, res);
    let areas = opts.page.areas.map((area) => {
      if (isNaN(area.x) || isNaN(area.y) || isNaN(area.w) || isNaN(area.h) || isNaN(area.scale)) {
        return {
          id: process.hrtime.bigint().toString(),
          x: 0,
          y: 0,
          w: opts.viewport.width,
          h: opts.viewport.height,
          p: opts.page.number,
          scale: opts.scale
        };
      }
      const width = (area.w / area.scale) * opts.scale;
      const height = (area.h / area.scale) * opts.scale;
      const x = (area.x / area.scale) * opts.scale;
      const y = (area.y / area.scale) * opts.scale;
      return {
        id: area.id,
        x: x,
        y: y,
        w: width,
        h: height,
        p: area.p,
        scale: opts.scale
      };
    });
    for (let i = 0; i < textContent.items.length; i++) {
      let item = textContent.items[i];
      const tx = opts.pdfjsLib.Util.transform(opts.viewport.transform, item.transform);
      let word = {
        text: item.str,
        bbox: {
          x0: tx[4],
          y0: tx[5] - item.height * opts.scale,
          x1: tx[4] + item.width * opts.scale,
          y1: tx[5]
        },
        confidence: 1,
        scale: opts.scale,
        page: opts.page.number
      };
      word.statistics = {
        w: word.bbox.x1 - word.bbox.x0,
        h: word.bbox.y1 - word.bbox.y0
      };
      word.statistics.area = word.statistics.w * word.statistics.h;
      word.statistics.yMid = word.bbox.y0 + word.statistics.h / 2;
      if (word.text !== `` && word.text !== ` `) data.push(word);
    }
    let textContentWords = data.sort(function (a, b) {
      if (a.statistics.yMid < b.statistics.yMid) return -1;
      else if (a.statistics.yMid > b.statistics.yMid) return 1;
      else if (a.bbox.x0 < b.bbox.x0) return -1;
      else return 1;
    });
    for (let i = 0; i < areas.length; i++) {
      let area = areas[i];
      let bboxArea = {
        x0: area.x,
        x1: area.x + area.w,
        y0: area.y,
        y1: area.y + area.h
      };
      let words = textContentWords
        .filter(function (word) {
          let overlap = Self.getIntersectingRectangle(bboxArea, word.bbox);
          return ((overlap.x1 - overlap.x0) * (overlap.y1 - overlap.y0)) / word.statistics.area >= 0.85;
        })
        .map(function (word) {
          return Object.assign({}, { areaId: area.id }, word);
        });
      res.words = res.words.concat(words);
      res.areas.push(area);
    }
    return cb(null, res);
  });
};

Self.mergeWords = function (source, target) {
  let results = [].concat(source);
  for (let i = 0; i < target.length; i++) {
    let wordTarget = target[i];
    let alreadyExist = false;
    for (let j = 0; j < source.length; j++) {
      let wordSource = source[j];
      let overlap = Self.getIntersectingRectangle(wordSource.bbox, wordTarget.bbox);
      const coeff = ((overlap.x1 - overlap.x0) * (overlap.y1 - overlap.y0)) / wordTarget.statistics.area;
      if (coeff >= 0.85) {
        alreadyExist = true;
        break;
      }
    }
    if (!alreadyExist) results.push(wordTarget);
  }
  return results;
};

// https://codereview.stackexchange.com/questions/185323/find-the-intersect-area-of-two-overlapping-rectangles
/**
 * Returns intersecting part of two rectangles
 * @param  {object}  r1 4 coordinates in form of {x0, y0, x1, y1} object
 * @param  {object}  r2 4 coordinates in form of {x0, y0, x1, y1} object
 * @return {boolean}    False if there's no intersecting part
 * @return {object}     4 coordinates in form of {x0, y0, x1, y1} object
 */
Self.getIntersectingRectangle = function (r1, r2) {
  [r1, r2] = [r1, r2].map((r) => {
    return {
      x: [r.x0, r.x1].sort((a, b) => a - b),
      y: [r.y0, r.y1].sort((a, b) => a - b)
    };
  });
  const noIntersect = r2.x[0] > r1.x[1] || r2.x[1] < r1.x[0] || r2.y[0] > r1.y[1] || r2.y[1] < r1.y[0];
  return noIntersect
    ? false
    : {
      x0: Math.max(r1.x[0], r2.x[0]), // _[0] is the lesser,
      y0: Math.max(r1.y[0], r2.y[0]), // _[1] is the greater
      x1: Math.min(r1.x[1], r2.x[1]),
      y1: Math.min(r1.y[1], r2.y[1])
    };
};

module.exports = Self;
