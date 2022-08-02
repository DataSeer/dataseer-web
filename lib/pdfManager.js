/*
 * @prettier
 */

'use strict';

const fs = require(`fs`);
const path = require(`path`);

const _ = require(`lodash`);
const async = require(`async`);
const pdfjs = require(`pdfjs-dist/legacy/build/pdf.js`);
const pdfLib = require(`pdf-lib`);

const Params = require(`./params.js`);

// Some PDFs need external cmaps.
const CMAP_URL = `../node_modules/pdfjs-dist/cmaps/`;
const CMAP_PACKED = true;

const Self = {};

/**
 * Merge a list of PDF files into a new one
 * @param {object} opts - Available options
 * @param {string} opts.files - List of PDFs files (JSON Objects)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: range of pages OR undefined)
 * @returns {undefined} undefined
 */
Self.mergeFiles = function (opts = {}, cb) {
  let files = _.get(opts, `files`);
  if (typeof files === `undefined`) return cb(Error(`Missing required data: opts.files`));
  if (!Array.isArray(files) || files.length < 1)
    return cb(Error(`Bad data: opts.files should be an Array containing at least 2 items`));
  return pdfLib.PDFDocument.create()
    .then(function (mergedPPDF) {
      return async.mapSeries(
        files,
        function (item, next) {
          return pdfLib.PDFDocument.load(item.data)
            .then(function (pdfDoc) {
              const indices = pdfDoc.getPageIndices();
              return mergedPPDF.copyPages(pdfDoc, indices).then(function (copiedPages) {
                for (let i = 0; i < indices.length; i++) {
                  mergedPPDF.addPage(copiedPages[indices[i]]);
                }
                return next();
              });
            })
            .catch(function (err) {
              return next(err);
            });
        },
        function (err) {
          if (err) return cb(err);
          return mergedPPDF
            .save()
            .then(function (pdfBytes) {
              let buffer = Buffer.from(pdfBytes);
              let result = {
                name: files[0].name.replace(`.pdf`, `.merged.pdf`),
                data: buffer, // <Buffer>
                size: buffer.length,
                encoding: `7bit`,
                tempFilePath: ``,
                truncated: false,
                mimetype: `application/pdf`,
                md5: `` // md5 hash
              };
              return cb(null, result);
            })
            .catch(function (err) {
              return cb(err);
            });
        }
      );
    })
    .catch(function (err) {
      return cb(err);
    });
};

/**
 * Get the "Response to viewer" section of a given PDF (mainly used for AmNat PDFs)
 * @param {object} opts - Available options
 * @param {string} opts.source - PDF source (path of the file)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: range of pages OR undefined)
 * @returns {undefined} undefined
 */
Self.removeResponseToViewerSection = function (opts = {}, cb) {
  if (typeof _.get(opts, `source`) === `undefined`) return cb(Error(`Missing required data: opts.source`));
  return Self.getResponseToViewerSection({ source: opts.source }, function (err, pages) {
    if (err) return cb(err);
    if (pages.length <= 0) return cb(null, new Error(`'Response To Viewer' Section Not Found`));
    return Self.removePagesOfFile({ source: opts.source, pages: pages }, function (err, pdfbytes) {
      if (err) return cb(err);
      return cb(err, Buffer.from(pdfbytes));
    });
  });
};

/**
 * Get the "Response to viewer" section of a given PDF (mainly used for AmNat PDFs)
 * @param {object} opts - Available options
 * @param {Buffer} opts.source - PDF source (buffer of the file)
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: range of pages OR undefined)
 * @returns {undefined} undefined
 */
Self.getResponseToViewerSection = function (opts = {}, cb) {
  if (typeof _.get(opts, `source`) === `undefined`) return cb(Error(`Missing required data: opts.source`));
  let loadingTask = pdfjs.getDocument({
    data: opts.source,
    cMapUrl: CMAP_URL,
    cMapPacked: CMAP_PACKED,
    verbosity: pdfjs.VerbosityLevel.ERRORS
  });
  return loadingTask.promise
    .then(function (pdfDocument) {
      let linesNumberFound = false;
      let pages = [];
      let numPage = 1;
      return async.doUntil(
        function (next) {
          return pdfDocument.getPage(numPage).then(function (page) {
            let viewport = page.getViewport({ scale: 1 });
            return page.getTextContent({ normalizeWhitespace: true }).then(function (textContent) {
              let linesNumberProbability = Self.findLinesNumberInTextContent(textContent.items, viewport);
              // let manuscriptTopLeftText = Self.findManuscriptTopLeftText(textContent.items, viewport);
              linesNumberFound = linesNumberProbability > 0.85; // random coeff (based on the 5 AmNat files)
              // Ignore first page of the document
              if (numPage > 1 && !linesNumberFound) pages.push(numPage);
              numPage++;
              return next();
            });
          });
        },
        function (fn) {
          return fn(null, numPage > pdfDocument.numPages || linesNumberFound);
        },
        function (err) {
          if (pdfDocument.numPages - 1 === pages.length) return cb(err, []);
          return cb(err, pages);
        }
      );
    })
    .catch(function (err) {
      return cb(err);
    });
};

/**
 * Find the "lines number" in a list of chunks
 * @param {array} chunks - List of chunks (from .getTextContent() function of a pdfjsLib page)
 * @param {object} viewport - Viewport of the PDF (from .getViewport() function of a pdfjsLib page)
 * @returns {number} probability of a "line number" being present (value: float number between 0 and 1)
 */
