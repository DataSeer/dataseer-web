/*
 * @prettier
 */

'use strict';

const DocumentView = function (id, events = {}) {
  let self = this;
  this.id = id;
  this.selectedSentence = {};
  this.currentDatasetId;
  this.viewersEvents = {
    onClick: function (sentence) {
      let result = self.xmlViewer.getInfosOfSentence(sentence.sentenceId),
        isDataset = !!result.datasetId;
      if (isDataset) {
        if (typeof self.events.onDatasetClick === 'function') self.events.onDatasetClick(result);
      } else {
        if (self.selectedSentence.sentenceId === result.sentenceId) {
          self.unselectSentence(result);
        } else {
          // unselect previous selected sentence
          if (self.selectedSentence.sentenceId) {
            self.unselectSentence(self.selectedSentence);
          }
          self.selectSentence(result);
        }
        if (typeof self.events.onSentenceClick === 'function') self.events.onSentenceClick(result);
      }
    },
    onHover: function (sentence) {
      let result = self.xmlViewer.getInfosOfSentence(sentence.sentenceId),
        isDataset = !!result.datasetId;
      // console.log(result);
      if (isDataset) {
        if (typeof self.events.onDatasetHover === 'function') self.events.onDatasetHover(result);
      } else {
        if (typeof self.events.onSentenceHover === 'function') self.events.onSentenceHover(result);
      }
      self.hoverSentence({
        sentenceId: result.sentenceId,
        isDataset: isDataset,
        isSelected: self.selectedSentence && result.sentenceId === self.selectedSentence.sentenceId
      });
    },
    onEndHover: function (sentence) {
      let result = self.xmlViewer.getInfosOfSentence(sentence.sentenceId),
        isDataset = !!result.datasetId;
      // console.log(result);
      if (isDataset) {
        if (typeof self.events.onDatasetHover === 'function') self.events.onDatasetHover(result);
      } else {
        if (typeof self.events.onSentenceHover === 'function') self.events.onSentenceHover(result);
      }
      self.endHoverSentence({
        sentenceId: result.sentenceId,
        isDataset: isDataset,
        isSelected: self.selectedSentence && result.sentenceId === self.selectedSentence.sentenceId
      });
    }
  };
  // documentView elements
  this.screen = $('#documentView\\.screen');
  this.pdf = $('#pdf');
  this.xml = $('#xml');
  // Listen scroll
  this.currentScroll = 0;
  this.screen.scroll(
    _.throttle(function () {
      if (self.pdfVisible) {
        let scrollTop = self.screen.scrollTop(),
          direction = scrollTop > self.currentScroll ? +1 : -1;
        self.currentScroll = scrollTop;
        self.pdfViewer.onScroll({ position: scrollTop, height: self.screen.prop('scrollHeight') }, direction);
      }
    }, 333)
  );
  // Element initialization
  this.xml.hide();
  this.pdfVisible = true;
  // On button click
  $('#documentView\\.viewSelection\\.tei\\.all')
    .parent()
    .click(function () {
      console.log('TEI all');
      self.pdfVisible = false;
      self.pdf.hide();
      self.xml.show();
      self.xml.find('*.hidden').removeClass('hidden');
      self.selectDataset(self.currentDatasetId);
      return typeof self.events.onFulltextView === 'function' ? self.events.onFulltextView() : undefined;
    });
  $('#documentView\\.viewSelection\\.tei\\.dataseer')
    .parent()
    .click(function () {
      console.log('TEI dataseer');
      self.pdfVisible = false;
      self.pdf.hide();
      self.xml.show();
      self.xml.find('*.hidden').removeClass('hidden');
      self.xml.find('text > div > div, text > div > *:not(div)').map(function (i, el) {
        let element = $(el);
        if (element.find('s[id], s[corresp]').length === 0) return element.addClass('hidden');
      });
      self.selectDataset(self.currentDatasetId);
      return typeof self.events.onSectionView === 'function' ? self.events.onSectionView() : undefined;
    });
  $('#documentView\\.viewSelection\\.tei\\.dataset')
    .parent()
    .click(function () {
      console.log('TEI dataset');
      self.pdfVisible = false;
      self.pdf.hide();
      self.xml.show();
      self.xml.find('*.hidden').removeClass('hidden');
      self.xml.find('text > div, text > *:not(div)').map(function (i, el) {
        let element = $(el);
        if (element.find('s[id], s[corresp]').length === 0) return element.addClass('hidden');
      });
      self.selectDataset(self.currentDatasetId);
      return typeof self.events.onParagraphView === 'function' ? self.events.onParagraphView() : undefined;
    });
  $('#documentView\\.viewSelection\\.pdf')
    .parent()
    .click(function () {
      console.log('PDF');
      self.pdfVisible = true;
      self.pdf.show();
      self.xml.hide();
      self.selectDataset(self.currentDatasetId);
      return typeof self.events.onPdfView === 'function' ? self.events.onPdfView() : undefined;
    });
  // Events
  this.events = events;
  return this;
};

// Attach event
DocumentView.prototype.attach = function (event, fn) {
  this.events[event] = fn;
};

