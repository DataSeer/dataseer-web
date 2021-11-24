/*
 * @prettier
 */

'use strict';

const fs = require(`fs`);
const path = require(`path`);

const async = require(`async`);
const _ = require(`lodash`);
const pdfjsLib = require(`pdfjs-dist/legacy/build/pdf.js`);
const pdf2pic = require(`pdf2pic`);
const Tesseract = require(`tesseract.js`);

const conf = require(`../conf/conf.json`);
const OCRConf = require(`../conf/ocr.json`);

let Self = {};

/**
 * Process a PDF (OCR)
 * @param {string} pdfPath - Path of the PDF file
 * @param {array} pagesNumber - List of the pages number
 * @param {function} cb - Callback function(err) (err: error process OR OCR result (the list of "OCRized" pages, containing words & lines data))
 * @returns {undefined} undefined
 */
Self.processPDF = function (pdfPath, pagesNumber, cb) {
  const scale = 2.0;
  return fs.readFile(pdfPath, function (err, buffer) {
    if (err) return cb(err);
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    return loadingTask.promise.then(
      function (doc) {
        const numPages = doc.numPages;
        let results = [];
        let pages = Array.isArray(pagesNumber) && pagesNumber.length > 0 ? pagesNumber : [];
        return async.mapLimit(
          pages,
          OCRConf.tesseract.mapLimit.pages,
          function (pageNumber, next) {
            if (isNaN(pageNumber)) {
              results.push(new Error(`Invalid page number : ${pageNumber} (wrong format)`));
              return next();
            }
            if (pageNumber > numPages || pageNumber < 1) {
              results.push(new Error(`Invalid page number : ${pageNumber} (out of the range [1-${numPages}])`));
              return next();
            }
            return doc.getPage(pageNumber).then(function (page) {
              const viewport = page.getViewport({ scale: scale }); // Take are of scale -> coordinates could be "wrong"
              return pdf2pic
                .fromBuffer(buffer, {
                  width: viewport.width,
                  height: viewport.height,
                  density: OCRConf.pdf2pic.density
                })
                .bulk(pageNumber, true)
                .then(function (images) {
                  let res = { page: pageNumber, scale: scale, words: [], lines: [] };
                  return async.mapLimit(
                    images,
                    OCRConf.tesseract.mapLimit.images,
                    function (image, _next) {
                      let imgBuffer = Buffer.from(image.base64, `base64`);
                      (async () => {
                        const worker = Tesseract.createWorker({
                          langPath: path.resolve(__dirname, `../resources/tessdata`)
                        });
                        await worker.load();
                        await worker.loadLanguage(`eng`);
                        await worker.initialize(`eng`);
                        await worker.setParameters(OCRConf.tesseract.parameters);
                        return worker
                          .recognize(imgBuffer)
                          .then(function (detection) {
                            let words = detection.data.words.map(function (word) {
                              return {
                                text: word.text,
                                bbox: word.bbox,
                                confidence: word.confidence,
                                scale: scale,
                                page: pageNumber
                              };
                            });
                            let lines = detection.data.lines.map(function (line) {
                              return {
                                text: line.text,
                                bbox: line.bbox,
                                confidence: line.confidence,
                                scale: scale,
                                page: pageNumber
                              };
                            });
                            res.words = res.words.concat(words);
                            res.lines = res.lines.concat(lines);
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
                      results.push(res);
                      return next();
                    }
                  );
                });
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

module.exports = Self;
