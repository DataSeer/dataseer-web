/*
 * @prettier
 */

'use strict';

const XmlViewer = function (id, screenId, events = {}) {
  let self = this;
  this.containerId = id;
  this.screenId = screenId;
  // HTML elements
  this.screen = $(`#${this.screenId}`);
  this.screenElement = this.screen.get(0);
  this.viewerId = id + 'Viewer';
  this.container = $(`#${this.containerId}`);
  this.containerElement = this.container.get(0);
  this.viewer = $(`<div id="${this.viewerId}" class="xmlViewer"></div>`);
  this.viewerElement = this.viewer.get(0);
  this.container.append(this.viewer);
  // Events
  this.events = events;
  return this;
};

// Attach event
XmlViewer.prototype.attach = function (event, fn) {
  this.events[event] = fn;
};

// Get order of appearance of sentences
XmlViewer.prototype.getSentencesMapping = function () {
  let result = {};
  this.viewer.find(`s[sentenceId]`).map(function (i, el) {
    result[$(el).attr('sentenceId')] = i;
  });
  return result;
};

// hoverSentence
XmlViewer.prototype.hoverSentence = function (sentence) {
  if (!sentence.isDataset && !sentence.isSelected)
    return this.viewer.find(`s[sentenceId="${sentence.sentenceId}"]`).addClass('hover');
};

// endHoverSentence
XmlViewer.prototype.endHoverSentence = function (sentence) {
  if (!sentence.isDataset && !sentence.isSelected)
    return this.viewer.find(`s[sentenceId="${sentence.sentenceId}"]`).removeClass('hover');
};

// Select a sentence
XmlViewer.prototype.selectDataset = function (id, cb) {
  let el = this.viewer.find(`s[id="${id}"]`).first(),
    position = el.position(),
    top = position ? position.top : 0;
  return cb(top);
};

// Select a sentence
XmlViewer.prototype.selectCorresp = function (id, cb) {
  let el = this.viewer.find(`s[sentenceId="${id}"]`).first(),
    position = el.position(),
    top = position ? position.top : 0;
  return cb(top);
};

// Select a sentence
XmlViewer.prototype.selectSentence = function (sentence) {
  let el = this.viewer.find(`s[sentenceId="${sentence.sentenceId}"]`).removeClass('hover').addClass('selected');
};

// Unselect a sentence
XmlViewer.prototype.unselectSentence = function (sentence) {
  let el = this.viewer.find(`s[sentenceId="${sentence.sentenceId}"]`).removeClass('selected');
};

// Select a sentence
XmlViewer.prototype.getInfosOfSentence = function (sentenceId) {
  let el = this.viewer.find(`s[sentenceId="${sentenceId}"]`);
  if (el.get(0)) {
    let isCorresp = el.attr('corresp') ? true : false,
      isDataset = el.attr('id') ? true : false,
      datasetId = isCorresp ? el.attr('corresp').replace('#', '') : el.attr('id');
    return {
      sentenceId: el.attr('sentenceId'),
      datasetId: datasetId,
      isDataset: isDataset,
      isCorresp: isCorresp,
      text: el.text()
    };
  }
};

// Add a dataset
XmlViewer.prototype.addDataset = function (dataset) {
  let el = this.viewer.find(`s[sentenceId="${dataset.sentenceId}"]`);
  if (
    el.get(0) &&
    dataset.color &&
    dataset.color.foreground &&
    dataset.color.background &&
    dataset.color.background.rgb
  )
    return el
      .attr('id', dataset.id)
      .css('color', dataset.color.foreground)
      .css('background-color', dataset.color.background.rgb);
};

// Remove a dataset
XmlViewer.prototype.removeDataset = function (dataset) {
  let el = this.viewer.find(`s[id="${dataset.id}"]`);
  if (el.get(0)) el.removeAttr('id').css('color', '').css('background-color', '');
  this.removeCorresps(dataset);
};

// Add a corresp
XmlViewer.prototype.addCorresp = function (dataset, sentenceId) {
  let el = this.viewer.find(`s[sentenceId="${sentenceId}"]`);
  if (
    el.get(0) &&
    dataset.color &&
    dataset.color.foreground &&
    dataset.color.background &&
    dataset.color.background.rgb
  )
    return el
      .attr('corresp', `#${dataset.id}`)
      .css('color', dataset.color.foreground)
      .css('background-color', dataset.color.background.rgb);
};

// Remove a corresp
XmlViewer.prototype.removeCorresps = function (dataset) {
  let el = this.viewer.find(`s[corresp="#${dataset.id}"]`);
  if (el.get(0)) return el.removeAttr('corresp').css('color', '').css('background-color', '');
};

// Remove a corresp
XmlViewer.prototype.removeCorresp = function (dataset, sentenceId) {
  let el = this.viewer.find(`s[sentenceId="${sentenceId}"]`);
  if (el.get(0)) return el.removeAttr('corresp').css('color', '').css('background-color', '');
};

// Render the XML
XmlViewer.prototype.load = function (opts = {}, cb) {
  console.log('Loading XML...');
  let self = this;
  this.viewer.html(opts.xmlString);
  // Init events
  this.viewer
    .find('s')
    .click(function () {
      let el = $(this);
      if (typeof self.events.onClick === 'function')
        return self.events.onClick(self.getInfosOfSentence(el.attr('sentenceId')));
    })
    .hover(
      // in
      function () {
        let el = $(this);
        if (typeof self.events.onHover === 'function')
          return self.events.onHover(self.getInfosOfSentence(el.attr('sentenceId')));
      },
      // out
      function () {
        let el = $(this);
        if (typeof self.events.onEndHover === 'function')
          return self.events.onEndHover(self.getInfosOfSentence(el.attr('sentenceId')));
      }
    );
  // Color dataset
  this.viewer.find('s[id]').map(function () {
    let el = $(this),
      datasetId = el.attr('id');
    self.addDataset({ sentenceId: el.attr('sentenceId'), id: datasetId, color: opts.colors[datasetId] });
  });
  // Color corresps
  this.viewer.find('s[corresp]').map(function () {
    let el = $(this),
      datasetId = el.attr('corresp').replace('#', '');
    self.addDataset({ sentenceId: el.attr('sentenceId'), id: datasetId, color: opts.colors[datasetId] });
  });
  return cb({
    colors: opts.colors,
    datasets: this.viewer
      .find('s[id]')
      .map(function () {
        let el = $(this);
        return { sentenceId: el.attr('sentenceId'), datasetId: el.attr('id') };
      })
      .get(),
    corresps: this.viewer
      .find('s[corresp]')
      .map(function () {
        let el = $(this);
        return { sentenceId: el.attr('sentenceId'), datasetId: el.attr('corresp').replace('#', '') };
      })
      .get()
  });
};
