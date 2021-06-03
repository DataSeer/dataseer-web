/*
 * @prettier
 */

'use strict';

const DocumentView = function (id, events = {}) {
  let self = this;
  this.id = id;
  this.selectedSentences = {};
  this.currentScrolledSentence;
  this.shiftPressed = false;
  this.ctrlPressed = false;
  this.viewersEvents = {
    onClick: function (id) {
      let sentence = self.xmlViewer.getInfosOfSentence(id),
        result = self.xmlViewer.getInfosOfSentence(sentence.sentenceId);
      if (self.ctrlPressed) {
        if (self.isSelected(result)) {
          self.unselectSentence(result);
          self.hoverSentence({
            sentenceId: result.sentenceId,
            hasDatasets: result.hasDatasets,
            isSelected: false
          });
        } else self.selectSentence(result);
      } else if (self.shiftPressed) {
        let selectedSentences = self.getSelectedSentences();
        if (selectedSentences.length) {
          let sentences = self.getSentences(selectedSentences, result);
          for (let i = 0; i < sentences.length; i++) {
            if (typeof sentences[i] === 'string') {
              let sentence = self.getSentence(sentences[i]);
              self.selectSentence(sentence);
            }
          }
        } else console.log('At least one sentence must be selected');
      } else {
        if (self.isSelected(result)) {
          self.unselectSentences(self.getSelectedSentences());
          self.hoverSentence({
            sentenceId: result.sentenceId,
            hasDatasets: result.hasDatasets,
            isSelected: false
          });
        } else {
          self.unselectSentences(self.getSelectedSentences());
          self.selectSentence(result);
        }
      }
      if (typeof self.events.onSentenceClick === 'function') self.events.onSentenceClick(result);
    },
    onHover: function (id) {
      let sentence = self.xmlViewer.getInfosOfSentence(id),
        result = self.xmlViewer.getInfosOfSentence(sentence.sentenceId);
      if (typeof self.events.onSentenceHover === 'function') self.events.onSentenceHover(result);
      self.hoverSentence({
        sentenceId: result.sentenceId,
        hasDatasets: result.hasDatasets,
        isSelected: self.isSelected(result)
      });
    },
    onEndHover: function (id) {
      let sentence = self.xmlViewer.getInfosOfSentence(id),
        result = self.xmlViewer.getInfosOfSentence(sentence.sentenceId);
      if (typeof self.events.onSentenceHover === 'function') self.events.onSentenceHover(result);
      self.endHoverSentence({
        sentenceId: result.sentenceId,
        hasDatasets: result.hasDatasets,
        isSelected: self.isSelected(result)
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
      let scrollTop = self.screen.scrollTop(),
        direction = scrollTop > self.currentScroll ? +1 : -1;
      self.currentScroll = scrollTop;
      if (self.pdfVisible)
        self.pdfViewer.onScroll({ position: scrollTop, height: self.screen.prop('scrollHeight') }, direction);
    }, 200)
  );
  // Element initialization
  this.xml.hide();
  this.pdfVisible = true;
  // Key events listeners
  $(document).keydown(function (event) {
    if (event.key === 'Control') self.ctrlPressed = true;
    else if (event.key === 'Shift') self.shiftPressed = true;
  });
  $(document).keyup(function (event) {
    if (event.key === 'Control') self.ctrlPressed = false;
    else if (event.key === 'Shift') self.shiftPressed = false;
  });
  // On button click
  $('#documentView\\.viewSelection\\.tei\\.all')
    .parent()
    .click(function () {
      console.log('TEI all');
      self.pdfVisible = false;
      self.pdf.hide();
      if (self.pdfViewer) self.pdfViewer.hideMarkers();
      self.xml.show();
      self.xml.find('*.hidden').removeClass('hidden');
      self.scrollToSentence({ id: self.lastSelectedSentence.sentenceId, noAnim: true });
      return typeof self.events.onFulltextView === 'function' ? self.events.onFulltextView() : undefined;
    });
  $('#documentView\\.viewSelection\\.tei\\.dataseer')
    .parent()
    .click(function () {
      console.log('TEI dataseer');
      self.pdfVisible = false;
      self.pdf.hide();
      if (self.pdfViewer) self.pdfViewer.hideMarkers();
      self.xml.show();
      self.xml.find('*.hidden').removeClass('hidden');
      self.xml.find('text > div > div, text > div > *:not(div)').map(function (i, el) {
        let element = $(el);
        if (element.find('s[id], s[corresp]').length === 0) return element.addClass('hidden');
      });
      self.scrollToSentence({ id: self.lastSelectedSentence.sentenceId, noAnim: true });
      return typeof self.events.onSectionView === 'function' ? self.events.onSectionView() : undefined;
    });
  $('#documentView\\.viewSelection\\.tei\\.dataset')
    .parent()
    .click(function () {
      console.log('TEI dataset');
      self.pdfVisible = false;
      self.pdf.hide();
      if (self.pdfViewer) self.pdfViewer.hideMarkers();
      self.xml.show();
      self.xml.find('*.hidden').removeClass('hidden');
      self.xml.find('text > div, text > *:not(div)').map(function (i, el) {
        let element = $(el);
        if (element.find('s[id], s[corresp]').length === 0) return element.addClass('hidden');
      });
      self.scrollToSentence({ id: self.lastSelectedSentence.sentenceId, noAnim: true });
      return typeof self.events.onParagraphView === 'function' ? self.events.onParagraphView() : undefined;
    });
  $('#documentView\\.viewSelection\\.pdf')
    .parent()
    .click(function () {
      console.log('PDF');
      self.pdfVisible = true;
      self.pdf.show();
      if (self.pdfViewer) self.pdfViewer.showMarkers();
      self.xml.hide();
      console.log(self.lastSelectedSentence);
      self.scrollToSentence({ id: self.lastSelectedSentence.sentenceId, noAnim: true });
      return typeof self.events.onPdfView === 'function' ? self.events.onPdfView() : undefined;
    });
  // Events
  this.events = events;
  return this;
};

// Check if the given sentence is selected
DocumentView.prototype.isSelected = function (sentence) {
  return (
    typeof this.selectedSentences[sentence.sentenceId] === 'object' &&
    typeof this.selectedSentences[sentence.sentenceId].sentenceId !== 'undefined'
  );
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

// Get part of sentences
DocumentView.prototype.getSentences = function (selectedSentences, lastSentence) {
  return this.pdfVisible
    ? this.pdfViewer.getSentences(selectedSentences, lastSentence)
    : this.xmlViewer.getSentences(selectedSentences, lastSentence);
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
  this.lastSelectedSentence = sentence;
  this.selectedSentences[sentence.sentenceId] = sentence;
  if (this.pdfViewer) this.pdfViewer.selectSentence(sentence);
  this.xmlViewer.selectSentence(sentence);
};

// Unselect a sentence
DocumentView.prototype.unselectSentence = function (sentence) {
  delete this.selectedSentences[sentence.sentenceId];
  if (this.pdfViewer) this.pdfViewer.unselectSentence(sentence);
  this.xmlViewer.unselectSentence(sentence);
};

// Unselect all selected sentences
DocumentView.prototype.unselectSentences = function (sentences) {
  for (let i = 0; i < sentences.length; i++) {
    this.unselectSentence(sentences[i]);
  }
};

// Get selected sentence or undefined
DocumentView.prototype.getSelectedSentences = function () {
  if (this.selectedSentences) return Object.values(this.selectedSentences);
};

// Scroll to a sentence
DocumentView.prototype.scrollToSentence = function (opts, cb) {
  let self = this;
  this.currentScrolledSentence = opts.id;
  if (this.pdfVisible)
    return this.pdfViewer.scrollToSentence(opts.id, function (position) {
      if (position) {
        if (opts.noAnim) self.screen.scrollTop(position);
        else self.screen.animate({ scrollTop: position });
      } else console.log('dataset not selected');
      return typeof cb === 'function' ? cb() : undefined;
    });
  else
    return this.xmlViewer.scrollToSentence(opts.id, function (position) {
      if (position) {
        if (opts.noAnim) self.screen.scrollTop(position + self.screen.scrollTop() - self.screen.height() / 1.8);
        else self.screen.animate({ scrollTop: position + self.screen.scrollTop() - self.screen.height() / 1.8 });
      } else console.log('dataset not selected');
      return typeof cb === 'function' ? cb() : undefined;
    });
};

// Get all Links
DocumentView.prototype.getLinks = function (dataset) {
  return this.xmlViewer.getLinks(dataset);
};

// Add a dataset
DocumentView.prototype.addDataset = function (dataset, sentenceId) {
  if (this.pdfViewer) this.pdfViewer.addDataset(dataset, sentenceId);
  this.xmlViewer.addDataset(dataset, sentenceId);
};

// Remove a dataset
DocumentView.prototype.removeDataset = function (dataset) {
  if (this.pdfViewer) this.pdfViewer.removeDataset(dataset);
  this.xmlViewer.removeDataset(dataset);
};

// Add a corresp
DocumentView.prototype.addLink = function (dataset, sentenceId) {
  if (this.pdfViewer) this.pdfViewer.addLink(dataset, sentenceId);
  this.xmlViewer.addLink(dataset, sentenceId);
};

// Remove a corresp
DocumentView.prototype.removeLink = function (dataset, sentenceId) {
  if (this.pdfViewer) this.pdfViewer.removeLink(dataset, sentenceId);
  this.xmlViewer.removeLink(dataset, sentenceId);
};

// display left
DocumentView.prototype.displayLeft = function () {
  if (this.pdfViewer) this.pdfViewer.displayLeft();
};

// display right
DocumentView.prototype.displayRight = function () {
  if (this.pdfViewer) this.pdfViewer.displayRight();
};
