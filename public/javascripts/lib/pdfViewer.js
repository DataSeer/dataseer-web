/*
 * @prettier
 */
'use strict';

const workerSrcPath = '../javascripts/pdf.js/build/pdf.worker.js';
const sentenceColor = 'black';

if (typeof pdfjsLib === 'undefined' || (!pdfjsLib && !pdfjsLib.getDocument)) {
  console.error('Please build the pdfjs-dist library using\n' + '  `gulp dist-install`');
}
// The workerSrc property shall be specified.
//
else pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrcPath;

const CMAP_URL = '../javascripts/pdf.js/build/generic/web/cmaps/',
  CMAP_PACKED = true,
  DEFAULT_COLOR = 'black';

const Chunk = function(data, scale) {
    // Representation of a chunk in PDF
    this.x = parseInt(data.x) * scale;
    this.y = parseInt(data.y) * scale;
    this.w = parseInt(data.w) * scale;
    this.h = parseInt(data.h) * scale;
    this.p = parseInt(data.p);
    return this;
  },
  Line = function(first) {
    // Representation of a line in PDF
    let chunks = [];
    this.margin = { y: 5 };
    this.h = 0;
    this.w = 0;
    this.min = { x: Infinity, y: Infinity };
    this.max = { x: -Infinity, y: -Infinity };
    this.p = undefined;
    // getter of chunks
    this.chunks = function() {
      return chunks;
    };
    this.addChunk = function(chunk) {
      let xMin = chunk.x,
        xMax = chunk.x + chunk.w,
        yMin = chunk.y,
        yMax = chunk.y + chunk.h;
      if (this.min.x > xMin) this.min.x = xMin;
      if (this.max.x < xMax) this.max.x = xMax;
      if (this.min.y > yMin) this.min.y = yMin;
      if (this.max.y < yMax) this.max.y = yMax;
      this.w = this.max.x - this.min.x;
      this.h = this.max.y - this.min.y;
      if (typeof this.p === 'undefined') this.p = chunk.p;
      chunks.push(chunk);
    };
    this.isIn = function(chunk) {
      if (chunks.length <= 0) return true; // If there is no chunk, it will be "in" by default
      let yMin = chunk.y,
        yMax = chunk.y + chunk.h,
        samePage = typeof this.p === 'undefined' || this.p === chunk.p,
        outY = yMin - this.margin.y > this.max.y || yMax + this.margin.y < this.min.y;
      return samePage && !outY;
    };
    if (typeof first !== 'undefined') this.addChunk(first);
    return this;
  },
  Lines = function(chunks, scales) {
    // Representation of multipes lines in PDF (atteched to a given sentence)
    let collection = [new Line()];
    // getter of all lines
    this.all = function() {
      return collection;
    };
    this.getLast = function() {
      return collection[collection.length - 1];
    };
    this.newLine = function(chunk) {
      return collection.push(new Line(chunk));
    };
    this.addChunks = function(chunks = [], scales = {}) {
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
  Area = function(first) {
    this.margin = { y: 5 };
    let lines = [];
    this.getLines = function() {
      return lines;
    };
    this.addLine = function(line) {
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
    this.isNext = function(line) {
      if (lines.length === 0) return true; // If there is no lines, it will be "next" by default
      let xMin = line.min.x,
        xMax = line.min.x + line.w,
        yMin = line.min.y,
        yMax = line.min.y + line.h,
        samePage = typeof this.p === 'undefined' || this.p === line.p,
        isUpper = yMax <= this.min.y - this.margin.y;
      return samePage && !isUpper;
    };
    this.h = 0;
    this.w = 0;
    this.min = { x: Infinity, y: Infinity };
    this.max = { x: -Infinity, y: -Infinity };
    this.p = undefined;
    if (typeof first !== 'undefined') this.addLine(first);
    return this;
  },
  Areas = function(lines) {
    let collection = [new Area()];
    this.newArea = function(line) {
      return collection.push(new Area(line));
    };
    this.getLast = function() {
      return collection[collection.length - 1];
    };
    this.all = function() {
      return collection;
    };
    this.addLines = function(lines = []) {
      for (let i = 0; i < lines.length; i++) {
        let area = this.getLast(),
          line = lines[i];
        if (area.isNext(line)) area.addLine(line);
        else this.newArea(line);
      }
    };
    if (Array.isArray(lines)) this.addLines(lines);
    return this;
  };

const PdfViewer = function(id, events) {
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
  this.loadPage = function(numPage, pdfPage, callback) {
    let desiredWidth = this.viewerElement.offsetWidth,
      viewport_tmp = pdfPage.getViewport({ scale: 1 }),
      the_scale = desiredWidth / viewport_tmp.width,
      viewport = pdfPage.getViewport({ 'scale': the_scale }),
      page = this.buildEmptyPage(numPage, viewport.width, viewport.height),
      canvas = page.querySelector('canvas'),
      wrapper = page.querySelector('.canvasWrapper'),
      container = page.querySelector('.textLayer'),
      canvasContext = canvas.getContext('2d');

    this.viewerElement.appendChild(page);

    return pdfPage
      .render({
        'canvasContext': canvasContext,
        'viewport': viewport
      })
      .promise.then(function() {
        return pdfPage.getTextContent().then(function(textContent) {
          pdfjsLib.renderTextLayer({
            textContent,
            container,
            viewport,
            textDivs: []
          });
          page.setAttribute('data-loaded', 'true');
          return callback(pdfPage, {
            'width': viewport.width,
            'height': viewport.height,
            'number': numPage,
            'scale': the_scale
          });
        });
      });
  };

  // Reorder pages
  this.sortPages = function() {
    this.container
      .find('div[class="page"]')
      .sort(function(a, b) {
        return parseInt($(a).attr('data-page-number')) - parseInt($(b).attr('data-page-number'));
      })
      .appendTo(this.viewer);
  };

  // Refresh pdf display
  this.refresh = function(buffer, annotations, done) {
    // Loading document
    let loadingTask = pdfjsLib.getDocument({
      'data': buffer,
      'cMapUrl': CMAP_URL,
      'cMapPacked': CMAP_PACKED
    });

    loadingTask.promise
      .then(function(pdfDocument) {
        let pageRendered = 0;
        let pages = new Array(pdfDocument.numPages);
        for (let i = 0; i < pdfDocument.numPages; i++) {
          let numPage = i + 1;
          pdfDocument.getPage(numPage).then(function(pdfPage) {
            self.loadPage(numPage, pdfPage, function(page, infos) {
              pages[numPage - 1] = { 'page_height': infos.height, 'page_width': infos.width, 'scale': infos.scale };
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
    this.buildContours = function(mapping, chunks, color, scales) {
      for (let key in mapping) {
        if (mapping[key].length > 0) {
          let sentenceChunks = chunks.slice(mapping[key][0], mapping[key][mapping[key].length - 1] + 1),
            lines = new Lines(sentenceChunks, scales).all();
          this.buildContour(lines, key, color);
        }
      }
    };
    // Return contour of lines
    this.buildContour = function(lines, sentenceid, color) {
      if (Array.isArray(lines)) {
        let areas = new Areas(lines).all();
        for (let i = 0; i < areas.length; i++) {
          let area = areas[i],
            contourAnnotationsLayer = this.container.find(
              '.page[data-page-number="' + area.p + '"] .contourAnnotationsLayer'
            ),
            borders = this.buildBorders(area, sentenceid, color);
          contourAnnotationsLayer.append(borders);
        }
        return true;
      } else return null;
    };
    this.setup = function(sentences, pages) {
      // we must check/wait that the corresponding PDF page is rendered at this point
      let scale = 1;
      // Add annotationsLayer for each page
      this.container.find('.page[data-page-number]').each(function(index) {
        let pageDiv = $(this),
          container = $('<div>'),
          contourAnnotationsLayer = $('<div>'),
          style = pageDiv.find('.canvasWrapper').attr('style');
        container.addClass('annotationsLayer');
        container.attr('style', style);
        contourAnnotationsLayer.addClass('contourAnnotationsLayer');
        contourAnnotationsLayer.attr('style', style);
        pageDiv.prepend(container);
        pageDiv.prepend(contourAnnotationsLayer);
      });
      let scales = {};
      if (sentences.chunks) {
        sentences.chunks.forEach(function(chunk, n) {
          let numPage = chunk.p;
          if (pages[numPage - 1]) {
            scale = pages[numPage - 1].scale;
          }
          scales[numPage] = scale;
          self.annotate(chunk, scale);
        });
        if (sentences.mapping) {
          this.buildContours(sentences.mapping, sentences.chunks, DEFAULT_COLOR, scales);
        }
      }
    };
    this.annotate = function(chunk, scale) {
      let page = chunk.p,
        annotationsContainer = this.container.find('.page[data-page-number="' + page + '"] .annotationsLayer'),
        scale_x = scale,
        scale_y = scale,
        margin = {
          x: 1.5,
          y: 1.5,
          w: 1.5,
          h: 1.5
        },
        x = (parseInt(chunk.x) - margin.x) * scale_x,
        y = (parseInt(chunk.y) - margin.y) * scale_y,
        width = (parseInt(chunk.w) + margin.w * 2) * scale_x,
        height = (parseInt(chunk.h) + margin.h * 2) * scale_y;
      //make clickable the area
      let element = document.createElement('s'),
        attributes =
          'width:' + width + 'px; height:' + height + 'px; position:absolute; top:' + y + 'px; left:' + x + 'px;';

      // element.setAttribute('style', attributes + 'border:1px solid; border-color: rgba(0, 0, 255, .5);');
      element.setAttribute('style', attributes);
      element.setAttribute('sentenceid', chunk.sentenceId);
      element.setAttribute('isPdf', true);
      if (chunk.datasetId) {
        // element.setAttribute('datasetid', chunk.datasetId);
        annotationsContainer.attr('subtype', 'dataseer');
      }
      // the link here goes to the bibliographical reference
      element.onclick = function() {
        events.click(chunk, this);
      };
      element.onmouseover = function() {
        events.hover(chunk, this);
      };
      element.onmouseout = function() {
        events.endHover(chunk, this);
      };
      annotationsContainer.append(element);
    };
  };

  this.buildEmptyPage = function(num, width, height) {
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

  this.render = function(buffer, annotations, cb) {
    console.log('rendering PDF...');
    this.viewer.empty();
    return this.refresh(buffer, annotations, function() {
      console.log('render of PDF done.');
      return cb();
    });
  };

  // Build borders
  this.buildBorders = function(area, sentenceid, color) {
    let margin = {
        x: 5,
        y: 5,
        w: 5,
        h: 5
      },
      container = $('<div>'),
      borders = this.getSquares(area, color, margin);
    container.attr('sentenceid', sentenceid).attr('class', 'contour');
    borders.map(function(item) {
      return container.append(item);
    });
    return container;
  };
  // Get squares of given area (usefull to display borders)
  this.getSquares = function(area, color, margin) {
    let result = [],
      lines = area.getLines();
    if (lines.length === 1) {
      let borders = $('<div>').attr(
        'style',
        'border: 0px solid ' +
          color +
          ';width:' +
          (area.w + margin.w * 2) +
          'px; height:' +
          (area.h + margin.h * 2) +
          'px; position:absolute; top:' +
          (area.min.y - margin.y) +
          'px; left:' +
          (area.min.x - margin.x) +
          'px;'
      );
      result.push(borders);
    } else if (lines.length === 2 && lines[1].max.x < lines[0].min.x) {
      let top = $('<div>').attr(
          'style',
          'border: 0px solid ' +
            color +
            ';border-right: none; width:' +
            (lines[0].w + margin.w * 2) +
            'px; height:' +
            (lines[0].h + margin.h * 2) +
            'px; position:absolute; top:' +
            (lines[0].min.y - margin.y) +
            'px; left:' +
            (lines[0].min.x - margin.x) +
            'px;'
        ),
        bottom = $('<div>').attr(
          'style',
          'border: 0px solid ' +
            color +
            ';border-left: none; width:' +
            (lines[1].w + margin.w * 2) +
            'px; height:' +
            (lines[1].h + margin.h * 2) +
            'px; position:absolute; top:' +
            (lines[1].min.y - margin.y) +
            'px; left:' +
            (lines[1].min.x - margin.x) +
            'px;'
        );
      result.push(top);
      result.push(bottom);
    } else {
      let topLeft = {
          'x': area.min.x - margin.x,
          'y': area.min.y - margin.y,
          'w': lines[0].min.x - area.min.x + (lines[0].min.x !== lines[1].min.x ? margin.w : 0),
          'h': lines[1].min.y - area.min.y + margin.h,
          'borders': ';border-top: none; border-left: none; width:'
        },
        topRight = {
          'x': topLeft.x + topLeft.w,
          'y': area.min.y - margin.y,
          'w': area.max.x - (topLeft.x + topLeft.w) + margin.w,
          'h': lines[lines.length - 2].max.y - area.min.y + margin.h,
          'borders': ';border-bottom: none; border-left: none; width:'
        },
        bottomLeft = {
          'x': area.min.x - margin.x,
          'y': topLeft.y + topLeft.h,
          'w': lines[lines.length - 1].w + margin.w,
          'h': area.max.y - lines[1].min.y + margin.h,
          'borders': ';border-top: none; border-right: none; width:'
        },
        bottomRight = {
          'x': area.min.x + lines[lines.length - 1].w,
          'y': topRight.y + topRight.h,
          'w': area.max.x - lines[lines.length - 1].max.x + margin.w,
          'h': area.max.y - lines[lines.length - 2].max.y + margin.h,
          'borders': ';border-bottom: none; border-right: none; width:'
        },
        elements = [topLeft, topRight, bottomLeft, bottomRight];
      for (let i = 0; i < elements.length; i++) {
        elements[i];
        result.push(
          $('<div>').attr(
            'style',
            'border: 0px solid ' +
              color +
              elements[i].borders +
              elements[i].w +
              'px; height:' +
              elements[i].h +
              'px; position:absolute; top:' +
              elements[i].y +
              'px; left:' +
              elements[i].x +
              'px;'
          )
        );
      }
    }
    return result;
  };

  this.setColor = function(sentenceid, color) {
    this.viewer
      .find('.contourAnnotationsLayer > div[sentenceid="' + sentenceid + '"] > div')
      .css('border-color', color)
      .addClass('coloredContour');
  };
  this.removeColor = function(sentenceid) {
    this.viewer
      .find('.contourAnnotationsLayer > div[sentenceid="' + sentenceid + '"] > div')
      .css('border-color', DEFAULT_COLOR)
      .removeClass('coloredContour');
  };
  this.scrollToSentence = function(sentenceid) {
    let element = this.viewer.find('s[sentenceid="' + sentenceid + '"]').first(),
      numPage = parseInt(
        element
          .parent()
          .parent()
          .attr('data-page-number')
      ),
      pages = this.viewer.find('div[class="page"]'),
      i = 1,
      height = 0;
    pages.map(function() {
      if (i < numPage) {
        height += $(this).height();
        i += 1;
      }
    });
    return height + element.position().top;
  };
  return this;
};