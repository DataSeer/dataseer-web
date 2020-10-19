/*
 * @prettier
 */
'use strict';

let getColor = function() {
  getColor.bool = !getColor.bool;
  return getColor.bool ? 'blue' : 'red';
};

let getColor2 = function() {
  getColor2.bool = !getColor2.bool;
  return getColor2.bool ? 'gold' : 'green';
};

let workerSrcPath = '../javascripts/pdf.js/build/pdf.worker.js';

if (typeof pdfjsLib === 'undefined' || (!pdfjsLib && !pdfjsLib.getDocument)) {
  console.error('Please build the pdfjs-dist library using\n' + '  `gulp dist-install`');
}
// The workerSrc property shall be specified.
//
else pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrcPath;

let Area = function(data) {
    this.addPoints = function(square) {
      this.points.push([x0, y0]);
      this.points.push([x1, y0]);
      this.points.push([x1, y1]);
      this.points.push([x0, y1]);
    };
    this.points = [];
    this.lines = [];
    this.p = data.p;
    this.h = data.h;
    this.w = data.w;
    this.min = {
      x: data.x,
      y: data.y
    };
    this.max = {
      x: data.x + data.w,
      y: data.y + data.h
    };
    this.addPoints({ 'x': data.x, 'y': data.y, 'w': data.w, 'h': data.h });
    return this;
  },
  Areas = function(sentenceId) {
    this.sentenceId = sentenceId;
    this.areas = [];
    return this;
  };