// Get selected sentence or undefined
DocumentView.prototype.getSentencesMapping = function () {
  return {
    pdf: this.pdfViewer ? this.pdfViewer.getSentencesMapping() : undefined,
    xml: this.xmlViewer ? this.xmlViewer.getSentencesMapping() : undefined
  };
};

// Get selected sentence or undefined
DocumentView.prototype.getSelectedSentence = function () {
  if (this.selectedSentence.sentenceId) return this.selectedSentence;
};

// Get sentence
DocumentView.prototype.getSentence = function (sentenceId) {
  return this.xmlViewer.getInfosOfSentence(sentenceId);
};

// Init documentView
DocumentView.prototype.init = function (opts, cb) {
  let self = this,
    xml = opts.xml.toString('utf8').replace(/\s/gm, ' ');
  this.xmlViewer = new XmlViewer('xml', 'documentView\\.screen', this.viewersEvents);
  if (opts.pdf) {
    this.pdfVisible = true;
    this.pdfViewer = new PdfViewer('pdf', 'documentView\\.screen', this.viewersEvents);
  }
  return this.xmlViewer.load({ xmlString: xml, colors: opts.colors }, function (datasetsInfos) {
    if (opts.pdf)
      return self.pdfViewer.load(opts.pdf, datasetsInfos, function () {
        self.pdfViewer.setPage(0);
        return cb();
      });
    else {
      $('#documentView\\.viewSelection\\.tei\\.all').click();
      $('#documentView\\.viewSelection\\.pdf').parent().remove();
      return cb();
    }
  });
};

// Hover a sentence
DocumentView.prototype.hoverSentence = function (sentence) {
  if (this.pdfViewer) this.pdfViewer.hoverSentence(sentence);
  this.xmlViewer.hoverSentence(sentence);
};

// Unhover a sentence
DocumentView.prototype.endHoverSentence = function (sentence) {
  if (this.pdfViewer) this.pdfViewer.endHoverSentence(sentence);
  this.xmlViewer.endHoverSentence(sentence);
};

// Select a sentence
DocumentView.prototype.selectSentence = function (sentence) {
  this.selectedSentence = sentence;
  if (this.pdfViewer) this.pdfViewer.selectSentence(sentence);
  this.xmlViewer.selectSentence(sentence);
};

// Unselect a sentence
DocumentView.prototype.unselectSentence = function (sentence) {
  this.selectedSentence = {};
  if (this.pdfViewer) this.pdfViewer.unselectSentence(sentence);
  this.xmlViewer.unselectSentence(sentence);
};

// Select a dataset
DocumentView.prototype.selectDataset = function (opts, cb) {
  let self = this;
  this.currentDatasetId = opts.id;
  if (this.pdfVisible)
    return this.pdfViewer.selectDataset(opts.id, function (position) {
      if (position) {
        if (opts.noAnim) self.screen.scrollTop(position);
        else self.screen.animate({ scrollTop: position });
      } else console.log('dataset not selected');
      return typeof cb === 'function' ? cb() : undefined;
    });
  else
    return this.xmlViewer.selectDataset(opts.id, function (position) {
      if (position) {
        self.screen.animate({ scrollTop: position + self.screen.scrollTop() - self.screen.height() / 1.8 });
      } else console.log('dataset not selected');
      return typeof cb === 'function' ? cb() : undefined;
    });
};

// Get all corresps
DocumentView.prototype.getCorresps = function (dataset) {
  return this.xmlViewer.getCorresps(dataset);
};

// Select a Corresp
DocumentView.prototype.selectCorresp = function (dataset, cb) {
  let self = this;
  this.currentDatasetId = dataset.id;
  if (this.pdfVisible)
    return this.pdfViewer.selectCorresp(dataset.sentenceId, function (position) {
      if (position) self.screen.animate({ scrollTop: position });
      else console.log('dataset not selected');
      return typeof cb === 'function' ? cb() : undefined;
    });
  else
    return this.xmlViewer.selectCorresp(dataset.id, function (position) {
      if (position) self.screen.animate({ scrollTop: position + self.screen.scrollTop() - self.screen.height() / 1.8 });
      else console.log('dataset not selected');
      return typeof cb === 'function' ? cb() : undefined;
    });
};

// Add a dataset
DocumentView.prototype.addDataset = function (dataset) {
  if (this.pdfViewer) this.pdfViewer.addDataset(dataset);
  this.xmlViewer.addDataset(dataset);
};

// Remove a dataset
DocumentView.prototype.removeDataset = function (dataset) {
  if (this.pdfViewer) this.pdfViewer.removeDataset(dataset);
  this.xmlViewer.removeDataset(dataset);
};

// Add a corresp
DocumentView.prototype.addCorresp = function (dataset, sentenceId) {
  if (this.pdfViewer) this.pdfViewer.addCorresp(dataset, sentenceId);
  this.xmlViewer.addCorresp(dataset, sentenceId);
};

// Remove a corresp
DocumentView.prototype.removeCorresp = function (dataset, sentenceId) {
  if (this.pdfViewer) this.pdfViewer.removeCorresp(dataset, sentenceId);
  this.xmlViewer.removeCorresp(dataset, sentenceId);
};
