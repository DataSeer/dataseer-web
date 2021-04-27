/*
 * @prettier
 */

'use strict';

const DocumentView = function (id, events) {
  let self = this;
  this.id = id;
  this.events = {};
  this.selectedSentence = {};
  this.pdfViewer = new PdfViewer('pdf', {
    onClick: function (sentence) {
      let isDataset = !!sentence.datasetId;
      console.log(isDataset, sentence);
      if (isDataset) {
        if (typeof self.events.onDatasetClick === 'function') self.events.onDatasetClick(sentence);
      } else {
        if (typeof self.events.onSentenceClick === 'function') self.events.onSentenceClick(sentence);
        if (self.selectedSentence.sentenceId === sentence.sentenceId) {
          self.pdfViewer.unselectSentence(sentence);
          self.selectedSentence = {};
        } else {
          if (self.selectedSentence.sentenceId) self.pdfViewer.unselectSentence(self.selectedSentence);
          self.pdfViewer.selectSentence(sentence);
          self.selectedSentence = sentence;
        }
      }
    },
    onHover: function (sentence) {
      let isDataset = !!sentence.datasetId;
      if (isDataset) {
        if (typeof self.events.onDatasetHover === 'function') self.events.onDatasetHover(sentence);
      } else {
        if (typeof self.events.onSentenceHover === 'function') self.events.onSentenceHover(sentence);
      }
      self.pdfViewer.hoverSentence({
        sentenceId: sentence.sentenceId,
        isDataset: !!sentence.datasetId,
        isSelected: self.selectedSentence && sentence.sentenceId === self.selectedSentence.sentenceId
      });
    },
    onEndHover: function (sentence) {
      let isDataset = !!sentence.datasetId;
      if (isDataset) {
        if (typeof self.events.onDatasetHover === 'function') self.events.onDatasetHover(sentence);
      } else {
        if (typeof self.events.onSentenceHover === 'function') self.events.onSentenceHover(sentence);
      }
      self.pdfViewer.endHoverSentence({
        sentenceId: sentence.sentenceId,
        isDataset: !!sentence.datasetId,
        isSelected: self.selectedSentence && sentence.sentenceId === self.selectedSentence.sentenceId
      });
    }
  });
  this.screen = $('#documentView\\.screen');
  this.pdf = $('#pdf');

  // Listen scroll
  this.screen.scroll(
    _.throttle(function () {
      if (self.screen.scrollTop() + self.screen.height() > self.pdf.height() - 0.25 * self.screen.height()) {
        console.log('bottom!');
        if (self.pdfViewer.pdfLoaded) {
          self.pdfViewer.renderNextPage(function (err, res) {
            console.log('nextPageLoaded');
          });
        }
      }
    }, 333)
  );
  return self;
};

DocumentView.prototype.init = function (pdf, cb) {
  let self = this;
  return this.pdfViewer.load(pdf.buffer, pdf.metadata, function () {
    return cb();
  });
};

// Select a dataset
DocumentView.prototype.select = function (id, cb) {
  let self = this;
  return this.pdfViewer.selectDataset(id, function (position) {
    if (position) self.screen.animate({ scrollTop: position });
    else console.log('dataset not selected');
    return cb();
  });
};

// Select a dataset
DocumentView.prototype.addDataset = function (opts, cb) {
  let self = this;
  return this.pdfViewer.selectDataset(id, function (position) {
    console.log(position);
    if (position) self.screen.animate({ scrollTop: position });
    else console.log('dataset not selected');
    return cb();
  });
};

// Select a dataset
DocumentView.prototype.removeDataset = function (opts, cb) {
  let self = this;
  return this.pdfViewer.selectDataset(id, function (position) {
    console.log(position);
    if (position) self.screen.animate({ scrollTop: position });
    else console.log('dataset not selected');
    return cb();
  });
};