Self.findLinesNumberInTextContent = function (chunks = [], viewport) {
  if (!Array.isArray(chunks)) return [];
  // Sort chunks from top left to bottom right
  let _chunks = chunks
    .filter(function (item) {
      return item.str !== ``;
    })
    .map(function (item) {
      let tx = pdfjs.Util.transform(pdfjs.Util.transform(viewport.transform, item.transform), [1, 0, 0, -1, 0, 0]);
      return {
        str: item.str,
        x: tx[4],
        y: tx[5],
        w: item.width,
        h: item.height
      };
    });
  // If there is one chunk or less, there is no Lines Number
  if (_chunks.length <= 1) return [];
  let medianHeight = median(
    _chunks.map(function (item) {
      return item.h;
    })
  );
  let filteredChunks = _chunks.filter(function (item) {
    // return item.h >= medianHeight * 0.9; // Case font-size is not the same for lines number
    return true; // Do not filter using chunk height for the moment
  });
  // If there is one chunk or less, there is no Lines Number
  if (filteredChunks.length <= 1) return [];
  let sortedChunks = filteredChunks.sort(function (a, b) {
    if (a.y === b.y) return a.x - b.x;
    if (a.y < b.y) return -1;
    if (a.y > b.y) return 1;
  });
  // If there is one chunk or less, there is no Lines Number
  if (sortedChunks.length <= 1) return [];
  // Regroup chunks by lines
  let lines = [[sortedChunks[0]]];
  for (let i = 1; i < sortedChunks.length; i++) {
    let chunk = sortedChunks[i];
    let lastLine = lines[lines.length - 1];
    let lastChunk = lastLine[lastLine.length - 1];
    if (chunk.y > lastChunk.y + lastChunk.h || chunk.x < lastChunk.x) lines.push([chunk]);
    else lastLine.push(chunk);
  }
  // Get first chunk of each line
  let firstChunks = lines.map(function (item) {
    return item[0];
  });
  // Get lines number
  let linesNumber = [];
  for (let i = 0; i < firstChunks.length; i++) {
    let test = Params.convertToInteger(firstChunks[i].str);
    if (!isNaN(test)) linesNumber.push(test);
  }
  return linesNumber.length / lines.length;
};

/**
 * Find the "manuscript" text chunks in a list of chunks
 * @param {array} chunks - List of chunks (from .getTextContent() function of a pdfjsLib page)
 * @param {object} viewport - Viewport of the PDF (from .getViewport() function of a pdfjsLib page)
 * @returns {number} probability of a "line number" being present (value: float number between 0 and 1)
 */
Self.findManuscriptTopLeftText = function (chunks = [], viewport) {
  if (!Array.isArray(chunks)) return [];
  // Sort chunks from top left to bottom right
  let _chunks = chunks
    .filter(function (item) {
      return item.str !== ``;
    })
    .map(function (item) {
      let tx = pdfjs.Util.transform(pdfjs.Util.transform(viewport.transform, item.transform), [1, 0, 0, -1, 0, 0]);
      return {
        str: item.str,
        x: tx[4],
        y: tx[5],
        w: item.width,
        h: item.height
      };
    });
  // If there is one chunk or less, there is no Lines Number
  if (_chunks.length <= 1) return [];
  let sortedChunks = _chunks.sort(function (a, b) {
    if (a.y === b.y) return a.x - b.x;
    if (a.y < b.y) return -1;
    if (a.y > b.y) return 1;
  });
  // If there is one chunk or less, there is no Lines Number
  if (sortedChunks.length <= 1) return [];
  // Regroup chunks by lines
  let lines = [[sortedChunks[0]]];
  for (let i = 1; i < sortedChunks.length; i++) {
    let chunk = sortedChunks[i];
    let lastLine = lines[lines.length - 1];
    let lastChunk = lastLine[lastLine.length - 1];
    if (chunk.y > lastChunk.y + lastChunk.h || chunk.x < lastChunk.x) lines.push([chunk]);
    else lastLine.push(chunk);
  }
  // Try to find 'manuscript' word in the top left text
  return lines[0].join(` `).toLowerCase().indexOf(`manuscript`) > -1;
};

/**
 * Remove page(s) from agiven PDF
 * @param {object} opts - Available options
 * @param {buffer} opts.source - PDF source (buffer of the file)
 * @param {array} opts.pages - List of page(s) to removed
 * @param {function} cb - Callback function(err, res) (err: error process OR null, res: Buffer OR undefined)
 * @returns {undefined} undefined
 */
Self.removePagesOfFile = function (opts = {}, cb) {
  if (typeof _.get(opts, `source`) === `undefined`) return cb(Error(`Missing required data: opts.source`));
  if (typeof _.get(opts, `pages`) === `undefined`) return cb(Error(`Missing required data: opts.pages`));
  let pages = Params.convertPages(opts.pages);
  if (!Array.isArray(pages)) return cb(null, []);
  return pdfLib.PDFDocument.load(opts.source)
    .then(function (pdfDoc) {
      // Use this for loop because .removePage() update pages indexes
      for (let i = pages.length - 1; i >= 0; i--) {
        pdfDoc.removePage(pages[i] - 1);
      }
      return pdfDoc.save().then(function (pdfBytes) {
        return cb(null, pdfBytes);
      });
    })
    .catch(function (err) {
      return cb(err);
    });
};

const average = (array = []) => (array.length === 0 ? undefined : array.reduce((a, b) => a + b) / array.length);
const median = function (array = []) {
  if (array.length === 0) return undefined;
  array.sort(function (a, b) {
    return a - b;
  });
  let half = Math.floor(array.length / 2);
  if (array.length % 2) return array[half];
  return (array[half - 1] + array[half]) / 2.0;
};

module.exports = Self;
