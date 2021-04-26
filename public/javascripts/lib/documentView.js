/*
 * @prettier
 */

'use strict';

const DocumentView = function (id, events) {
  let self = this;
  this.id = id;
  this.pdfViewer = new PdfViewer('pdf', {
    click: function (sentence) {
      console.log();
    },
    hover: function (sentence) {
      console.log();
    },
    endHover: function (sentence) {
      console.log();
    }
  });
  return self;
};

DocumentView.prototype.renderPDF = function (pdf, cb) {
  let self = this;
  return this.pdfViewer.render(pdf.buffer, pdf.sentences, function () {
    return cb();
  });
};
