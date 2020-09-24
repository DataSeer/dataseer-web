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

// Some PDFs need external cmaps.
//
const CMAP_URL = '../javascripts/pdf.js/build/generic/web/cmaps/',
  CMAP_PACKED = true,
  VIEWPORT_SCALE = 1.33,
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
      let viewport = pdfPage.getViewport({ 'scale': VIEWPORT_SCALE }),
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
    'setColor': function(sentenceid, color) {
      $('#pdf s[sentenceid="' + sentenceid + '"]').css('background-color', color);
    },
    'removeColor': function(sentenceid) {
      $('#pdf s[sentenceid="' + sentenceid + '"]').css('background-color', '');
    },
    'scrollToSentence': function(sentenceid) {
      let element = $('#pdf s[sentenceid="' + sentenceid + '"]').first(),
        page = element.parent().parent();
      return parseInt(page.attr('data-page-number')) * page.height() + element.position().top;
    },
    'showPdfLoadingLoop': function() {
      $('body').css('cursor', 'progress');
      return PdfManager.pdfViewer.find('LoadingLoop').show();
    },
    'hidePdfLoadingLoop': function() {
      $('body').css('cursor', 'default');
      return PdfManager.pdfViewer.find('LoadingLoop').hide();
    },
    'init': function(id, events) {
      PdfManager.events = events;
      PdfManager.pdfViewer = $(id);
      PdfManager.pdfViewer
        .append('<div id="pdf-viewer"></div>')
        .append(
          '<img id="gluttonPdfLoadingLoop" src="../javascripts/pdf.js/build/components/images/loading-icon.gif" />'
        );
      PdfManager.showPdfLoadingLoop();
    },
    // Refresh pdf display
    'refreshPdf': function(buffer, annotations, done) {
      PdfManager.pdfViewer
        .empty()
        .append('<div id="pdf-viewer" class="pdfViewer"></div>')
        .append(
          '<img id="gluttonPdfLoadingLoop" src="../javascripts/pdf.js/build/components/images/loading-icon.gif" />'
        );
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
                pages[numPage - 1] = { 'page_height': infos.width, 'page_width': infos.height };
                pageRendered++;
                if (pageRendered >= pdfDocument.numPages) {
                  PdfManager.setupAnnotations(annotations, pages, PdfManager.events);
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
    'setupAnnotations': function(sentences, pages, events) {
      // we must check/wait that the corresponding PDF page is rendered at this point
      let page_height = 0.0,
        page_width = 0.0;

      // Add annotationsLayer fir each page
      PdfManager.pdfViewer.find('.page[data-page-number]').each(function(index) {
        let pageDiv = $(this),
          container = $('<div>'),
          style = pageDiv.find('.canvasWrapper').attr('style');
        container.addClass('annotationsLayer');
        container.attr('style', style);
        pageDiv.prepend(container);
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
      }
    },
    'annotate': function(chunk, page_height, page_width, events) {
      let page = chunk.p,
        annotationsContainer = PdfManager.pdfViewer.find('.page[data-page-number="' + page + '"] .annotationsLayer'),
        scale_x = 1.33,
        scale_y = 1.33,
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
        element.setAttribute('datasetid', chunk.datasetId);
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
