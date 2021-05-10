/*
 * @prettier
 */

'use strict';

const workerSrcPath = '../javascripts/pdf.js/build/pdf.worker.js';

if (typeof pdfjsLib === 'undefined' || (!pdfjsLib && !pdfjsLib.getDocument)) {
  console.error('Please build the pdfjs-dist library using\n' + '  `gulp dist-install`');
}
// The workerSrc property shall be specified.
//
else pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrcPath;

const CMAP_URL = '../javascripts/pdf.js/build/generic/web/cmaps/',
  MARGIN_CHUNK = {
    x: 2,
    y: 2,
    w: 2,
    h: 2
  },
  MARGIN_CONTOUR = {
    x: 3,
    y: 3,
    w: 3,
    h: 3
  },
  CMAP_PACKED = true,
  BORDER_RADIUS = 0, // Not handled yet
  BORDER_WIDTH = 2, // Need to be an even number
  REMOVED_BORDER_COLOR = false,
  HOVER_BORDER_COLOR = 'rgba(0, 0, 0, 1)',
  SELECTED_BORDER_COLOR = 'rgba(105, 105, 105, 1)';

const median = function (values) {
    if (values.length === 0) return undefined;
    values.sort(function (a, b) {
      return a - b;
    });
    let half = Math.floor(values.length / 2);
    if (values.length % 2) return values[half];
    return (values[half - 1] + values[half]) / 2.0;
  },
  getInterlinesLength = function (paragraphs) {
    let stats = {};
    for (let i = 0; i < paragraphs.length; i++) {
      if (paragraphs[i].lines.length > 1)
        for (let j = 0; j < paragraphs[i].lines.length - 1; j++) {
          let previous = paragraphs[i].lines[j],
            next = paragraphs[i].lines[j + 1],
            interline = Math.abs(previous.min.y + previous.h / 2 - (next.min.y + next.h / 2));
          if (typeof stats[previous.p] === 'undefined') stats[previous.p] = [interline];
          else stats[previous.p].push(interline);
        }
    }
    let result = {};
    for (let key in stats) {
      result[key] = median(stats[key]);
    }
    return result;
  };

// Representation of a chunk in PDF
const Chunk = function (data, scale) {
  this.x = Math.floor((parseFloat(data.x) - MARGIN_CHUNK.x) * scale);
  this.y = Math.floor((parseFloat(data.y) - MARGIN_CHUNK.y) * scale);
  this.w = Math.ceil((parseFloat(data.w) + MARGIN_CHUNK.w * 2) * scale);
  this.h = Math.ceil((parseFloat(data.h) + MARGIN_CHUNK.h * 2) * scale);
  this.p = parseInt(data.p);
  return this;
};

// Representation of a line in PDF
const Line = function (first) {
  this.chunks = [];
  this.h = 0;
  this.w = 0;
  this.yMid = { sum: 0, coeff: 0, avg: 0 };
  this.min = { x: Infinity, y: Infinity };
  this.max = { x: -Infinity, y: -Infinity };
  this.p = undefined;
  if (typeof first !== 'undefined') this.addChunk(first);
  return this;
};

// Get all chunks of this Line
Line.prototype.chunks = function () {
  return this.chunks;
};

// Add chunk to this line
Line.prototype.addChunk = function (input) {
  let chunk = input instanceof Chunk ? input : new Chunk(input),
    xMin = chunk.x,
    xMax = chunk.x + chunk.w,
    yMin = chunk.y,
    yMax = chunk.y + chunk.h;
  if (this.min.x > xMin) this.min.x = xMin;
  if (this.max.x < xMax) this.max.x = xMax;
  if (this.min.y > yMin) this.min.y = yMin;
  if (this.max.y < yMax) this.max.y = yMax;
  this.yMid.sum += (chunk.y + chunk.h / 2) * chunk.w;
  this.yMid.coeff += chunk.w;
  this.yMid.avg = this.yMid.sum / this.yMid.coeff;
  this.w = this.max.x - this.min.x;
  this.h = this.max.y - this.min.y;
  if (typeof this.p === 'undefined') this.p = chunk.p;
  this.chunks.push(chunk);
};

// Check if a chunk is in this line
Line.prototype.isIn = function (chunk) {
  if (this.chunks.length <= 0) return true; // If there is no chunk, it will be "in" by default
  let xMin = chunk.x,
    xMax = chunk.x + chunk.w,
    yMin = chunk.y,
    yMax = chunk.y + chunk.h,
    yMiddle = chunk.y + chunk.h / 2,
    samePage = this.p === chunk.p,
    outY = yMiddle > this.max.y || yMiddle < this.min.y,
    outX = xMax < this.min.x;
  return samePage && !outY && !outX;
};

// Representation of multipes lines in PDF (atteched to a given sentence)
const Lines = function (chunks, scales) {
  this.collection = [new Line()];
  if (Array.isArray(chunks)) this.addChunks(chunks, scales);
  return this;
};

// Get of all lines
Lines.prototype.all = function () {
  return this.collection;
};

// Get last line
Lines.prototype.getLast = function () {
  return this.collection[this.collection.length - 1];
};

// Create a new line
Lines.prototype.newLine = function (chunk) {
  return this.collection.push(new Line(chunk));
};

// Add chunk to this group of lines
Lines.prototype.addChunks = function (chunks = [], scales = {}) {
  for (let i = 0; i < chunks.length; i++) {
    let line = this.getLast(),
      item = chunks[i],
      scale = scales[item.p],
      chunk = new Chunk(item, scale);
    if (line.isIn(chunk)) line.addChunk(chunk);
    else this.newLine(chunk);
  }
};

// Represent an Area
const Area = function (opts, first) {
  this.lines = [];
  this.sentenceId = opts.sentenceId;
  this.h = 0;
  this.w = 0;
  this.min = { x: Infinity, y: Infinity };
  this.max = { x: -Infinity, y: -Infinity };
  this.p = undefined;
  if (typeof first !== 'undefined') this.addLine(first);
  return this;
};

// Get All lines of this Area
Area.prototype.getLines = function () {
  return this.lines;
};

// Add line to this Area
Area.prototype.addLine = function (line) {
  let xMin = line.min.x,
    xMax = line.min.x + line.w,
    yMin = line.min.y,
    yMax = line.min.y + line.h;
  if (this.min.x > xMin) this.min.x = xMin;
  if (this.max.x < xMax) this.max.x = xMax;
  if (this.min.y > yMin) this.min.y = yMin;
  if (this.max.y < yMax) this.max.y = yMax;
  this.w = this.max.x - this.min.x;
  this.h = this.max.y - this.min.y;
  if (typeof this.p === 'undefined') this.p = line.p;
  this.lines.push(line);
};

// Check if line is next to this Area
Area.prototype.isNext = function (line, margin) {
  if (this.lines.length === 0) return true; // If there is no lines, it will be "next" by default
  let middle = line.min.y + line.h / 2,
    delta = typeof margin !== 'undefined' ? margin : line.h,
    samePage = this.p === line.p,
    isTooUnder = middle - delta > this.max.y,
    isTooUpper = middle + delta < this.min.y;
  return samePage && !isTooUpper && !isTooUnder;
};

