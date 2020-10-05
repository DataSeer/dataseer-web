/*
 * @prettier
 */
'use strict';

let workerSrcPath = '../javascripts/pdf.js/build/pdf.worker.js';

if (typeof pdfjsLib === 'undefined' || (!pdfjsLib && !pdfjsLib.getDocument)) {
  console.error('Please build the pdfjs-dist library using\n' + '  `gulp dist-install`');
}
// The workerSrc property shall be specified.
//
else pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrcPath;

function isIn(container, element) {
  var l = offset.left;
  var t = offset.top;
  var h = $this.height();
  var w = $this.width();

  var maxx = l + w;
  var maxy = t + h;

  return y <= maxy && y >= t && (x <= maxx && x >= l) ? $this : null;
}

var the_scale = 1.5;
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
      var desiredWidth = viewer.offsetWidth;
      var viewport_tmp = pdfPage.getViewport({ scale: 1 });
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
      if (Array.isArray(chunks)) {
        let lines = [
          [
            {
              'x': parseInt(chunks[0].x) * the_scale,
              'y': parseInt(chunks[0].y) * the_scale,
              'w': parseInt(chunks[0].w) * the_scale,
              'h': parseInt(chunks[0].h) * the_scale,
              'p': parseInt(chunks[0].p)
            }
          ]
        ];
        if (chunks.length > 1)
          for (let i = 0; i < chunks.length - 1; i++) {
            let previous = {
                'x': parseInt(chunks[i].x) * the_scale,
                'y': parseInt(chunks[i].y) * the_scale,
                'w': parseInt(chunks[i].w) * the_scale,
                'h': parseInt(chunks[i].h) * the_scale,
                'p': parseInt(chunks[i].p)
              },
              next = {
                'x': parseInt(chunks[i + 1].x) * the_scale,
                'y': parseInt(chunks[i + 1].y) * the_scale,
                'w': parseInt(chunks[i + 1].w) * the_scale,
                'h': parseInt(chunks[i + 1].h) * the_scale,
                'p': parseInt(chunks[i].p)
              };
            // case this is a new line
            if (next.x <= previous.x) {
              lines.push([next]);
            } else {
              lines[lines.length - 1].push(next);
            }
          }
        return lines;
      } else return [];
    },
    // Return lines areas
    'getAreas': function(lines) {
      if (Array.isArray(lines)) {
        let result = { 'p': false, 'x': { 'min': null, 'max': null }, 'y': { 'min': null, 'max': null }, 'areas': [] };
        for (let i = 0; i < lines.length; i++) {
          let area = PdfManager.getArea(lines[i]);
          result.p = area.p;
          if (result.x.min === null || result.x.min > area.x) result.x.min = area.x;
          if (result.x.max === null || result.x.max < area.x + area.w) result.x.max = area.x + area.w;
          if (result.y.min === null || result.y.min > area.y) result.y.min = area.y;
          if (result.y.max === null || result.y.max < area.y + area.h) result.y.max = area.y + area.h;
          result.areas.push(area);
        }
        return result;
      } else return null;
    },
    // Return line area
    'getArea': function(chunks) {
      if (Array.isArray(chunks)) {
        let area = { 'p': chunks[0].p, 'x': chunks[0].x, 'y': chunks[0].y, 'h': chunks[0].h, 'w': chunks[0].w };
        if (chunks.length === 1) return area;
        // look chunks
        else
          for (let i = 1; i < chunks.length; i++) {
            // if new line detected, chunk will be ignored
            if (area.x < chunks[i].x) area.w = chunks[i].x - area.x + chunks[i].w;
            if (area.y < chunks[i].y) area.y = chunks[i].y;
          }
        return area;
      } else return null;
    },
    'buildContour': function(mapping, chunks, color) {
      for (let key in mapping) {
        if (mapping[key].length > 0) {
          let subArray = chunks.slice(mapping[key][0], mapping[key][mapping[key].length - 1] + 1),
            areas = PdfManager.getAreas(PdfManager.getLines(subArray)),
            contour = PdfManager.getContour(areas, color),
            annotationsContainer = PdfManager.pdfViewer.find(
              '.page[data-page-number="' + areas.p + '"] .svgAnnotationsLayer'
            );
          annotationsContainer.append(contour);
          console.log(areas);
        }
      }
    },
    // Return contour of lines
    'getContour': function(data, color) {
      if (Array.isArray(data.areas)) {
        // case coutour is rectangle
        if (data.areas.length === 1)
          return PdfManager.buildPath(['H ', data.areas[0].w, 'V', data.areas[0].h, 'H 0 V 0'].join(''), color, {
            'x': data.areas[0].x,
            'y': data.areas[0].y,
            'height': data.areas[0].h,
            'width': data.areas[0].w
          });
        else {
          let d = '';
          for (let i = 0; i < data.areas.length; i++) {
            d +=
              [
                'M' + (data.areas[i].x - data.x.min).toString(),
                data.areas[i].y - data.y.min,
                'H',
                data.areas[i].w,
                'V',
                data.areas[i].h,
                'H',
                data.areas[i].x - data.x.min,
                'V',
                data.areas[i].y - data.y.min
              ].join(' ') + ' ';
          }
          return PdfManager.buildPath(d.substring(0, d.length - 1), color, {
            'x': data.x.min,
            'y': data.y.min,
            'height': data.y.max - data.y.min,
            'width': data.x.max - data.x.min
          });
        }
      } else return null;
    },
    'buildPath': function(d, color, style) {
      return $('<path/>')
        .attr(
          'style',
          'z-index: 100000;display: block;width: ' +
            style.width +
            'px;height: ' +
            style.height +
            'px;position: absolute;top: ' +
            style.y +
            'px;left: ' +
            style.x +
            'px;'
        )
        .attr('d', d)
        .attr('fill', 'black')
        .attr('stroke', color);
    },
    'setupAnnotations': function(sentences, pages, events) {
      // we must check/wait that the corresponding PDF page is rendered at this point
      let page_height = 0.0,
        page_width = 0.0;

      // Add annotationsLayer for each page
      PdfManager.pdfViewer.find('.page[data-page-number]').each(function(index) {
        let pageDiv = $(this),
          container = $('<div>'),
          // svg = $('<svg>'),
          style = pageDiv.find('.canvasWrapper').attr('style');
        container.addClass('annotationsLayer');
        container.attr('style', style);
        // svg.addClass('svgAnnotationsLayer');
        // svg
        //   .attr('width', Math.round(pages[pageDiv.attr('data-page-number') - 1].page_width))
        //   .attr('height', Math.round(pages[pageDiv.attr('data-page-number') - 1].page_height))
        //   .attr('xmlns', 'http://www.w3.org/2000/svg')
        //   .attr('version', '1.1')
        //   .attr(
        //     'viewBox',
        //     '0 0 ' +
        //       Math.round(pages[pageDiv.attr('data-page-number') - 1].page_width) +
        //       ' ' +
        //       Math.round(pages[pageDiv.attr('data-page-number') - 1].page_height)
        //   );
        pageDiv.prepend(container);
        // pageDiv.prepend(svg);
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
        // if (sentences.mapping) {
        //   PdfManager.buildContour(sentences.mapping, sentences.chunks, 'black');
        // }
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
          'display:block; width:' +
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
