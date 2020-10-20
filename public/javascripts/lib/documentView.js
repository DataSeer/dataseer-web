/*
 * @prettier
 */
const Colors = function() {
  let self = this,
    colors = ['#ff0000', '#ffa500', '#ffff00', '#008000', '#0000ff', '#4b0082', '#ee82ee'],
    // colors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'],
    index = 0;
  self.backgroundColor = function(alpha) {
    let result = randomColor({
      // 'luminosity': 'light',
      'hue': colors[index],
      'format': 'rgba',
      'alpha': alpha
    });
    index = index < colors.length - 1 ? index + 1 : 0;
    return result;
  };
  self.color = function(backgroundColor) {
    let regex = /^rgba\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3}),\s*(\d*(?:\.\d+)?)\)$/,
      matches = backgroundColor.match(regex),
      R = matches[1],
      G = matches[2],
      B = matches[3],
      A = matches[4];
    // Calculate the perceptive luminance (aka luma) - human eye favors green color...
    let luma = (0.299 * R + 0.587 * G + 0.114 * B) / 255;
    // Return black for bright colors, white for dark colors
    return luma > 0.5 ? 'black' : 'white';
  };
  return self;
};

const DocumentView = function(events) {
  let self = this,
    colors = new Colors();

  let elements = {
    container: HtmlBuilder.div({ 'id': '', 'class': 'container-fluid', 'text': '' })
  };

  // get paragraphs without Datasets
  let paragraphsWithoutDatasets = function() {
      let paragraphs = elements.container.find('text > div > div, text > div > *:not(div)');
      return paragraphs.map(function(i, el) {
        if (jQuery(el).find('s[id], s[corresp]').length === 0) return el;
      });
    },
    sectionsWithoutDatasets = function() {
      let paragraphs = elements.container.find('text > div, text > *:not(div)');
      return paragraphs.map(function(i, el) {
        if (jQuery(el).find('s[id], s[corresp]').length === 0) return el;
      });
    },
    // get selected element (if it is in container)
    selectedElements = function() {
      let selection = jQuery('tei s.selected');
      if (selection.length > 0) {
        return {
          'err': null,
          'res': {
            'sentence': selection
          }
        };
      } else {
        return {
          'err': true,
          'res': null
        };
      }
    },
    selectionToSenctence = function(selection, options, clickEvent, cb) {
      let target = null;
      if (typeof selection.res.sentence !== 'undefined') {
        if (options.getdataType) {
          return dataseerML.getdataType(selection.res.sentence, function(err, res) {
            if (err) {
              return cb(err, res);
            }
            let dataType = res['datatype'] ? res['datatype'] : options.dataType,
              cert = res['cert'] ? res['cert'] : 0;
            // if dataType is set, then it's not a corresp
            target = selection.res.sentence
              .attr('id', options.id)
              .attr(options.user.role, options.user.id)
              .attr('type', dataType)
              .attr('cert', cert);
            target.removeAttr('class');
            jQuery(target)
              .parents('div[type]')
              .attr('subtype', 'dataseer');
            target.click(function(event) {
              let el = jQuery(event.target);
              scrollTo(el);
              clickEvent(options.id, el);
            });
            return cb(null, target);
          });
        } else {
          target = selection.res.sentence.attr('corresp', '#' + options.id).attr(options.user.role, options.user.id);
          target.removeAttr('class');
          jQuery(target)
            .parents('div[type]')
            .attr('subtype', 'dataseer');
          target.click(function(event) {
            let el = jQuery(event.target);
            scrollTo(el);
            clickEvent(options.id, el);
          });
          return target;
        }
      }
    },
    // scroll ot dataset position
    scrollTo = function(el) {
      if ($('#xml').is(':visible')) {
        let position =
          el.position().top +
          elements.container
            .parent()
            .parent()
            .parent()
            .scrollTop() -
          24;
        return elements.container
          .parent()
          .parent()
          .parent()
          .animate({ scrollTop: position });
      } else {
        self.views.scrollTo(el.attr('id'));
      }
    };

  self.init = function(id, doc, cb) {
    self.doc = doc;
    self.mainContainer = jQuery(id);
    self.mainContainer.empty().append($('<div id="xml">').append(elements.container));

    self.hasPdf = typeof self.doc.pdf !== 'undefined';

    if (self.hasPdf) {
      self.mainContainer.append($('<div id="pdf">'));
      $('#xml').hide();
      PdfManager.init('#pdf', {
        'click': function(item, element) {
          let xmlSentenceElement = $('tei s[sentenceid="' + item.sentenceId + '"]'),
            pdfSentenceElements = $('#pdf s[sentenceid="' + item.sentenceId + '"]'),
            pdfContour = $('#pdf .contourAnnotationsLayer > div.contour[sentenceid="' + item.sentenceId + '"] > div');
          $('#pdf s.selected').removeClass('selected');
          $('#pdf .contourAnnotationsLayer > div.contour[sentenceid] > div.selected').removeClass('selected');
          xmlSentenceElement.click();
          if (xmlSentenceElement.hasClass('selected')) {
            pdfSentenceElements.addClass('selected');
            pdfContour.addClass('selected');
          } else {
            pdfSentenceElements.removeClass('selected');
            pdfContour.removeClass('selected');
          }
        },
        'hover': function(item, element) {
          let pdfSentenceElements = $('#pdf s[sentenceid="' + item.sentenceId + '"]'),
            pdfContour = $('#pdf .contourAnnotationsLayer > div.contour[sentenceid="' + item.sentenceId + '"] > div');
          pdfSentenceElements.addClass('hover');
          pdfContour.addClass('activeContour');
        },
        'endHover': function(item, element) {
          let pdfSentenceElements = $('#pdf s[sentenceid="' + item.sentenceId + '"]'),
            pdfContour = $('#pdf .contourAnnotationsLayer > div.contour[sentenceid="' + item.sentenceId + '"] > div');
          pdfSentenceElements.removeClass('hover');
          pdfContour.removeClass('activeContour');
        }
      });
      return PdfManager.refreshPdf(self.doc.pdf.data.data, self.doc.pdf.metadata.sentences, function() {
        self.finishInit(self.doc);
        PdfManager.scrollToSentence(
          datasets
            .all()
            .first()
            .attr('sentenceid')
        );
        return cb();
      });
    } else {
      self.finishInit(self.doc);
      return cb();
    }
  };

  self.finishInit = function(doc) {
    self.source(self.doc.source);

    datasets.all().click(function(event) {
      let el = jQuery(event.target),
        id = el.attr('id');
      scrollTo(el);
      events.datasets.click(id, el);
    });

    corresps.all().click(function(event) {
      let el = jQuery(event.target),
        id = el.attr('corresp').replace('#', '');
      scrollTo(el);
      events.datasets.click(id, el);
    });

    datasets.colors();
    corresps.colors();
  };

  self.source = function(source) {
    if (typeof source === 'undefined') {
      let copy = $('#xml > div').clone();
      copy
        .find('*[style]')
        .removeAttr('style')
        .find('*[class]')
        .removeAttr('class');
      return copy.html();
    }
    elements.container.html(source.replace(/\s/gm, ' '));
    let s = elements.container.find('s:not([corresp]):not([id])');
    s.on('click', sentences.click);
    s.hover(sentences.hover, sentences.endHover);

    return self.source();
  };

  self.color = function(id) {
    return datasets.styleOf(id);
  };

  self.colors = function() {
    let styles = {};
    datasets.all().each(function() {
      let id = jQuery(this).attr('id'),
        style = datasets.styleOf(id);
      styles[id] = style;
    });
    return styles;
  };

  self.updateDataset = function(user, id, dataType) {
    return datasets.update(user, id, dataType);
  };

  self.addDataset = function(user, id, dataType, cb) {
    return datasets.add(user, id, dataType, function(err, res) {
      return cb(err, res);
    });
  };

  self.getTextOfDataset = function(id) {
    return datasets.get(id).text();
  };

  self.deleteDataset = function(id) {
    return datasets.remove(id);
  };

  self.addCorresp = function(user, id) {
    return corresps.add(user, id);
  };

  self.deleteAllCorresps = function(id) {
    return corresps.removeAll(id);
  };

  self.deleteCorresp = function(el) {
    return corresps.remove(el);
  };

  self.views = {
    // scroll ot dataset position
    'scrollTo': function(id) {
      let position =
        self.hasPdf && $('#pdf').is(':visible')
          ? PdfManager.scrollToSentence(datasets.get(id).attr('sentenceid')) +
            elements.container
              .parent()
              .parent()
              .scrollTop() -
            14
          : datasets.get(id).position().top +
            elements.container
              .parent()
              .parent()
              .parent()
              .scrollTop() -
            14;
      return elements.container
        .parent()
        .parent()
        .parent()
        .animate({ scrollTop: position });
    },
    // set All elements visible
    'allVisible': function() {
      paragraphsWithoutDatasets().removeClass();
      sectionsWithoutDatasets().removeClass();
      $('#pdf').hide();
      $('#xml').show();
      $('#datasetsListItems .selected .item').click();
    },
    // set only dataseer elements visible
    'onlyDataseer': function() {
      self.views.allVisible();
      sectionsWithoutDatasets().addClass('hidden');
      $('#pdf').hide();
      $('#xml').show();
      $('#datasetsListItems .selected .item').click();
    },
    // set only datasets elements visible
    'onlyDatasets': function() {
      self.views.allVisible();
      self.views.onlyDataseer();
      paragraphsWithoutDatasets().addClass('hidden');
      $('#pdf').hide();
      $('#xml').show();
      $('#datasetsListItems .selected .item').click();
    },
    // set only PDF elements visible
    'pdf': function() {
      $('#xml').hide();
      $('#pdf').show();
      $('#datasetsListItems .selected .item').click();
    }
  };

  // Sentences features
  let sentences = {
    'new': function(sentenceid, coords, html) {
      return jQuery('<s/>')
        .attr('sentenceid', sentenceid)
        .attr('coords', coords)
        .html(html);
    },
    'click': function() {
      let previousSelection = elements.container.find('s.selected'),
        selected = jQuery(this);
      if (
        !selected.attr('corresp') &&
        !selected.attr('id') &&
        selected.find('s[corresp]').length + selected.find('s[id]').length === 0
      ) {
        selected.addClass('selected');
        if (previousSelection.length > 0) {
          previousSelection.removeAttr('class');
        }
      }
    },
    'hover': function() {
      let selected = jQuery(this);
      if (
        !selected.attr('corresp') &&
        !selected.attr('id') &&
        selected.find('s[corresp]').length + selected.find('s[id]').length === 0
      ) {
        selected.addClass('hover');
      }
    },
    'endHover': function() {
      let selected = jQuery(this);
      if (
        !selected.attr('corresp') &&
        !selected.attr('id') &&
        selected.find('s[corresp]').length + selected.find('s[id]').length === 0
      ) {
        selected.removeClass('hover');
      }
    }
  };

  // Datasets features
  let datasets = {
    // get element of given dataset
    'get': function(id) {
      return elements.container.find('tei div[subtype="dataseer"] s[id="' + id + '"]');
    },
    // get elements of all datasets
    'all': function() {
      return elements.container.find('tei div[subtype="dataseer"] s[id]');
    },
    // get cert of given dataset
    'certOf': function(id) {
      let cert = parseFloat(datasets.get(id).attr('cert'));
      if (!cert || cert <= 0.5) cert = 0.5;
      return cert;
    },
    // get/set dataType of given dataset
    'dataTypeOf': function(id, value) {
      if (typeof value === 'undefined') return datasets.get(id).attr('type');
      datasets.get(id).attr('type', value);
      return datasets.dataTypeOf(id);
    },
    // get/set style of given dataset
    'styleOf': function(id, value) {
      if (typeof value === 'undefined') return datasets.get(id).attr('style');
      datasets.get(id).attr('style', value);
      return datasets.styleOf(id);
    },
    // set colors of datasets
    'colors': function() {
      datasets.all().each(function() {
        let el = jQuery(this),
          id = el.attr('id'),
          backgroundColor = colors.backgroundColor(datasets.certOf(id)),
          color = colors.color(backgroundColor);
        datasets.styleOf(id, 'background-color:' + backgroundColor + ';' + 'color: ' + color);
        if (self.hasPdf) PdfManager.setColor(el.attr('sentenceid'), backgroundColor);
      });
    },
    // add dataset
    'add': function(user, id, dataType, cb) {
      let selection = selectedElements();
      if (selection.err) return cb(true, 'Please select the sentence that contains the new dataset');
      return selectionToSenctence(
        selection,
        { 'id': id, 'dataType': dataType, 'getdataType': true, 'user': user },
        events.datasets.click,
        function(err, res) {
          if (err) return cb(err, res);
          let backgroundColor = colors.backgroundColor(datasets.certOf(id)),
            color = colors.color(backgroundColor),
            parent = res.parents('div').first();
          parent.attr('subtype', 'dataseer');
          datasets.styleOf(id, 'background-color:' + backgroundColor + ';' + 'color: ' + color);
          if (self.hasPdf) {
            let sentenceid = datasets.get(id).attr('sentenceid');
            PdfManager.setColor(sentenceid, backgroundColor);
            PdfManager.linkDatasetToSentence(self.doc, sentenceid, id);
          }
          return cb(null, { 'datatype': res.attr('type'), 'cert': res.attr('cert') });
        }
      );
    },
    // add dataset
    'update': function(user, id, dataType) {
      jQuery('#' + id)
        .attr('type', dataType)
        .attr(user.role, user.id);
    },
    // remove dataset
    'remove': function(id) {
      let dataset = datasets.get(id),
        parent = dataset.parents('div[subtype]'),
        newElement = sentences.new(dataset.attr('sentenceid'), dataset.attr('coords'), dataset.html()).clone();
      dataset.replaceWith(newElement);
      newElement.click(sentences.click).hover(sentences.hover, sentences.endHover);
      if (!parent.has('s[id]').length && !parent.has('s[corresp]').length) parent.removeAttr('subtype');
      if (self.hasPdf) {
        let sentenceid = dataset.attr('sentenceid');
        PdfManager.removeColor(sentenceid);
        PdfManager.unlinkDatasetToSentence(self.doc, sentenceid);
      }
    }
  };

  // Corresps features
  let corresps = {
    // get element of given correp
    'get': function(id) {
      return elements.container.find('tei s[corresp="#' + id + '"]');
    },
    // get elements of all correps
    'all': function() {
      return elements.container.find('tei s[corresp]');
    },
    // get/set style of given correp
    'styleOf': function(id, value) {
      if (typeof value === 'undefined') return corresps.get(id).attr('style');
      corresps.get(id).attr('style', value);
      return corresps.styleOf(id);
    },
    // set colors of correps
    'colors': function() {
      corresps.all().each(function() {
        let el = jQuery(this),
          id = el.attr('corresp').replace('#', ''),
          style = datasets.styleOf(id),
          color = style.split(';')[0].split(':')[1];
        corresps.styleOf(id, style);
        if (self.hasPdf) PdfManager.setColor(el.attr('sentenceid'), color);
      });
    },
    // add correp
    'add': function(user, id) {
      let selection = selectedElements();
      if (selection.err) return selection;
      let target = selectionToSenctence(
          selection,
          { 'id': id, 'getdataType': false, 'user': user },
          events.corresps.click
        ),
        parent = target.parents('div').first(),
        style = datasets.styleOf(id),
        color = style.split(';')[0].split(':')[1];
      parent.attr('subtype', 'dataseer');
      corresps.styleOf(id, style);
      if (self.hasPdf) {
        let sentenceid = selection.res.sentence.attr('sentenceid');
        PdfManager.setColor(sentenceid, color);
        PdfManager.linkDatasetToSentence(self.doc, sentenceid, id);
      }
      return {
        err: false,
        res: target
      };
    },
    // remove correp
    'remove': function(el) {
      let parent = el.parents('div[subtype]'),
        newElement = sentences.new(el.attr('sentenceid'), el.attr('coords'), el.html()).clone();
      el.replaceWith(newElement);
      newElement.click(sentences.click).hover(sentences.hover, sentences.endHover);
      if (!parent.has('s[id]').length && !parent.has('s[corresp]').length) parent.removeAttr('subtype');
      if (self.hasPdf) {
        let sentenceid = el.attr('sentenceid');
        PdfManager.removeColor(sentenceid);
        PdfManager.unlinkDatasetToSentence(self.doc, sentenceid);
      }
    },
    // remove all correp
    'removeAll': function(id) {
      let _corresps = corresps.get(id).each(function() {
        let el = jQuery(this),
          parent = el.parents('div[subtype]'),
          newElement = sentences.new(el.attr('sentenceid'), el.attr('coords'), el.html()).clone();
        el.replaceWith(newElement);
        newElement.click(sentences.click).hover(sentences.hover, sentences.endHover);
        if (!parent.has('s[id]').length && !parent.has('s[corresp]').length) parent.removeAttr('subtype');
        if (self.hasPdf) {
          let sentenceid = el.attr('sentenceid');
          PdfManager.removeColor(sentenceid);
          PdfManager.unlinkDatasetToSentence(self.doc, sentenceid);
        }
      });
    }
  };

  return self;
};