// Represent a group of Areas
const Areas = function (paragraph, interlines) {
  this.collection = [];
  this.sentenceId = paragraph.sentenceId;
  this.interlines = interlines;
  this.newArea();
  if (Array.isArray(paragraph.lines)) this.addLines(paragraph.lines);
  return this;
};

// Create a new Area
Areas.prototype.newArea = function (line) {
  return this.collection.push(new Area({ sentenceId: this.sentenceId }, line));
};

// Get Last Area
Areas.prototype.getLast = function () {
  return this.collection[this.collection.length - 1];
};

// Get all Areas
Areas.prototype.all = function () {
  return this.collection;
};

// Add Lines to Areas
Areas.prototype.addLines = function (lines = []) {
  for (let i = 0; i < lines.length; i++) {
    let area = this.getLast(),
      line = lines[i];
    if (area.isNext(line, this.interlines[lines[i].p])) area.addLine(line);
    else this.newArea(line);
  }
};

const PdfViewer = function (id, screenId, events = {}) {
  let self = this;
  this.containerId = id;
  this.screenId = screenId;
  // HTML elements
  this.screen = $(`#${this.screenId}`);
  this.screenElement = this.screen.get(0);
  this.viewerId = id + 'Viewer';
  this.container = $(`#${this.containerId}`);
  this.containerElement = this.container.get(0);
  this.viewer = $(`<div id="${this.viewerId}" class="pdfViewer"></div>`);
  this.viewerElement = this.viewer.get(0);
  this.infos = $(`<div id="${this.viewerId}Infos" class="pdfViewerInfos"></div>`);
  this.infosElements = this.infos.get(0);
  this.message = $(`<div id="${this.viewerId}Message" class="pdfViewerMessage"></div>`);
  this.messageElements = this.infos.get(0);
  this.container.append(this.infos).append(this.message).append(this.viewer);
  // pdf properties
  this.pdfLoaded = false;
  this.pdfDocument;
  this.pdfPages; // cached render pages
  // metadata properties
  this.metadata = {};
  // datasets properties
  this.datasets = {};
  // Events
  this.events = events;
  return this;
};

// Get order of appearance of sentences
PdfViewer.prototype.getSentencesMapping = function () {
  let arr = [],
    result = {};
  for (let page in this.metadata.pages) {
    for (let sentenceId in this.metadata.pages[page]) {
      arr.push({ page: page, sentenceId: sentenceId, location: this.metadata.pages[page][sentenceId].location });
    }
  }
  let sortedArr = arr.sort(function (a, b) {
    if (a.page !== b.page) return a.page - b.page;
    if (a.location.min.y === b.location.min.y) return a.location.min.x - b.location.min.x;
    else return a.location.min.y - b.location.min.y;
  });
  sortedArr.map(function (item, i) {
    result[item.sentenceId] = i;
  });
  return result;
};

// Render the PDF
PdfViewer.prototype.load = function (pdf, xmlMetadata, cb) {
  console.log('Loading PDF...');
  let self = this;
  this.viewer.empty();
  return this.loadPDF(pdf.buffer, function (err, pdfDocument) {
    console.log('Load of PDF done.');
    self.pdfLoaded = true;
    self.pdfDocument = pdfDocument;
    let metadata = {
      pages: pdf.metadata.pages,
      sentences: pdf.metadata.sentences,
      datasets: xmlMetadata.datasets.concat(xmlMetadata.corresps),
      colors: xmlMetadata.colors
    };
    self.metadata = metadata;
    metadata.datasets.map(function (dataset) {
      self.datasets[dataset.datasetId] = dataset.sentenceId;
    });
    self.renderPage({ numPage: 1 }, function (err) {
      return cb(err);
    });
  });
};

// show message
PdfViewer.prototype.showMessage = function (text, cb) {
  if (text) this.message.text(text);
  this.message.show('fast', function () {
    return cb();
  });
};

// Hide message
PdfViewer.prototype.hideMessage = function () {
  this.message.hide('fast');
};

// Select a dataset
PdfViewer.prototype.selectDataset = function (id, cb) {
  let self = this,
    pages = this.getPagesOfDataset(id),
    maxPage = Math.max(...pages);
  if (maxPage > 0)
    this.renderUntilPage(maxPage, function (err) {
      if (err) return cb(err);
      return cb(self.scrollToDataset(id));
    });
};

// Select a dataset
PdfViewer.prototype.selectCorresp = function (id, cb) {
  return cb(this.scrollToSentence(id));
};

// Get Pages of a given datasetId
PdfViewer.prototype.getPagesOfDataset = function (id) {
  if (this.datasets && this.datasets[id] && typeof this.metadata.sentences[this.datasets[id]].pages === 'object')
    return Object.keys(this.metadata.sentences[this.datasets[id]].pages).map(function (item) {
      return parseInt(item);
    });
  else return [];
};

// Get Pages of a given sentenceId
PdfViewer.prototype.getPagesOfSentence = function (id) {
  if (this.metadata.sentences)
    return Object.keys(this.metadata.sentences[id].pages).map(function (item) {
      return parseInt(item);
    });
  else return [];
};

// Get Pages
PdfViewer.prototype.getPages = function () {
  if (this.pdfDocument) return Array.from({ length: this.pdfDocument.numPages }, (_, i) => i + 1);
  else return [];
};

// Insert Pages
PdfViewer.prototype.insertPage = function (numPage, page) {
  // delete older version of this page
  $(`#pdfViewer div[data-page-number="${numPage}"]`).remove();
  let inserted = false,
    previous;
  for (let i = numPage - 1; i >= 0; i--) {
    previous = $(`#pdfViewer div[data-page-number="${i}"]`);
    if (previous.get(0)) {
      inserted = true;
      previous.after(page);
      break;
    }
  }
  if (!inserted) this.viewerElement.appendChild(page);
};

// Get PdfPages
PdfViewer.prototype.getPdfPage = function (numPage, cb) {
  let self = this;
  if (this.pdfPages && this.pdfPages[numPage]) return cb(null, this.pdfPages[numPage]);
  else
    return this.pdfDocument
      .getPage(numPage)
      .then(function (pdfPage) {
        return cb(null, pdfPage);
      })
      .catch((err) => {
        console.log(err);
        return cb(err);
      });
};

// Get PdfPages
PdfViewer.prototype.setPage = function (numPage) {
  this.infos.empty().append(`Page ${numPage}/${this.pdfDocument.numPages}`);
};

// Get PdfPages
PdfViewer.prototype.onScroll = function (scrollPosition, direction) {
  this.refreshNumPage(scrollPosition - 50 * direction);
  if (scrollPosition >= this.viewer.height() - 50 * direction) {
    this.renderNextPage(function (err, res) {
      console.log('nextPageLoaded');
    });
  }
};

// Get PdfPages
PdfViewer.prototype.refreshNumPage = function (scrollPosition) {
  let pages = this.viewer.find('div[class="page"]'),
    height = 0,
    offSetTop = this.screen.offset().top,
    screenHeight = this.screen.outerHeight(),
    numPage = 1;
  for (let i = 0; i < pages.length; i++) {
    let page = pages[i],
      el = $(page),
      a = offSetTop - el.offset().top,
      min = -el.outerHeight() * 0.15,
      max = el.outerHeight() * 0.95;
    height += el.outerHeight();
    if (a > min && a < max) break;
    numPage += 1;
  }
  this.infos.empty().append(`Page ${numPage}/${this.pdfDocument.numPages}`);
};

