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
    onClick: function (element) {
      let sentence = self.xmlViewer.getInfosOfSentence({ id: element.id });
      if (self.ctrlPressed) {
        if (self.isSelected(sentence)) {
          self.unselectSentence(sentence);
          self.hoverSentence({
            id: sentence.id,
            hasDatasets: sentence.hasDatasets,
            isSelected: false
          });
        } else self.selectSentence(sentence);
      } else if (self.shiftPressed) {
        let selectedSentences = self.getSelectedSentences();
        if (selectedSentences.length) {
          let sentences = self.getSentences(selectedSentences, sentence);
          for (let i = 0; i < sentences.length; i++) {
            if (typeof sentences[i] === 'string') {
              self.selectSentence(self.getSentence(sentences[i]));
            }
          }
        } else console.log('At least one sentence must be selected');
      } else {
        if (self.isSelected(sentence)) {
          self.unselectSentences(self.getSelectedSentences());
          self.hoverSentence({
            id: sentence.id,
            hasDatasets: sentence.hasDatasets,
            isSelected: false
          });
        } else {
          self.unselectSentences(self.getSelectedSentences());
          self.selectSentence(sentence);
        }
      }
      if (typeof self.events.onSentenceClick === 'function') self.events.onSentenceClick(sentence);
    },
    onHover: function (element) {
      let sentence = self.xmlViewer.getInfosOfSentence({ id: element.id });
      if (typeof self.events.onSentenceHover === 'function') self.events.onSentenceHover(sentence);
      self.hoverSentence({
        id: sentence.id,
        hasDatasets: sentence.hasDatasets,
        isSelected: self.isSelected(sentence)
      });
    },
    onEndHover: function (element) {
      let sentence = self.xmlViewer.getInfosOfSentence({ id: element.id });
      if (typeof self.events.onSentenceHover === 'function') self.events.onSentenceHover(sentence);
      self.endHoverSentence({
        id: sentence.id,
        hasDatasets: sentence.hasDatasets,
        isSelected: self.isSelected(sentence)
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
      self.scrollToSentence({ sentence: self.lastSelectedSentence, noAnim: true });
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
      self.scrollToSentence({ sentence: self.lastSelectedSentence, noAnim: true });
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
      self.scrollToSentence({ sentence: self.lastSelectedSentence, noAnim: true });
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
      self.scrollToSentence({ sentence: self.lastSelectedSentence, noAnim: true });
      return typeof self.events.onPdfView === 'function' ? self.events.onPdfView() : undefined;
    });
  // Events
  this.events = events;
  return this;
};

// Check if the given sentence is selected
DocumentView.prototype.isSelected = function (sentence) {
  return (
    typeof this.selectedSentences[sentence.id] === 'object' &&
    typeof this.selectedSentences[sentence.id].id !== 'undefined'
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
DocumentView.prototype.getSentence = function (sentence) {
  return this.xmlViewer.getInfosOfSentence(sentence);
};

// Init documentView
DocumentView.prototype.init = function (opts, cb) {
  let self = this,
    xml = opts.xml.data.toString('utf8').replace(/\s/gm, ' ');
  this.xmlViewer = new XmlViewer('xml', 'documentView\\.screen', this.viewersEvents);
  if (opts.pdf) {
    this.pdfVisible = true;
    this.pdfViewer = new PdfViewer('pdf', 'documentView\\.screen', this.viewersEvents);
  }
  return this.xmlViewer.load(
    { xmlString: xml, colors: opts.colors, mapping: opts.xml.metadata.mapping },
    function (datasetsInfos) {
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
    }
  );
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
  this.selectedSentences[sentence.id] = sentence;
  if (this.pdfViewer) this.pdfViewer.selectSentence(sentence);
  this.xmlViewer.selectSentence(sentence);
};

// Unselect a sentence
DocumentView.prototype.unselectSentence = function (sentence) {
  delete this.selectedSentences[sentence.id];
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
  this.currentScrolledSentence = opts.sentence;
  if (this.pdfVisible)
    return this.pdfViewer.scrollToSentence(opts.sentence, function (position) {
      if (position) {
        if (opts.noAnim) self.screen.scrollTop(position);
        else self.screen.animate({ scrollTop: position });
      } else console.log('dataset not selected');
      return typeof cb === 'function' ? cb() : undefined;
    });
  else
    return this.xmlViewer.scrollToSentence(opts.sentence, function (position) {
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
DocumentView.prototype.addDataset = function (dataset, sentence) {
  if (this.pdfViewer) this.pdfViewer.addDataset(dataset, sentence);
  this.xmlViewer.addDataset(dataset, sentence);
};

// Remove a dataset
DocumentView.prototype.removeDataset = function (dataset) {
  if (this.pdfViewer) this.pdfViewer.removeDataset(dataset);
  this.xmlViewer.removeDataset(dataset);
};

// Add a corresp
DocumentView.prototype.addLink = function (dataset, sentence) {
  if (this.pdfViewer) this.pdfViewer.addLink(dataset, sentence);
  this.xmlViewer.addLink(dataset, sentence);
};

// Remove a corresp
DocumentView.prototype.removeLink = function (dataset, sentence) {
  if (this.pdfViewer) this.pdfViewer.removeLink(dataset, sentence);
  this.xmlViewer.removeLink(dataset, sentence);
};

// display left
DocumentView.prototype.displayLeft = function () {
  if (this.pdfViewer) this.pdfViewer.displayLeft();
};

// display right
DocumentView.prototype.displayRight = function () {
  if (this.pdfViewer) this.pdfViewer.displayRight();
};