let the_scale = 1.5;
// Some PDFs need external cmaps.
//
const CMAP_URL = '../javascripts/pdf.js/build/generic/web/cmaps/',
  CMAP_PACKED = true,
  //VIEWPORT_SCALE = 1.5,
  pdf_viewer = {
    'createEmptyPage': function(num, width, height) {
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
    },
    'loadPage': function(viewer, numPage, pdfPage, callback) {
      //let viewport = pdfPage.getViewport({ 'scale': VIEWPORT_SCALE }),
      let desiredWidth = viewer.offsetWidth;
      let viewport_tmp = pdfPage.getViewport({ scale: 1 });
      the_scale = desiredWidth / viewport_tmp.width;
      let viewport = pdfPage.getViewport({ 'scale': the_scale }),
        page = pdf_viewer.createEmptyPage(numPage, viewport.width, viewport.height),
        canvas = page.querySelector('canvas'),
        wrapper = page.querySelector('.canvasWrapper'),
        container = page.querySelector('.textLayer'),
        canvasContext = canvas.getContext('2d');

      viewer.appendChild(page);

      pdfPage
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
            return callback(pdfPage, { 'width': viewport.width, 'height': viewport.height, 'number': numPage });
          });
        });
    }
  },
  PdfManager = {
    'linkDatasetToSentence': function(doc, sentenceid, id) {
      let ids = doc.pdf.metadata.sentences.mapping[sentenceid];
      for (let i = 0; i < ids.length; i++) {
        doc.pdf.metadata.sentences.chunks[ids[i]].datasetid = id;
      }
    },
    'unlinkDatasetToSentence': function(doc, sentenceid) {
      let ids = doc.pdf.metadata.sentences.mapping[sentenceid];
      for (let i = 0; i < ids.length; i++) {
        doc.pdf.metadata.sentences.chunks[ids[i]].datasetid = undefined;
      }
    },
    'setColor': function(sentenceid, color) {
      $('#pdf s[sentenceid="' + sentenceid + '"]').css('background-color', color);
    },
    'removeColor': function(sentenceid) {
      $('#pdf s[sentenceid="' + sentenceid + '"]').css('background-color', '');
    },
    'scrollToSentence': function(sentenceid) {
      let element = $('#pdf s[sentenceid="' + sentenceid + '"]').first(),
        numPage = parseInt(
          element
            .parent()
            .parent()
            .attr('data-page-number')
        ),
        pages = $('#pdf div[class="page"]'),
        i = 1,
        height = 0;
      pages.map(function() {
        if (i < numPage) {
          height += $(this).height();
          i += 1;
        }
      });
      return height + element.position().top;
    },
    'showPdfLoadingLoop': function() {
      $('body').css('cursor', 'progress');
      return PdfManager.pdfViewer.find('#LoadingLoop').show();
    },
    'hidePdfLoadingLoop': function() {
      $('body').css('cursor', 'default');
      return PdfManager.pdfViewer.find('#LoadingLoop').hide();
    },
    // Reorder pages
    'sortPages': function() {
      let wrapper = $('#pdf-viewer');
      wrapper
        .find('div[class="page"]')
        .sort(function(a, b) {
          return parseInt($(a).attr('data-page-number')) - parseInt($(b).attr('data-page-number'));
        })
        .appendTo(wrapper);
    },
    'init': function(id, events) {
      PdfManager.events = events;
      PdfManager.pdfViewer = $(id);
      PdfManager.pdfViewer
        .append('<div id="pdf-viewer"></div>')
        .append('<img id="LoadingLoop" src="../javascripts/pdf.js/build/components/images/loading-icon.gif" />');
      PdfManager.showPdfLoadingLoop();
    },
    // Refresh pdf display
    'refreshPdf': function(buffer, annotations, done) {
      PdfManager.pdfViewer
        .empty()
        .append('<div id="pdf-viewer" class="pdfViewer"></div>')
        .append('<img id="LoadingLoop" src="../javascripts/pdf.js/build/components/images/loading-icon.gif" />');
      PdfManager.showPdfLoadingLoop();

      let viewer = document.getElementById('pdf-viewer');

      // Loading document.
      let loadingTask = pdfjsLib.getDocument({
        'data': buffer,
        'cMapUrl': CMAP_URL,
        'cMapPacked': CMAP_PACKED
      });

      PdfManager.hidePdfLoadingLoop();
      loadingTask.promise
        .then(function(pdfDocument) {
          let pageRendered = 0;
          let pages = new Array(pdfDocument.numPages);
          for (let i = 0; i < pdfDocument.numPages; i++) {
            let numPage = i + 1;
            pdfDocument.getPage(numPage).then(function(pdfPage) {
              pdf_viewer.loadPage(viewer, numPage, pdfPage, function(page, infos) {
                pages[numPage - 1] = { 'page_height': infos.height, 'page_width': infos.width };
                pageRendered++;
                if (pageRendered >= pdfDocument.numPages) {
                  PdfManager.setupAnnotations(annotations, pages, PdfManager.events);
                  PdfManager.sortPages();
                  return done();
                }
              });
            });
          }
        })
        .catch((e) => {
          console.log(e);
          const pdfContainer = PdfManager.pdfViewer.find('#pdf-viewer');
          pdfContainer.empty().append('<div>An error has occurred while PDF processing</div>');
        });
    },
    // Return chunks regrouped by lines
    'getLines': function(chunks) {
      let layeringMargin = { 'x': 5, 'y': 5 }; // A value (px) to handle layering of chunks
      if (Array.isArray(chunks)) {
        let lines = [
          [
            {
              'x': parseInt(chunks[0].x * the_scale),
              'y': parseInt(chunks[0].y * the_scale),
              'w': parseInt(chunks[0].w * the_scale),
              'h': parseInt(chunks[0].h * the_scale),
              'p': parseInt(chunks[0].p)
            }
          ]
        ];
        if (chunks.length > 1)
          for (let i = 0; i < chunks.length - 1; i++) {
            let previous = {
                'x': parseInt(chunks[i].x * the_scale),
                'y': parseInt(chunks[i].y * the_scale),
                'w': parseInt(chunks[i].w * the_scale),
                'h': parseInt(chunks[i].h * the_scale),
                'p': parseInt(chunks[i].p)
              },
              next = {
                'x': parseInt(chunks[i + 1].x * the_scale),
                'y': parseInt(chunks[i + 1].y * the_scale),
                'w': parseInt(chunks[i + 1].w * the_scale),
                'h': parseInt(chunks[i + 1].h * the_scale),
                'p': parseInt(chunks[i + 1].p)
              };
            // case this is a new line
            if (
              previous.p !== next.p ||
              (previous.x + previous.w < next.x && previous.x + previous.w - layeringMargin.x < next.x) ||
              (previous.y > next.y && previous.y - layeringMargin.y > next.y)
            )
              lines.push([next]);
            else lines[lines.length - 1].push(next);
          }
        return lines;
      } else return [];
    },
    // Return lines areas
    'getAreas': function(chunks, sentenceId) {
      let lines = PdfManager.getLines(chunks);
      if (Array.isArray(lines)) {
        let result = [];
        for (let i = 0; i < lines.length; i++) {
          let areas = PdfManager.getArea(lines[i]);
          for (let j = 0; j < areas.length; j++) {
            let area = areas[j];
            if (result.length === 0 || result[result.length - 1].p !== area.p) {
              result.push(new Areas(sentenceId));
            }
            let res = result[result.length - 1];
            res.areas = res.areas.concat(area);
          }
        }
        return result;
      } else return null;
    },
    // Return line area
    'getArea': function(lines) {
      if (Array.isArray(lines)) {
        let result = [new Area(lines[0])];
        if (lines.length === 1) return result;
        // loop lines
        else {
          for (let i = 1; i < lines.length; i++) {
            if (result[result.length - 1].y > lines[i].y) {
              result.push(new Area(lines[i]));
            } else {
              result[result.length - 1].addPoints({
                'x': lines[i].x,
                'y': lines[i].y,
                'w': lines[i].w,
                'h': lines[i].h
              });
            }
            let area = result[result.length - 1];
            if (area.min.x > lines[i].x) area.min.x = lines[i].x;
            if (area.max.x < lines[i].x + lines[i].w) area.max.x = lines[i].x + lines[i].w;
            if (area.min.y > lines[i].y) area.min.y = lines[i].y;
            if (area.max.y < lines[i].y + lines[i].h) area.max.y = lines[i].y + lines[i].h;
            area.w = area.max.x - area.min.x;
            area.h = area.max.y - area.min.y;
          }
          return result;
        }
      } else return null;
    },
    'buildContours': function(mapping, chunks, color) {
      for (let key in mapping) {
        if (mapping[key].length > 0) {
          let subArray = chunks.slice(mapping[key][0], mapping[key][mapping[key].length - 1] + 1),
            areas = PdfManager.getAreas(subArray, key),
            contours = PdfManager.buildContour(areas, { hull: getColor2(), chunks: getColor() });
        }
      }
    },
    // Return contour of lines
    'buildContour': function(parts, color) {
      if (Array.isArray(parts)) {
        for (let i = 0; i < parts.length; i++) {
          if (Array.isArray(parts[i].areas)) {
            for (let j = 0; j < parts[i].areas.length; j++) {
              let area = parts[i].areas[j],
                svgAnnotationsLayer = PdfManager.pdfViewer.find(
                  '.page[data-page-number="' + area.p + '"] .svgAnnotationsLayer'
                ),
                style = {
                  'x': area.min.x,
                  'y': area.min.y,
                  'height': area.h,
                  'width': area.w
                },
                svg = $('<svg>')
                  .attr(
                    'style',
                    'display: block;width: ' +
                      (style.width + 1.5) +
                      'px;height: ' +
                      (style.height + 1.5) +
                      'px;position: absolute;top: ' +
                      (style.y - 1.5) +
                      'px;left: ' +
                      (style.x - 1.5) +
                      'px;'
                  )
                  .attr('sentenceId', parts[i].sentenceId)
                  .attr('width', Math.round(style.width + 3))
                  .attr('height', Math.round(style.height + 3))
                  .attr('xmlns', 'http://www.w3.org/2000/svg')
                  .attr('version', '1.1')
                  .attr('viewBox', '0 0 ' + (style.width + 3) + ' ' + (style.height + 3)),
                points = area.points.map(function(item) {
                  return [item[0] - area.min.x, item[1] - area.min.y];
                }),
                pts = d3.polygonHull(points),
                contour = PdfManager.buildPolygon(
                  pts
                    .map(function(item) {
                      return item[0] + ',' + item[1];
                    })
                    .join(' '),
                  color.hull
                );
              console.log(area, pts);
              for (let i = 0; i < area.points.length; i += 4) {
                svg.append(
                  PdfManager.buildPolygon(
                    [
                      [area.points[i][0] - area.min.x, ',', area.points[i][1] - area.min.y].join(''),
                      [area.points[i + 1][0] - area.min.x, ',', area.points[i + 1][1] - area.min.y].join(''),
                      [area.points[i + 2][0] - area.min.x, ',', area.points[i + 2][1] - area.min.y].join(''),
                      [area.points[i + 3][0] - area.min.x, ',', area.points[i + 3][1] - area.min.y].join('')
                    ].join(' '),
                    color.chunks
                  )
                );
              }
              svg.append(contour);
              svgAnnotationsLayer.append(svg);
            }
          }
        }
        return true;
      } else return null;
    },
    'buildPolygon': function(points, color) {
      let polygon = $('<polygon>')
        .attr('points', points)
        .attr('fill', 'transparent')
        .attr('stroke', color);
      return polygon;
    },
    'setupAnnotations': function(sentences, pages, events) {
      // we must check/wait that the corresponding PDF page is rendered at this point
      let page_height = 0.0,
        page_width = 0.0;

      // Add annotationsLayer for each page
      PdfManager.pdfViewer.find('.page[data-page-number]').each(function(index) {
        let pageDiv = $(this),
          container = $('<div>'),
          svg = $('<div>'),
          style = pageDiv.find('.canvasWrapper').attr('style');
        container.addClass('annotationsLayer');
        container.attr('style', style);
        svg.addClass('svgAnnotationsLayer');
        svg.attr('style', style);
        pageDiv.prepend(container);
        pageDiv.prepend(svg);
      });

      if (sentences.chunks) {
        sentences.chunks.forEach(function(chunk, n) {
          let numPage = chunk.p;
          if (pages[numPage - 1]) {
            page_height = pages[numPage - 1].page_height;
            page_width = pages[numPage - 1].page_width;
          }
          PdfManager.annotate(chunk, page_height, page_width, events);
        });
        if (sentences.mapping) {
          PdfManager.buildContours(sentences.mapping, sentences.chunks, 'black');
        }
      }
    },
    'annotate': function(chunk, page_height, page_width, events) {
      let page = chunk.p,
        annotationsContainer = PdfManager.pdfViewer.find('.page[data-page-number="' + page + '"] .annotationsLayer'),
        scale_x = the_scale,
        scale_y = the_scale,
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
          'background-color: rgba(211,211,211,0.5);display:block; width:' +
          width +
          'px; height:' +
          height +
          'px; position:absolute; top:' +
          y +
          'px; left:' +
          x +
          'px;';

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
    }
  };