// Load PDF file
PdfViewer.prototype.loadPDF = function (buffer, cb) {
  let self = this;
  let loadingTask = pdfjsLib.getDocument({
    data: buffer,
    cMapUrl: CMAP_URL,
    cMapPacked: CMAP_PACKED
  });
  return loadingTask.promise
    .then(function (pdfDocument) {
      return cb(null, pdfDocument);
    })
    .catch(function (err) {
      console.log(err);
      self.container.empty().append('<div>An error has occurred while processing the document</div>');
      return cb(err);
    });
};

// Render a given page
PdfViewer.prototype.renderUntilPage = function (numPage, cb) {
  // Loading document
  let self = this;
  return async.eachSeries(
    Array.from({ length: numPage }, (_, i) => i + 1),
    function (numPage, callback) {
      return self.renderPage({ numPage: numPage }, function (err, res) {
        return callback(err);
      });
    },
    function (err) {
      if (err) console.log(err);
      return cb(err);
    }
  );
};

// Render next page (or nothing if all pages already rendered)
PdfViewer.prototype.renderNextPage = function (cb) {
  let lastPage = this.viewer.find(`.page[data-page-number]`).last(),
    numPage = parseInt(lastPage.attr('data-page-number')) + 1;
  if (numPage <= this.pdfDocument.numPages) {
    return this.renderPage({ numPage: numPage }, function (err, numPage) {
      return cb(err, numPage);
    });
  } else return cb();
};

// Insert datasets
PdfViewer.prototype.insertDatasets = function (numPage) {
  let self = this,
    datasets = this.metadata.datasets;
  for (let i = 0; i < datasets.length; i++) {
    if (
      this.getPagesOfSentence(datasets[i].sentenceId).indexOf(numPage) > -1 &&
      this.metadata.colors[datasets[i].datasetId] &&
      this.metadata.colors[datasets[i].datasetId].background &&
      this.metadata.colors[datasets[i].datasetId].background.rgb
    ) {
      self.addDataset({
        id: datasets[i].datasetId,
        sentenceId: datasets[i].sentenceId,
        color: this.metadata.colors[datasets[i].datasetId]
      });
    }
  }
};

// Render a given page
PdfViewer.prototype.renderPage = function (opts, cb) {
  let self = this,
    force = !!opts.force,
    numPage = opts.numPage;

  if (!numPage) return cb(new Error('numPage required'));
  else if (!force && this.viewer.find(`.page[data-page-number="${numPage}"]`).get(0)) return cb();
  else
    return this.showMessage(`Loading Page ${numPage}...`, function () {
      return self.getPdfPage(numPage, function (err, pdfPage) {
        if (err) return cb(err);
        let desiredWidth = self.viewerElement.offsetWidth,
          viewport_tmp = pdfPage.getViewport({ scale: 1 }),
          the_scale = desiredWidth / viewport_tmp.width,
          viewport = pdfPage.getViewport({ scale: the_scale }),
          page = self.buildEmptyPage(numPage, viewport.width, viewport.height),
          canvas = page.querySelector('canvas'),
          wrapper = page.querySelector('.canvasWrapper'),
          container = page.querySelector('.textLayer'),
          canvasContext = canvas.getContext('2d');
        // Insert page
        self.insertPage(numPage, page);
        return pdfPage
          .render({
            canvasContext: canvasContext,
            viewport: viewport
          })
          .promise.then(function () {
            // build chunks
            let chunks = {};
            for (let sentenceId in self.metadata.pages[numPage]) {
              let sentence = self.metadata.sentences[sentenceId];
              chunks[sentenceId] = sentence.chunks;
            }
            // Build Contours
            let scales = {};
            scales[numPage] = the_scale;
            let contours = self.buildAreas(chunks, scales, numPage);
            // Build Contours
            contours.map(function (contour) {
              self.insertContours(contour);
              // Build Contours
            });
            // Build Sentences
            self.insertSentences(chunks, numPage, the_scale);
            self.insertDatasets(numPage);
            page.setAttribute('data-loaded', 'true');
            self.hideMessage();
            return cb(null, numPage);
          })
          .catch(function (err) {
            console.log(err);
            return cb(err);
          });
      });
    });
};

// Refresh pdf display
PdfViewer.prototype.refresh = function (cb) {
  if (!self.pdfDocument) {
    // Loading document
    let self = this;
    return async.eachSeries(
      this.getPages(),
      function (numPage, callback) {
        return self.renderPage({ numPage: numPage, force: true }, function (err, res) {
          console.log(err);
          return callback(err);
        });
      },
      function (err) {
        if (err) console.log(err);
        return cb(err);
      }
    );
  } else return cb(new Error('PDF cannot be refreshed'));
};

// Build all Areas
PdfViewer.prototype.buildAreas = function (chunks = {}, scales, numPage) {
  let paragraphs = [],
    result = [];
  for (let sentenceId in chunks) {
    let sentenceChunks = chunks[sentenceId].filter(function (chunk) {
        return parseInt(chunk.p) === numPage;
      }),
      lines = {
        'lines': new Lines(sentenceChunks, scales).all(),
        'sentenceId': sentenceId
      };
    paragraphs.push(lines);
  }
  let interlines = getInterlinesLength(paragraphs);
  for (let i = 0; i < paragraphs.length; i++) {
    result.push(new Areas(paragraphs[i], interlines).all());
  }
  return result;
};

// Insert contours of lines
PdfViewer.prototype.insertContours = function (areas) {
  if (Array.isArray(areas)) {
    for (let i = 0; i < areas.length; i++) {
      this.container.find(`.page[data-page-number="${areas[i].p}"] .contoursLayer`).append(this.buildBorders(areas[i]));
    }
    return true;
  } else return null;
};

// Build borders
PdfViewer.prototype.buildBorders = function (area) {
  let container = $('<div>'),
    borders = this.getSquares(area);
  container.attr('sentenceId', area.sentenceId).attr('class', 'contour');
  borders.map(function (item) {
    return container.append(item);
  });
  return container;
};

// Add sentence
PdfViewer.prototype.insertSentences = function (sentences, page, scale) {
  let self = this,
    annotationsContainer = this.container.find(`.page[data-page-number="${page}"] .annotationsLayer`);
  for (let key in sentences) {
    let chunks = sentences[key];
    for (let i = 0; i < chunks.length; i++) {
      let chunk = chunks[i],
        ch = new Chunk(chunk, scale);
      //make events the area
      let element = document.createElement('s'),
        attributes = `width:${ch.w}px; height:${ch.h}px; position:absolute; top:${ch.y}px; left:${ch.x}px;`;
      element.setAttribute('style', attributes);
      element.setAttribute('sentenceId', chunk.sentenceId);
      element.setAttribute('isPdf', true);
      // the link here goes to the bibliographical reference
      element.onclick = function () {
        let el = $(this);
        if (typeof self.events.onClick === 'function')
          return self.events.onClick({ sentenceId: el.attr('sentenceId'), datasetId: el.attr('datasetId') });
      };
      element.onmouseover = function () {
        let el = $(this);
        if (typeof self.events.onHover === 'function')
          return self.events.onHover({ sentenceId: el.attr('sentenceId'), datasetId: el.attr('datasetId') });
      };
      element.onmouseout = function () {
        let el = $(this);
        if (typeof self.events.onEndHover === 'function')
          return self.events.onEndHover({ sentenceId: el.attr('sentenceId'), datasetId: el.attr('datasetId') });
      };
      annotationsContainer.append(element);
    }
  }
};

