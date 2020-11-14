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
  REMOVED_BORDER_COLOR = 'rgba(255, 255, 255, 1)',
  HOVER_BORDER_COLOR = 'rgba(0, 0, 0, 1)',
  SELECTED_BORDER_COLOR = 'rgba(2, 116, 190, 1)';

const Chunk = function (data, scale) {
    // Representation of a chunk in PDF
    this.x = Math.floor((parseFloat(data.x) - MARGIN_CHUNK.x) * scale);
    this.y = Math.floor((parseFloat(data.y) - MARGIN_CHUNK.y) * scale);
    this.w = Math.ceil((parseFloat(data.w) + MARGIN_CHUNK.w * 2) * scale);
    this.h = Math.ceil((parseFloat(data.h) + MARGIN_CHUNK.h * 2) * scale);
    this.p = parseInt(data.p);
    return this;
  },
  Line = function (first) {
    // Representation of a line in PDF
    let chunks = [];
    this.h = 0;
    this.w = 0;
    this.yMid = { sum: 0, coeff: 0, avg: 0 };
    this.min = { x: Infinity, y: Infinity };
    this.max = { x: -Infinity, y: -Infinity };
    this.p = undefined;
    // getter of chunks
    this.chunks = function () {
      return chunks;
    };
    this.addChunk = function (input) {
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
      chunks.push(chunk);
    };
    this.isIn = function (chunk) {
      if (chunks.length <= 0) return true; // If there is no chunk, it will be "in" by default
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
    if (typeof first !== 'undefined') this.addChunk(first);
    return this;
  },
  Lines = function (chunks, scales) {
    // Representation of multipes lines in PDF (atteched to a given sentence)
    let collection = [new Line()];
    // getter of all lines
    this.all = function () {
      return collection;
    };
    this.getLast = function () {
      return collection[collection.length - 1];
    };
    this.newLine = function (chunk) {
      return collection.push(new Line(chunk));
    };
    this.addChunks = function (chunks = [], scales = {}) {
      for (let i = 0; i < chunks.length; i++) {
        let line = this.getLast(),
          item = chunks[i],
          scale = scales[item.p],
          chunk = new Chunk(item, scale);
        if (line.isIn(chunk)) line.addChunk(chunk);
        else this.newLine(chunk);
      }
    };
    if (Array.isArray(chunks)) this.addChunks(chunks, scales);
    return this;
  },
  Area = function (first) {
    let lines = [];
    this.getLines = function () {
      return lines;
    };
    this.addLine = function (line) {
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
      lines.push(line);
    };
    this.isNext = function (line, limits) {
      if (lines.length === 0) return true; // If there is no lines, it will be "next" by default
      let xMin = line.min.x,
        xMax = line.min.x + line.w,
        yMin = line.min.y,
        yMax = line.min.y + line.h,
        margin = 5,
        samePage = this.p === line.p,
        isTooUnder = yMin > this.max.y + margin,
        isTooUpper = yMax < this.min.y - margin;
      return samePage && !isTooUpper && !isTooUnder;
    };
    this.h = 0;
    this.w = 0;
    this.min = { x: Infinity, y: Infinity };
    this.max = { x: -Infinity, y: -Infinity };
    this.p = undefined;
    if (typeof first !== 'undefined') this.addLine(first);
    return this;
  },
  Areas = function (lines, limites) {
    let collection = [new Area()];
    this.newArea = function (line) {
      return collection.push(new Area(line));
    };
    this.getLast = function () {
      return collection[collection.length - 1];
    };
    this.all = function () {
      return collection;
    };
    this.addLines = function (lines = [], limites) {
      for (let i = 0; i < lines.length; i++) {
        let area = this.getLast(),
          line = lines[i];
        if (area.isNext(line, limites)) area.addLine(line);
        else this.newArea(line);
      }
    };
    if (Array.isArray(lines)) this.addLines(lines);
    return this;
  };

const PdfViewer = function (id, events) {
  let self = this;
  this.containerId = id;
  this.viewerId = id + '-viewer';
  this.container = $(`#${this.containerId}`);
  this.containerElement = this.container.get(0);
  this.viewer = $(`<div id="${this.viewerId}" class="pdfViewer"></div>`);
  this.viewerElement = this.viewer.get(0);
  this.container.append(this.viewer);
  this.events = events;

  // Load a given page
  this.loadPage = function (numPage, pdfPage, callback) {
    let desiredWidth = this.viewerElement.offsetWidth,
      viewport_tmp = pdfPage.getViewport({ scale: 1 }),
      the_scale = desiredWidth / viewport_tmp.width,
      viewport = pdfPage.getViewport({ scale: the_scale }),
      page = this.buildEmptyPage(numPage, viewport.width, viewport.height),
      canvas = page.querySelector('canvas'),
      wrapper = page.querySelector('.canvasWrapper'),
      container = page.querySelector('.textLayer'),
      canvasContext = canvas.getContext('2d');

    this.viewerElement.appendChild(page);

    return pdfPage
      .render({
        canvasContext: canvasContext,
        viewport: viewport
      })
      .promise.then(function () {
        return pdfPage.getTextContent().then(function (textContent) {
          pdfjsLib.renderTextLayer({
            textContent,
            container,
            viewport,
            textDivs: []
          });
          page.setAttribute('data-loaded', 'true');
          return callback(pdfPage, {
            width: viewport.width,
            height: viewport.height,
            number: numPage,
            scale: the_scale
          });
        });
      });
  };

  // Reorder pages
  this.sortPages = function () {
    this.container
      .find('div[class="page"]')
      .sort(function (a, b) {
        return parseInt($(a).attr('data-page-number')) - parseInt($(b).attr('data-page-number'), 10);
      })
      .appendTo(this.viewer);
  };

  // Refresh pdf display
  this.refresh = function (buffer, annotations, done) {
    // Loading document
    let loadingTask = pdfjsLib.getDocument({
      data: buffer,
      cMapUrl: CMAP_URL,
      cMapPacked: CMAP_PACKED
    });

    loadingTask.promise
      .then(function (pdfDocument) {
        let pageRendered = 0;
        let pages = new Array(pdfDocument.numPages);
        for (let i = 0; i < pdfDocument.numPages; i++) {
          let numPage = i + 1;
          pdfDocument.getPage(numPage).then(function (pdfPage) {
            self.loadPage(numPage, pdfPage, function (page, infos) {
              pages[numPage - 1] = {
                page_height: infos.height,
                page_width: infos.width,
                scale: infos.scale
              };
              pageRendered++;
              if (pageRendered >= pdfDocument.numPages) {
                self.setup(annotations, pages);
                self.sortPages();
                return done();
              }
            });
          });
        }
      })
      .catch((e) => {
        console.log(e);
        this.container.empty().append('<div>An error has occurred while processing the document</div>');
      });
    // Build all contours
    this.buildContours = function (mapping, chunks, scales, limites) {
      for (let key in mapping) {
        if (mapping[key].length > 0) {
          let sentenceChunks = chunks.slice(mapping[key][0], mapping[key][mapping[key].length - 1] + 1),
            lines = new Lines(sentenceChunks, scales).all();
          this.buildContour(lines, key, limites);
        }
      }
    };
    // Return contour of lines
    this.buildContour = function (lines, sentenceid, limites) {
      if (Array.isArray(lines)) {
        let areas = new Areas(lines).all();
        for (let i = 0; i < areas.length; i++) {
          let area = areas[i],
            contourLayer = this.container.find('.page[data-page-number="' + area.p + '"] .contourLayer'),
            borders = this.buildBorders(area, sentenceid);
          contourLayer.append(borders);
        }
        return true;
      } else return null;
    };
    this.setup = function (sentences, pages) {
      // we must check/wait that the corresponding PDF page is rendered at this point
      let scale = 1;
      // Add annotationsLayer for each page
      this.container.find('.page[data-page-number]').each(function (index) {
        let pageDiv = $(this),
          container = $('<div>'),
          contourLayer = $('<div>'),
          style = pageDiv.find('.canvasWrapper').attr('style');
        container.addClass('annotationsLayer');
        container.attr('style', style);
        contourLayer.addClass('contourLayer');
        contourLayer.attr('style', style);
        pageDiv.prepend(container);
        pageDiv.prepend(contourLayer);
      });
      let scales = {},
        limites = {};
      if (sentences.chunks) {
        sentences.chunks.forEach(function (chunk, n) {
          let numPage = chunk.p;
          if (pages[numPage - 1]) {
            scale = pages[numPage - 1].scale;
            limites[numPage - 1] = {
              w: pages[numPage - 1].page_width,
              h: pages[numPage - 1].page_height
            };
          }
          scales[numPage] = scale;
          self.annotate(chunk, scale);
        });
        if (sentences.mapping) {
          this.buildContours(sentences.mapping, sentences.chunks, scales, limites);
        }
      }
    };
    this.annotate = function (chunk, scale) {
      let page = chunk.p,
        annotationsContainer = this.container.find('.page[data-page-number="' + page + '"] .annotationsLayer'),
        ch = new Chunk(chunk, scale);
      //make events the area
      let element = document.createElement('s'),
        attributes =
          'width:' + ch.w + 'px; height:' + ch.h + 'px; position:absolute; top:' + ch.y + 'px; left:' + ch.x + 'px;';
      // element.setAttribute('style', attributes + 'border:1px solid; border-color: rgba(0, 0, 255, .5);');
      element.setAttribute('style', attributes);
      element.setAttribute('sentenceid', chunk.sentenceId);
      element.setAttribute('isPdf', true);
      if (chunk.datasetId) {
        // element.setAttribute('datasetid', chunk.datasetId);
        annotationsContainer.attr('subtype', 'dataseer');
      }
      // the link here goes to the bibliographical reference
      element.onclick = function () {
        events.click(chunk.sentenceId, this);
      };
      element.onmouseover = function () {
        events.hover(chunk.sentenceId, this);
      };
      element.onmouseout = function () {
        events.endHover(chunk.sentenceId, this);
      };
      annotationsContainer.append(element);
    };
  };

  this.buildEmptyPage = function (num, width, height) {
    let page = document.createElement('div'),
      canvas = document.createElement('canvas'),
      wrapper = document.createElement('div'),
      textLayer = document.createElement('div');

    page.className = 'page';
    wrapper.className = 'canvasWrapper';
    textLayer.className = 'textLayer';

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

    canvas.setAttribute('id', `page${num}`);

    page.appendChild(wrapper);
    page.appendChild(textLayer);
    wrapper.appendChild(canvas);

    return page;
  };

  this.render = function (buffer, annotations, cb) {
    console.log('rendering PDF...');
    this.viewer.empty();
    return this.refresh(buffer, annotations, function () {
      console.log('render of PDF done.');
      return cb();
    });
  };

  // Build borders
  this.buildBorders = function (area, sentenceid) {
    let container = $('<div>'),
      borders = this.getSquares(area, sentenceid);
    container.attr('sentenceid', sentenceid).attr('class', 'contour');
    borders.map(function (item) {
      return container.append(item);
    });
    return container;
  };

  this.unselectCanvas = function (sentenceid) {
    let color = this.viewer.find('.contourLayer > div[sentenceid="' + sentenceid + '"]').attr('color');
    this.setCanvasColor(sentenceid, BORDER_WIDTH, color ? color : REMOVED_BORDER_COLOR);
  };

  this.selectCanvas = function (sentenceid) {
    this.setCanvasColor(sentenceid, BORDER_WIDTH, SELECTED_BORDER_COLOR);
  };

  this.hoverCanvas = function (sentenceid, isDataset, isSelected) {
    if (isDataset)
      this.setCanvasColor(
        sentenceid,
        BORDER_WIDTH,
        this.viewer.find('.contourLayer > div[sentenceid="' + sentenceid + '"]').attr('color')
      );
    else this.setCanvasColor(sentenceid, BORDER_WIDTH, isSelected ? SELECTED_BORDER_COLOR : HOVER_BORDER_COLOR);
  };

  this.endHoverCanvas = function (sentenceid, isDataset, isSelected) {
    if (isDataset)
      this.setCanvasColor(
        sentenceid,
        BORDER_WIDTH,
        this.viewer.find('.contourLayer > div[sentenceid="' + sentenceid + '"]').attr('color')
      );
    else this.setCanvasColor(sentenceid, BORDER_WIDTH, isSelected ? SELECTED_BORDER_COLOR : REMOVED_BORDER_COLOR);
  };

  // draw multiple lines
  this.drawLines = function (canvas, lines, width, color) {
    let canvasElement = canvas.get(0),
      ctx = canvasElement.getContext('2d'),
      img = new Image();
    img.src = canvas.attr('data-url');
    img.onload = function () {
      ctx.drawImage(img, 0, 0);
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      for (let i = 0; i < lines.length; i++) {
        ctx.beginPath();
        ctx.moveTo(lines[i].x0, lines[i].y0);
        ctx.lineTo(lines[i].x1, lines[i].y1);
        ctx.stroke();
        ctx.closePath();
      }
    };
  };

  this.setCanvasColor = function (sentenceid, width, color) {
    let canvas = this.container
      .find(`.contour[sentenceid="${sentenceid}"] canvas[sentenceid="${sentenceid}"]`)
      .map(function () {
        let element = $(this);
        self.drawLines(element, JSON.parse(element.attr('borders')), width, color);
      });
  };

  // Build canvas
  this.buildCanvas = function (_x, _y, _w, _h, p, sentenceid, borders = []) {
    let x = Math.floor(_x),
      y = Math.floor(_y),
      w = Math.floor(_w),
      h = Math.floor(_h);
    let mainCanvas = this.container.find(`canvas#page${p}`).get(0),
      newCanvas = $('<canvas>')
        .attr('style', `width: ${w}px;` + `height: ${h}px;` + `position:absolute;` + `top: ${y}px;` + `left: ${x}px;`)
        .attr('sentenceid', sentenceid)
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
  this.buildDiv = function (x, y, w, h, sentenceid, events = true) {
    let newDiv = $('<div>')
      .attr('style', `width: ${w}px;` + `height: ${h}px;` + `position:absolute;` + `top: ${y}px;` + `left: ${x}px;`)
      .attr('sentenceid', sentenceid)
      .attr('events', events);
    return newDiv;
  };

  // Get squares of given area (usefull to display borders)
  this.getSquares = function (area, sentenceid) {
    let lines = area.getLines();
    // case area is a rectangle
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
        divs = [this.buildDiv(x, y, w, h, sentenceid)],
        canvas = [this.buildCanvas(x, y, w, h, area.p, sentenceid, borders)];
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
        divs.push(this.buildDiv(x, y, w, h, sentenceid));
        canvas.push(this.buildCanvas(x, y, w, h, area.p, sentenceid, borders));
      }
      this.setEvents(divs);
      return divs.concat(canvas);
    }
    // case area is some complex rectangles
    let fistLineMinX_gt_lastLineMaxX = lines[0].min.x > lines[lines.length - 1].max.x,
      fistLineMinX_gt_secondLineMinX = lines[0].min.x > lines[1].min.x,
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
      divsInfos = [
        topLeft,
        topMiddle,
        topRight,
        middleLeft,
        center,
        middleRight,
        bottomLeft,
        bottomMiddle,
        bottomRight
      ],
      divs = [],
      canvasInfos = [],
      canvas = [];
    if (fistLineMinX_gt_secondLineMinX) {
      if (fistLineMinX_gt_lastLineMaxX) {
        /* case : 1 && 1
         * x x o
         * o o o
         * o x x
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
        /* case : 1 && 0
         * x o o
         * o o o
         * o o x
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
    } else {
      /* case : 0 && 1 || 0 && 0
       * x o o
       * x o o
       * x o x
       */
      events = [false, true, true, false, true, true, false, true, false];
      let xTopCanvas = topMiddle.x - BORDER_WIDTH / 2,
        yTopCanvas = topMiddle.y - BORDER_WIDTH / 2,
        wTopCanvas = topMiddle.w + middleRight.w + BORDER_WIDTH,
        hTopCanvas = topMiddle.h + center.h + BORDER_WIDTH,
        xMinTopCanvasBorder = BORDER_WIDTH / 2,
        xBottomMinTopCanvasBorder = middleRight.x - middleLeft.x - BORDER_WIDTH / 2,
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
            // Bottom
            x0: xMaxTopCanvasBorder,
            y0: yMaxTopCanvasBorder,
            x1: xBottomMinTopCanvasBorder,
            y1: yMaxTopCanvasBorder
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
      let xBottomCanvas = bottomMiddle.x - BORDER_WIDTH / 2,
        yBottomCanvas = bottomMiddle.y - BORDER_WIDTH / 2,
        wBottomCanvas = bottomMiddle.w + BORDER_WIDTH,
        hBottomCanvas = bottomMiddle.h + BORDER_WIDTH,
        xMinBottomCanvasBorder = BORDER_WIDTH / 2,
        xMaxBottomCanvasBorder = wBottomCanvas - BORDER_WIDTH / 2,
        yMinBottomCanvasBorder = BORDER_WIDTH / 2,
        yMaxBottomCanvasBorder = hBottomCanvas - BORDER_WIDTH,
        bordersBottomCanvas = [
          {
            // Right
            x0: xMaxBottomCanvasBorder,
            y0: 0, // JOIN TOP/BOTTOM CANVAS
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
            y1: 0 // JOIN TOP/BOTTOM CANVAS
          }
        ],
        bottomCanvas = {
          x: xBottomCanvas,
          y: yBottomCanvas,
          w: wBottomCanvas,
          h: hBottomCanvas,
          borders: bordersBottomCanvas
        };
      canvasInfos.push(bottomCanvas);
      canvasInfos.push(topCanvas);
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
          sentenceid,
          canvasInfos[i].borders
        )
      );
    }
    // Build div
    for (let i = 0; i < divsInfos.length; i++) {
      divs.push(this.buildDiv(divsInfos[i].x, divsInfos[i].y, divsInfos[i].w, divsInfos[i].h, sentenceid, events[i]));
    }
    this.setEvents(divs);
    return divs.concat(canvas);
  };

  this.setEvents = function (items) {
    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      if (item.attr('events') === 'true') {
        let element = item.get(0),
          sentenceid = item.attr('sentenceid');
        // the link here goes to the bibliographical reference
        element.onclick = function () {
          events.click(sentenceid, this);
        };
        element.onmouseover = function () {
          item.parent().addClass('hover');
          events.hover(sentenceid, this);
        };
        element.onmouseout = function () {
          item.parent().removeClass('hover');
          events.endHover(sentenceid, this);
        };
      }
    }
  };

  this.setColor = function (sentenceid, color, datasetid) {
    this.setCanvasColor(sentenceid, BORDER_WIDTH, color);
    this.viewer
      .find('.contourLayer > div[sentenceid="' + sentenceid + '"]')
      .attr('color', color)
      .attr('datasetid', datasetid);
  };
  this.removeColor = function (sentenceid) {
    this.setCanvasColor(sentenceid, BORDER_WIDTH, REMOVED_BORDER_COLOR);
    this.viewer
      .find('.contourLayer > div[sentenceid="' + sentenceid + '"]')
      .attr('color', REMOVED_BORDER_COLOR)
      .removeAttr('datasetid');
  };
  this.scrollToSentence = function (sentenceid) {
    let element = this.viewer.find('s[sentenceid="' + sentenceid + '"]').first(),
      numPage = parseInt(element.parent().parent().attr('data-page-number')),
      pages = this.viewer.find('div[class="page"]'),
      i = 1,
      height = 0;
    pages.map(function () {
      if (i < numPage) {
        height += $(this).height();
        i += 1;
      }
    });
    return height + element.position().top;
  };
  return this;
};