// Build an empty page
PdfViewer.prototype.buildEmptyPage = function (num, width, height) {
  let page = document.createElement('div'),
    canvas = document.createElement('canvas'),
    wrapper = document.createElement('div'),
    textLayer = document.createElement('div'),
    annotationsLayer = document.createElement('div'),
    contoursLayer = document.createElement('div');

  page.className = 'page';
  wrapper.className = 'canvasWrapper';
  textLayer.className = 'textLayer';
  contoursLayer.className = 'contoursLayer';
  annotationsLayer.className = 'annotationsLayer';

  page.setAttribute('data-loaded', 'false');
  page.setAttribute('data-page-number', num);

  canvas.width = width;
  canvas.height = height;
  page.style.width = `${width}px`;
  page.style.height = `${height}px`;
  page.style.border = '0px';
  wrapper.style.width = `${width}px`;
  wrapper.style.height = `${height}px`;
  textLayer.style.width = `${width}px`;
  textLayer.style.height = `${height}px`;
  contoursLayer.style.width = `${width}px`;
  contoursLayer.style.height = `${height}px`;
  annotationsLayer.style.width = `${width}px`;
  annotationsLayer.style.height = `${height}px`;

  canvas.setAttribute('id', `page${num}`);

  page.appendChild(wrapper);
  page.appendChild(textLayer);
  page.appendChild(contoursLayer);
  page.appendChild(annotationsLayer);
  wrapper.appendChild(canvas);

  return page;
};

// Set events on an element (a contour)
PdfViewer.prototype.setEvents = function (items) {
  let self = this;
  for (let i = 0; i < items.length; i++) {
    let item = items[i];
    if (item.attr('events') === 'true') {
      let element = item.get(0);
      // the link here goes to the bibliographical reference
      element.onclick = function () {
        let el = $(this);
        if (typeof self.events.onClick === 'function')
          return self.events.onClick({
            sentenceId: el.attr('sentenceId'),
            datasetId: el.attr('datasetId')
          });
      };
      element.onmouseover = function () {
        let el = $(this);
        self.viewer.find(`.contour[sentenceId="${el.attr('sentenceId')}"]`).addClass('hover');
        if (typeof self.events.onHover === 'function')
          return self.events.onHover({ sentenceId: el.attr('sentenceId'), datasetId: el.attr('datasetId') });
      };
      element.onmouseout = function () {
        let el = $(this);
        self.viewer.find(`.contour[sentenceId="${el.attr('sentenceId')}"]`).removeClass('hover');
        if (typeof self.events.onEndHover === 'function')
          return self.events.onEndHover({ sentenceId: el.attr('sentenceId'), datasetId: el.attr('datasetId') });
      };
    }
  }
};

// Set Color to a sentence
PdfViewer.prototype.addCorresp = function (dataset, sentenceId) {
  this.setCanvasColor(sentenceId, BORDER_WIDTH, dataset.color.background.rgb);
  this.viewer
    .find(`.contoursLayer > .contour[sentenceId="${sentenceId}"]`)
    .attr('color', dataset.color.background.rgb)
    .attr('datasetId', dataset.id);
  this.viewer
    .find(`.annotationsLayer > s[sentenceId="${sentenceId}"]`)
    .attr('color', dataset.color.background.rgb)
    .attr('datasetId', dataset.id);
};

// Remove Color to a sentence
PdfViewer.prototype.removeCorresp = function (dataset, sentenceId) {
  this.setCanvasColor(sentenceId, BORDER_WIDTH, REMOVED_BORDER_COLOR);
  this.viewer.find(`.contoursLayer > .contour[sentenceId="${sentenceId}"]`).removeAttr('color').removeAttr('datasetId');
  this.viewer.find(`.annotationsLayer > s[sentenceId="${sentenceId}"]`).removeAttr('color').removeAttr('datasetId');
};

// Remove Color to a sentence
PdfViewer.prototype.removeCorresps = function (dataset) {
  let ids = this.viewer
    .find(`.contoursLayer > .contour[datasetId="${dataset.id}"]`)
    .map(function (item) {
      return $(this).attr('sentenceId');
    })
    .get();
  this.viewer.find(`.contoursLayer > .contour[datasetId="${dataset.id}"]`).removeAttr('color').removeAttr('datasetId');
  this.viewer.find(`.annotationsLayer > s[datasetId="${dataset.id}"]`).removeAttr('color').removeAttr('datasetId');
  for (let i = 0; i < ids.length; i++) {
    this.setCanvasColor(ids[i], BORDER_WIDTH, REMOVED_BORDER_COLOR);
  }
};

// Set Color to a sentence
PdfViewer.prototype.addDataset = function (dataset) {
  this.datasets[dataset.id] = dataset.sentenceId;
  this.setCanvasColor(dataset.sentenceId, BORDER_WIDTH, dataset.color.background.rgb);
  this.viewer
    .find(`.contoursLayer > .contour[sentenceId="${dataset.sentenceId}"]`)
    .attr('color', dataset.color.background.rgb)
    .attr('datasetId', dataset.id);
  this.viewer
    .find(`.annotationsLayer > s[sentenceId="${dataset.sentenceId}"]`)
    .attr('color', dataset.color.background.rgb)
    .attr('datasetId', dataset.id);
};

// Remove Color to a sentence
PdfViewer.prototype.removeDataset = function (dataset) {
  this.datasets[dataset.id] = undefined;
  this.setCanvasColor(dataset.sentenceId, BORDER_WIDTH, REMOVED_BORDER_COLOR);
  this.viewer
    .find(`.contoursLayer > .contour[sentenceId="${dataset.sentenceId}"]`)
    .removeAttr('color')
    .removeAttr('datasetId');
  this.viewer
    .find(`.annotationsLayer > s[sentenceId="${dataset.sentenceId}"]`)
    .removeAttr('color')
    .removeAttr('datasetId');
  this.removeCorresps(dataset);
};

// Scroll to a sentence
PdfViewer.prototype.scrollToDataset = function (datasetId) {
  let element = this.viewer.find(`s[datasetId="${datasetId}"]`).first(),
    numPage = parseInt(element.parent().parent().attr('data-page-number')),
    pages = this.viewer.find('div[class="page"]'),
    i = 1,
    height = 0;
  pages.map(function () {
    if (i < numPage) {
      height += $(this).outerHeight();
      i += 1;
    }
  });
  return height + element.position().top;
};

// Scroll to a sentence
PdfViewer.prototype.scrollToSentence = function (sentenceId) {
  let element = this.viewer.find(`s[sentenceId="${sentenceId}"]`).first(),
    numPage = parseInt(element.parent().parent().attr('data-page-number')),
    pages = this.viewer.find('div[class="page"]'),
    i = 1,
    height = 0;
  pages.map(function () {
    if (i < numPage) {
      height += $(this).outerHeight();
      i += 1;
    }
  });
  return height + element.position().top;
};

// selectSentence
PdfViewer.prototype.selectSentence = function (sentence) {
  this.viewer.find(`s[sentenceId="${sentence.sentenceId}"]`).addClass('selected');
  this.viewer.find(`.contoursLayer > .contour[sentenceId="${sentence.sentenceId}"]`).addClass('selected');
  this.selectCanvas(sentence.sentenceId);
};

// unselectSentence
PdfViewer.prototype.unselectSentence = function (sentence) {
  this.viewer.find(`s[sentenceId="${sentence.sentenceId}"]`).removeClass('selected');
  this.viewer.find(`.contoursLayer > .contour[sentenceId="${sentence.sentenceId}"]`).removeClass('selected');
  this.unselectCanvas(sentence.sentenceId);
};

// hoverSentence
PdfViewer.prototype.hoverSentence = function (sentence) {
  if (!sentence.isDataset) return this.hoverCanvas(sentence.sentenceId, sentence.isSelected);
};

// endHoverSentence
PdfViewer.prototype.endHoverSentence = function (sentence) {
  if (!sentence.isDataset) this.endHoverCanvas(sentence.sentenceId, sentence.isSelected);
};

// Build borders
PdfViewer.prototype.unselectCanvas = function (sentenceId) {
  let color = this.viewer.find(`.contoursLayer > .contour[sentenceId="${sentenceId}"]`).attr('color');
  this.setCanvasColor(sentenceId, BORDER_WIDTH, color ? color : REMOVED_BORDER_COLOR);
};

// Build borders
PdfViewer.prototype.selectCanvas = function (sentenceId) {
  this.setCanvasColor(sentenceId, BORDER_WIDTH, SELECTED_BORDER_COLOR, true);
};

// Build borders
PdfViewer.prototype.hoverCanvas = function (sentenceId, isSelected) {
  this.setCanvasColor(sentenceId, BORDER_WIDTH, isSelected ? SELECTED_BORDER_COLOR : HOVER_BORDER_COLOR, isSelected);
};

// Build borders
PdfViewer.prototype.endHoverCanvas = function (sentenceId, isSelected) {
  this.setCanvasColor(sentenceId, BORDER_WIDTH, isSelected ? SELECTED_BORDER_COLOR : REMOVED_BORDER_COLOR, isSelected);
};

// Draw multiple lines
PdfViewer.prototype.drawLines = function (canvas, lines, width, color = false, linedash = false) {
  let canvasElement = canvas.get(0),
    ctx = canvasElement.getContext('2d'),
    img = new Image();
  img.src = canvas.attr('data-url');
  img.onload = function () {
    ctx.drawImage(img, 0, 0);
    if (color) {
      if (linedash) ctx.setLineDash([15, 5]);
      else ctx.setLineDash([]);
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      for (let i = 0; i < lines.length; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.floor(lines[i].x0), Math.floor(lines[i].y0));
        ctx.lineTo(Math.floor(lines[i].x1), Math.floor(lines[i].y1));
        ctx.stroke();
        ctx.closePath();
      }
    }
  };
};

// Set color to a canvas
PdfViewer.prototype.setCanvasColor = function (sentenceId, width, color, linedash = false) {
  let self = this,
    canvas = this.container
      .find(`.contour[sentenceId="${sentenceId}"] canvas[sentenceId="${sentenceId}"]`)
      .map(function () {
        let element = $(this);
        self.drawLines(element, JSON.parse(element.attr('borders')), width, color, linedash);
      });
};

// Build canvas
PdfViewer.prototype.buildCanvas = function (_x, _y, _w, _h, p, sentenceId, borders = []) {
  let x = Math.floor(_x),
    y = Math.floor(_y),
    w = Math.floor(_w),
    h = Math.floor(_h);
  let mainCanvas = this.container.find(`canvas#page${p}`).get(0),
    newCanvas = $('<canvas>')
      .attr('style', `width:${w}px; height:${h}px; position:absolute; top:${y}px; left:${x}px;`)
      .attr('sentenceId', sentenceId)
      .attr('borders', JSON.stringify(borders)),
    canvasElement = newCanvas.get(0),
    ctx = canvasElement.getContext('2d');
  canvasElement.width = newCanvas.width();
  canvasElement.height = newCanvas.height();
  ctx.drawImage(mainCanvas, x, y, w, h, 0, 0, w, h);
  newCanvas.attr('data-url', canvasElement.toDataURL('image/jpeg'));
  return newCanvas;
};

// build div
PdfViewer.prototype.buildDiv = function (x, y, w, h, sentenceId, events = true) {
  let newDiv = $('<div>')
    .attr('style', `width:${w}px; height:${h}px; position:absolute; top:${y}px; left:${x}px;`)
    .attr('sentenceId', sentenceId)
    .attr('events', events);
  return newDiv;
};

// Get squares of given area (usefull to display borders)
PdfViewer.prototype.getSquares = function (area) {
  let lines = area.getLines(),
    sentenceId = area.sentenceId;
  /*
   * Borders :
   * // Top
   * { 'x0': xMin, 'y0': yMin, 'x1': xMax, 'y1': yMin },
   * // Right
   * { 'x0': xMax, 'y0': yMin, 'x1': xMax, 'y1': yMax },
   * // Bottom
   * { 'x0': xMax, 'y0': yMax, 'x1': xMin, 'y1': yMax },
   * // Left
   * { 'x0': xMin, 'y0': yMax, 'x1': xMin, 'y1': yMin },
   */
  // case area is a rectangle
  if (
    lines.length === 1 ||
    (lines[0].min.x === lines[lines.length - 1].min.x && lines[0].max.x < lines[lines.length - 1].max.x)
  ) {
    let x = area.min.x - MARGIN_CONTOUR.x - BORDER_WIDTH / 2,
      y = area.min.y - MARGIN_CONTOUR.y - BORDER_WIDTH / 2,
      w = area.w + MARGIN_CONTOUR.w + BORDER_WIDTH,
      h = area.h + MARGIN_CONTOUR.h + BORDER_WIDTH,
      xMin = BORDER_WIDTH,
      xMax = w - BORDER_WIDTH,
      yMin = BORDER_WIDTH,
      yMax = h - BORDER_WIDTH,
      borders = [
        { x0: xMin, y0: yMin, x1: xMax, y1: yMin },
        { x0: xMax, y0: yMin, x1: xMax, y1: yMax },
        { x0: xMax, y0: yMax, x1: xMin, y1: yMax },
        { x0: xMin, y0: yMax, x1: xMin, y1: yMin }
      ],
      divs = [this.buildDiv(x, y, w, h, sentenceId)],
      canvas = [this.buildCanvas(x, y, w, h, area.p, sentenceId, borders)];
    this.setEvents(divs);
    return divs.concat(canvas);
  }
  // case area is 2 separate rectangles
  if (lines.length === 2 && lines[lines.length - 1].max.x < lines[0].min.x) {
    let divs = [],
      canvas = [];
    for (let i = 0; i < lines.length; i++) {
      let x = lines[i].min.x - MARGIN_CONTOUR.x - BORDER_WIDTH / 2,
        y = lines[i].min.y - MARGIN_CONTOUR.y - BORDER_WIDTH / 2,
        w = lines[i].w + MARGIN_CONTOUR.w + BORDER_WIDTH,
        h = lines[i].h + MARGIN_CONTOUR.h + BORDER_WIDTH,
        xMin = BORDER_WIDTH,
        xMax = w - BORDER_WIDTH,
        yMin = BORDER_WIDTH,
        yMax = h - BORDER_WIDTH,
        borders =
          i === 0
            ? [
                { x0: xMin, y0: yMin, x1: xMax, y1: yMin },
                { x0: xMax, y0: yMax, x1: xMin, y1: yMax },
                { x0: xMin, y0: yMax, x1: xMin, y1: yMin }
              ]
            : [
                { x0: xMin, y0: yMin, x1: xMax, y1: yMin },
                { x0: xMax, y0: yMin, x1: xMax, y1: yMax },
                { x0: xMax, y0: yMax, x1: xMin, y1: yMax }
              ];
      divs.push(this.buildDiv(x, y, w, h, sentenceId));
      canvas.push(this.buildCanvas(x, y, w, h, area.p, sentenceId, borders));
    }
    this.setEvents(divs);
    return divs.concat(canvas);
  }
  /* case there is shapes like this :
   * xo  oo
   * oo  ox
   */
  if (lines[lines.length - 1].min.x === lines[0].min.x || lines[lines.length - 1].max.x === lines[0].max.x) {
    let divs = [],
      canvas = [],
      height = Math.round((area.h + MARGIN_CONTOUR.h + BORDER_WIDTH) / lines.length),
      topLeftCornerEmpty = lines[0].min.x > lines[lines.length - 1].min.x,
      topHeight = height * (topLeftCornerEmpty ? 1 : lines.length - 1),
      bottomHeight = height * (topLeftCornerEmpty ? lines.length - 1 : 1),
      top = {
        x: lines[0].min.x - MARGIN_CONTOUR.x - BORDER_WIDTH / 2,
        y: lines[0].min.y - MARGIN_CONTOUR.y - BORDER_WIDTH / 2,
        w: lines[0].w + MARGIN_CONTOUR.w + BORDER_WIDTH,
        h: topHeight
      },
      bottom = {
        x: lines[lines.length - 1].min.x - MARGIN_CONTOUR.x - BORDER_WIDTH / 2,
        y: top.y + topHeight,
        w: lines[lines.length - 1].w + MARGIN_CONTOUR.w + BORDER_WIDTH,
        h: bottomHeight
      },
      xMin = { top: BORDER_WIDTH / 2, bottom: BORDER_WIDTH / 2 },
      xMax = { top: top.w - BORDER_WIDTH / 2, bottom: bottom.w - BORDER_WIDTH / 2 },
      yMin = { top: BORDER_WIDTH / 2, bottom: BORDER_WIDTH / 2 },
      yMax = { top: top.h - BORDER_WIDTH / 2, bottom: bottom.h - BORDER_WIDTH / 2 };
    top.borders = topLeftCornerEmpty
      ? [
          { x0: xMin.top, y0: yMin.top, x1: xMax.top, y1: yMin.top }, // Top
          { x0: xMax.top, y0: yMin.top, x1: xMax.top, y1: BORDER_WIDTH + yMax.top }, // Right
          { x0: xMin.top, y0: BORDER_WIDTH + yMax.top, x1: xMin.top, y1: yMin.top } // left
        ]
      : [
          { x0: xMin.top, y0: yMin.top, x1: xMax.top, y1: yMin.top }, // Top
          { x0: xMax.top, y0: yMin.top, x1: xMax.top, y1: yMax.top }, // Right
          { x0: xMax.top, y0: yMax.top, x1: xMax.bottom - BORDER_WIDTH / 2, y1: yMax.top }, // Bottom
          { x0: xMin.top, y0: BORDER_WIDTH + yMax.top, x1: xMin.top, y1: yMin.top } // Left
        ];
    bottom.borders = topLeftCornerEmpty
      ? [
          { x0: xMin.bottom, y0: yMin.bottom, x1: BORDER_WIDTH + (top.x - bottom.x), y1: yMin.bottom }, // Top
          { x0: xMax.bottom, y0: 0, x1: xMax.bottom, y1: yMax.bottom }, // Right
          { x0: xMax.bottom, y0: yMax.bottom, x1: xMin.bottom, y1: yMax.bottom }, // Bottom
          { x0: xMin.bottom, y0: yMax.bottom, x1: xMin.bottom, y1: yMin.bottom } // Left
        ]
      : [
          { x0: xMax.bottom, y0: 0, x1: xMax.bottom, y1: yMax.bottom }, // Right
          { x0: xMax.bottom, y0: yMax.bottom, x1: xMin.bottom, y1: yMax.bottom }, // Bottom
          { x0: xMin.bottom, y0: yMax.bottom, x1: xMin.bottom, y1: 0 } // left
        ];
    if (topLeftCornerEmpty) {
      divs.push(this.buildDiv(top.x, top.y, top.w, top.h, sentenceId));
      divs.push(this.buildDiv(bottom.x, bottom.y, bottom.w, bottom.h, sentenceId));
      canvas.push(this.buildCanvas(top.x, top.y, top.w, top.h, area.p, sentenceId, top.borders));
      canvas.push(this.buildCanvas(bottom.x, bottom.y, bottom.w, bottom.h, area.p, sentenceId, bottom.borders));
    } else {
      divs.push(this.buildDiv(bottom.x, bottom.y, bottom.w, bottom.h, sentenceId));
      divs.push(this.buildDiv(top.x, top.y, top.w, top.h, sentenceId));
      canvas.push(this.buildCanvas(bottom.x, bottom.y, bottom.w, bottom.h, area.p, sentenceId, bottom.borders));
      canvas.push(this.buildCanvas(top.x, top.y, top.w, top.h, area.p, sentenceId, top.borders));
    }
    this.setEvents(divs);
    return divs.concat(canvas);
  }
  // case area is some complex rectangles
  /* There is 4 possible cases ([3*3]) :
   * xoo  xoo  xxo  xxo
   * ooo  ooo  ooo  ooo
   * oox  oxx  oox  oxx
   *
   * wich can be summarized by (by modifying the value of xCenter) :
   * xxo xoo
   * ooo ooo
   * oxx oox
   *
   * Notes :
   * o = there is content
   * x = there is no content
   */
  let fistLineMinX_gt_lastLineMaxX = lines[0].min.x > lines[lines.length - 1].max.x,
    bottomLeftEmpty = lines[lines.length - 2].min.x > lines[lines.length - 1].min.x,
    xCenter = fistLineMinX_gt_lastLineMaxX
      ? {
          min: lines[lines.length - 1].max.x,
          max: lines[0].min.x
        }
      : {
          min: lines[0].min.x,
          max: lines[lines.length - 1].max.x
        },
    topLeft = {
      x: area.min.x - MARGIN_CONTOUR.x,
      y: area.min.y - MARGIN_CONTOUR.y,
      w: xCenter.min - area.min.x + MARGIN_CONTOUR.w / 3,
      h:
        (lines[1].min.y === lines[0].max.y
          ? lines[1].min.y
          : lines[1].min.y < lines[0].max.y
          ? lines[0].max.y
          : lines[1].min.y - (lines[1].min.y - lines[0].max.y) / 2) -
        area.min.y +
        MARGIN_CONTOUR.h / 3
    },
    topMiddle = {
      x: topLeft.x + topLeft.w,
      y: topLeft.y,
      w: xCenter.max - xCenter.min + MARGIN_CONTOUR.w / 3,
      h: topLeft.h
    },
    topRight = {
      x: topMiddle.x + topMiddle.w,
      y: topLeft.y,
      w: area.max.x - xCenter.max + MARGIN_CONTOUR.w / 3,
      h: topLeft.h
    },
    middleLeft = {
      x: topLeft.x,
      y: topLeft.y + topLeft.h,
      w: topLeft.w,
      h:
        (lines[lines.length - 1].min.y === lines[lines.length - 2].max.y
          ? lines[lines.length - 1].min.y
          : lines[lines.length - 1].min.y < lines[lines.length - 2].max.y
          ? lines[lines.length - 2].max.y
          : lines[lines.length - 2].max.y - (lines[lines.length - 2].max.y - lines[lines.length - 1].min.y) / 2) -
        (topLeft.y + topLeft.h) +
        MARGIN_CONTOUR.h / 3
    },
    center = {
      x: topMiddle.x,
      y: middleLeft.y,
      w: topMiddle.w,
      h: middleLeft.h
    },
    middleRight = {
      x: topRight.x,
      y: middleLeft.y,
      w: topRight.w,
      h: middleLeft.h
    },
    bottomLeft = {
      x: middleLeft.x,
      y: middleLeft.y + middleLeft.h,
      w: middleLeft.w,
      h: area.max.y - (middleLeft.y + middleLeft.h) + MARGIN_CONTOUR.h / 3
    },
    bottomMiddle = {
      x: center.x,
      y: bottomLeft.y,
      w: center.w,
      h: bottomLeft.h
    },
    bottomRight = {
      x: topRight.x,
      y: bottomLeft.y,
      w: topRight.w,
      h: bottomLeft.h
    },
    events,
    divsInfos = [topLeft, topMiddle, topRight, middleLeft, center, middleRight, bottomLeft, bottomMiddle, bottomRight],
    divs = [],
    canvasInfos = [],
    canvas = [];
  if (fistLineMinX_gt_lastLineMaxX) {
    /* case :
     * xxo
     * ooo
     * oxx
     */
    events = [false, false, true, true, true, true, true, false, false];
    let xTopCanvas = topRight.x - BORDER_WIDTH / 2,
      yTopCanvas = topRight.y - BORDER_WIDTH / 2,
      wTopCanvas = topRight.w + BORDER_WIDTH,
      hTopCanvas = topRight.h + BORDER_WIDTH,
      xMinTopCanvasBorder = BORDER_WIDTH / 2,
      xMaxTopCanvasBorder = wTopCanvas - BORDER_WIDTH / 2,
      yMinTopCanvasBorder = BORDER_WIDTH / 2,
      yMaxTopCanvasBorder = hTopCanvas - BORDER_WIDTH / 2,
      bordersTopCanvas = [
        {
          // Top
          x0: xMinTopCanvasBorder,
          y0: yMinTopCanvasBorder,
          x1: xMaxTopCanvasBorder,
          y1: yMinTopCanvasBorder
        },
        {
          // Right
          x0: xMaxTopCanvasBorder,
          y0: yMinTopCanvasBorder,
          x1: xMaxTopCanvasBorder,
          y1: hTopCanvas // JOIN BORDERS
        },
        {
          // Left
          x0: xMinTopCanvasBorder,
          y0: hTopCanvas, // JOIN BORDERS
          x1: xMinTopCanvasBorder,
          y1: yMinTopCanvasBorder
        }
      ],
      topCanvas = {
        x: xTopCanvas,
        y: yTopCanvas,
        w: wTopCanvas,
        h: hTopCanvas,
        borders: bordersTopCanvas
      };
    let xMiddleCanvas = middleLeft.x - BORDER_WIDTH / 2,
      yMiddleCanvas = middleLeft.y - BORDER_WIDTH / 2,
      wMiddleCanvas = middleRight.x + middleRight.w - middleLeft.x + BORDER_WIDTH,
      hMiddleCanvas = middleLeft.h + BORDER_WIDTH,
      xMinMiddleCanvasBorder = BORDER_WIDTH / 2,
      xTopMaxMiddleCanvasBorder = center.x + center.w - middleLeft.x + BORDER_WIDTH,
      xBottomMinMiddleCanvasBorder = center.x - middleLeft.x - BORDER_WIDTH,
      xMaxMiddleCanvasBorder = wMiddleCanvas - BORDER_WIDTH / 2,
      yMinMiddleCanvasBorder = BORDER_WIDTH / 2,
      yMaxMiddleCanvasBorder = hMiddleCanvas - BORDER_WIDTH / 2,
      bordersMiddleCanvas = [
        {
          // Top
          x0: xMinMiddleCanvasBorder,
          y0: yMinMiddleCanvasBorder,
          x1: xTopMaxMiddleCanvasBorder,
          y1: yMinMiddleCanvasBorder
        },
        {
          // Right
          x0: xMaxMiddleCanvasBorder,
          y0: 0, // JOIN BORDERS
          x1: xMaxMiddleCanvasBorder,
          y1: yMaxMiddleCanvasBorder
        },
        {
          // Bottom
          x0: xMaxMiddleCanvasBorder,
          y0: yMaxMiddleCanvasBorder,
          x1: xBottomMinMiddleCanvasBorder,
          y1: yMaxMiddleCanvasBorder
        },
        {
          // Left
          x0: xMinMiddleCanvasBorder,
          y0: hMiddleCanvas, // JOIN BORDERS
          x1: xMinMiddleCanvasBorder,
          y1: yMinMiddleCanvasBorder
        }
      ],
      middleCanvas = {
        x: xMiddleCanvas,
        y: yMiddleCanvas,
        w: wMiddleCanvas,
        h: hMiddleCanvas,
        borders: bordersMiddleCanvas
      };
    let xBottomCanvas = bottomLeft.x - BORDER_WIDTH / 2,
      yBottomCanvas = bottomLeft.y - BORDER_WIDTH,
      wBottomCanvas = bottomLeft.w + BORDER_WIDTH,
      hBottomCanvas = bottomLeft.h + BORDER_WIDTH,
      xMinBottomCanvasBorder = BORDER_WIDTH / 2,
      xMaxBottomCanvasBorder = wBottomCanvas - BORDER_WIDTH / 2,
      yMinBottomCanvasBorder = BORDER_WIDTH / 2,
      yMaxBottomCanvasBorder = hBottomCanvas - BORDER_WIDTH / 2,
      bordersBottomCanvas = [
        {
          // Right
          x0: xMaxBottomCanvasBorder,
          y0: yMinBottomCanvasBorder,
          x1: xMaxBottomCanvasBorder,
          y1: yMaxBottomCanvasBorder
        },
        {
          // Bottom
          x0: xMaxBottomCanvasBorder,
          y0: yMaxBottomCanvasBorder,
          x1: xMinBottomCanvasBorder,
          y1: yMaxBottomCanvasBorder
        },
        {
          // Left
          x0: xMinBottomCanvasBorder,
          y0: yMaxBottomCanvasBorder,
          x1: xMinBottomCanvasBorder,
          y1: 0 // JOIN BORDERS
        }
      ],
      bottomCanvas = {
        x: xBottomCanvas,
        y: yBottomCanvas,
        w: wBottomCanvas,
        h: hBottomCanvas,
        borders: bordersBottomCanvas
      };
    canvasInfos.push(topCanvas);
    canvasInfos.push(middleCanvas);
    canvasInfos.push(bottomCanvas);
  } else {
    /* case :
     * xoo
     * ooo
     * oox
     */
    events = [false, true, true, true, true, true, true, true, false];
    let xTopCanvas = topMiddle.x - BORDER_WIDTH / 2,
      yTopCanvas = topMiddle.y - BORDER_WIDTH / 2,
      wTopCanvas = topRight.x + topRight.w - topMiddle.x + BORDER_WIDTH,
      hTopCanvas = topMiddle.h + BORDER_WIDTH,
      xMinTopCanvasBorder = BORDER_WIDTH / 2,
      xMaxTopCanvasBorder = wTopCanvas - BORDER_WIDTH / 2,
      yMinTopCanvasBorder = BORDER_WIDTH / 2,
      yMaxTopCanvasBorder = hTopCanvas - BORDER_WIDTH / 2,
      bordersTopCanvas = [
        {
          // Top
          x0: xMinTopCanvasBorder,
          y0: yMinTopCanvasBorder,
          x1: xMaxTopCanvasBorder,
          y1: yMinTopCanvasBorder
        },
        {
          // Right
          x0: xMaxTopCanvasBorder,
          y0: yMinTopCanvasBorder,
          x1: xMaxTopCanvasBorder,
          y1: hTopCanvas // JOIN BORDERS
        },
        {
          // Left
          x0: xMinTopCanvasBorder,
          y0: hTopCanvas, // JOIN BORDERS
          x1: xMinTopCanvasBorder,
          y1: yMinTopCanvasBorder
        }
      ],
      topCanvas = {
        x: xTopCanvas,
        y: yTopCanvas,
        w: wTopCanvas,
        h: hTopCanvas,
        borders: bordersTopCanvas
      };
    let xMiddleCanvas = middleLeft.x - BORDER_WIDTH / 2,
      yMiddleCanvas = middleLeft.y - BORDER_WIDTH / 2,
      wMiddleCanvas = middleRight.x + middleRight.w - middleLeft.x + BORDER_WIDTH,
      hMiddleCanvas = middleLeft.h + BORDER_WIDTH,
      xMinMiddleCanvasBorder = BORDER_WIDTH / 2,
      xTopMaxMiddleCanvasBorder = center.x - middleLeft.x + BORDER_WIDTH / 2,
      xBottomMinMiddleCanvasBorder = middleRight.x - middleLeft.x - BORDER_WIDTH / 2,
      xMaxMiddleCanvasBorder = wMiddleCanvas - BORDER_WIDTH / 2,
      yMinMiddleCanvasBorder = BORDER_WIDTH / 2,
      yMaxMiddleCanvasBorder = hMiddleCanvas - BORDER_WIDTH / 2,
      bordersMiddleCanvas = [
        {
          // Top
          x0: xMinMiddleCanvasBorder,
          y0: yMinMiddleCanvasBorder,
          x1: xTopMaxMiddleCanvasBorder,
          y1: yMinMiddleCanvasBorder
        },
        {
          // Right
          x0: xMaxMiddleCanvasBorder,
          y0: 0, // JOIN BORDERS
          x1: xMaxMiddleCanvasBorder,
          y1: yMaxMiddleCanvasBorder
        },
        {
          // Bottom
          x0: xMaxMiddleCanvasBorder,
          y0: yMaxMiddleCanvasBorder,
          x1: xBottomMinMiddleCanvasBorder,
          y1: yMaxMiddleCanvasBorder
        },
        {
          // Left
          x0: xMinMiddleCanvasBorder,
          y0: hMiddleCanvas, // JOIN BORDERS
          x1: xMinMiddleCanvasBorder,
          y1: yMinMiddleCanvasBorder
        }
      ],
      middleCanvas = {
        x: xMiddleCanvas,
        y: yMiddleCanvas,
        w: wMiddleCanvas,
        h: hMiddleCanvas,
        borders: bordersMiddleCanvas
      };
    let xBottomCanvas = bottomLeft.x - BORDER_WIDTH / 2,
      yBottomCanvas = bottomLeft.y - BORDER_WIDTH / 2,
      wBottomCanvas = bottomMiddle.x + bottomMiddle.w - bottomLeft.x + BORDER_WIDTH,
      hBottomCanvas = bottomMiddle.y + bottomMiddle.h - bottomLeft.y + BORDER_WIDTH,
      xMinBottomCanvasBorder = BORDER_WIDTH / 2,
      xMaxBottomCanvasBorder = wBottomCanvas - BORDER_WIDTH / 2,
      yMinBottomCanvasBorder = BORDER_WIDTH / 2,
      yMaxBottomCanvasBorder = hBottomCanvas - BORDER_WIDTH / 2,
      bordersBottomCanvas = [
        {
          // Right
          x0: xMaxBottomCanvasBorder,
          y0: yMinBottomCanvasBorder, // NO NEED TO JOIN BORDERS
          x1: xMaxBottomCanvasBorder,
          y1: yMaxBottomCanvasBorder
        },
        {
          // Bottom
          x0: xMaxBottomCanvasBorder,
          y0: yMaxBottomCanvasBorder,
          x1: xMinBottomCanvasBorder,
          y1: yMaxBottomCanvasBorder
        },
        {
          // Left
          x0: xMinBottomCanvasBorder,
          y0: yMaxBottomCanvasBorder,
          x1: xMinBottomCanvasBorder,
          y1: 0 // JOIN BORDERS
        }
      ],
      bottomCanvas = {
        x: xBottomCanvas,
        y: yBottomCanvas,
        w: wBottomCanvas,
        h: hBottomCanvas,
        borders: bordersBottomCanvas
      };
    canvasInfos.push(middleCanvas);
    canvasInfos.push(topCanvas);
    canvasInfos.push(bottomCanvas);
  }
  // Build canvas
  for (let i = 0; i < canvasInfos.length; i++) {
    canvas.push(
      this.buildCanvas(
        canvasInfos[i].x,
        canvasInfos[i].y,
        canvasInfos[i].w,
        canvasInfos[i].h,
        area.p,
        sentenceId,
        canvasInfos[i].borders
      )
    );
  }
  // Build div
  for (let i = 0; i < divsInfos.length; i++) {
    divs.push(this.buildDiv(divsInfos[i].x, divsInfos[i].y, divsInfos[i].w, divsInfos[i].h, sentenceId, events[i]));
  }
  this.setEvents(divs);
  return divs.concat(canvas);
};
