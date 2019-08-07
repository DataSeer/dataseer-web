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
      let selection = jQuery('s.selected');
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
          'msg': 'Please select the sentence that contains the new dataset'
        };
      }
    },
    selectionToSenctence = function(selection, constructor, options, clickEvent, cb) {
      let target = null;
      if (typeof selection.res.sentence !== 'undefined') {
        if (options.getdataType) {
          return dataseerML.getdataType(selection.res.sentence, function(err, res) {
            if (err) {
              return cb(err, res);
            }
            let dataType = res['dataset-type'] ? res['dataset-type'] : options.dataType;
            // if dataType is set, then it's not a corresp
            target = selection.res.sentence.attr('id', options.id).attr('type', dataType);
            target.removeAttr('class');
            jQuery(target)
              .parents('div[type]')
              .attr('subtype', 'dataseer');
            target.click(function() {
              scrollTo(jQuery(this));
              clickEvent(options.id);
            });
            return cb(null, target);
          });
        } else {
          target = selection.res.sentence.attr('corresp', '#' + options.id);
          target.removeAttr('class');
          jQuery(target)
            .parents('div[type]')
            .attr('subtype', 'dataseer');
          target.click(function() {
            scrollTo(jQuery(this));
            clickEvent(options.id);
          });
          return target;
        }
      }
    },
    // scroll ot dataset position
    scrollTo = function(el) {
      let position = el.position().top + elements.container.parent().scrollTop() - 14;
      return elements.container.parent().animate({ scrollTop: position });
    };

  self.init = function(id, source) {
    jQuery(id)
      .empty()
      .append(elements.container);
    self.source(source);

    datasets.all().click(function() {
      let id = jQuery(this).attr('id');
      scrollTo(jQuery(this));
      events.datasets.click(id);
    });

    corresps.all().click(function() {
      let id = jQuery(this)
        .attr('corresp')
        .replace('#', '');
      scrollTo(jQuery(this));
      events.corresps.click(id);
    });

    datasets.colors();
    corresps.colors();
  };

  self.source = function(source) {
    if (typeof source === 'undefined') {
      let copy = elements.container.clone();
      copy
        .find('*')
        .removeAttr('style')
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

  self.updateDataset = function(id, dataType) {
    return datasets.update(id, dataType);
  };

  self.addDataset = function(id, dataType, cb) {
    return datasets.add(id, dataType, function(err, res) {
      return cb(err, res);
    });
  };

  self.deleteDataset = function(id) {
    return datasets.remove(id);
  };

  self.addCorresp = function(id) {
    return corresps.add(id);
  };

  self.deleteCorresps = function(id) {
    return corresps.remove(id);
  };

  self.views = {
    // scroll ot dataset position
    'scrollTo': function(id) {
      let position = datasets.get(id).position().top + elements.container.parent().scrollTop() - 14;
      return elements.container.parent().animate({ scrollTop: position });
    },
    // set All elements visible
    'allVisible': function() {
      paragraphsWithoutDatasets().removeClass();
      sectionsWithoutDatasets().removeClass();
      elements.container.parent().removeClass();
      elements.container.parent().addClass('bordered');
    },
    // set only dataseer elements visible
    'onlyDataseer': function() {
      self.views.allVisible();
      sectionsWithoutDatasets().addClass('hidden');
    },
    // set only datasets elements visible
    'onlyDatasets': function() {
      self.views.allVisible();
      self.views.onlyDataseer();
      paragraphsWithoutDatasets().addClass('hidden');
    }
  };

  // Sentences features
  let sentences = {
    'new': function(html) {
      return jQuery('<s/>').html(html);
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
      return elements.container.find('tei text div[subtype="dataseer"] s[id="' + id + '"]');
    },
    // get elements of all datasets
    'all': function() {
      return elements.container.find('tei text div[subtype="dataseer"] s[id]');
    },
    // get confidence of given dataset
    'confidenceOf': function(id) {
      let confidence = parseFloat(datasets.get(id).attr('confidence'));
      if (!confidence || confidence <= 0.5) confidence = 0.5;
      return confidence;
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
        let id = jQuery(this).attr('id'),
          backgroundColor = colors.backgroundColor(datasets.confidenceOf(id)),
          color = colors.color(backgroundColor);
        datasets.styleOf(id, 'background-color:' + backgroundColor + ';' + 'color: ' + color);
      });
    },
    // new dataset
    'new': function(id, dataType) {
      return jQuery('<s/>')
        .attr('id', id)
        .attr('type', dataType);
    },
    // add dataset
    'add': function(id, dataType, cb) {
      let selection = selectedElements();
      if (selection.err) return cb(true, selection.msg);
      return selectionToSenctence(
        selection,
        datasets.new,
        { 'id': id, 'dataType': dataType, 'getdataType': true },
        events.datasets.click,
        function(err, res) {
          if (err) return cb(err, res);
          let backgroundColor = colors.backgroundColor(datasets.confidenceOf(id)),
            color = colors.color(backgroundColor);
          datasets.styleOf(id, 'background-color:' + backgroundColor + ';' + 'color: ' + color);
          return cb(null, 'everythings ok');
        }
      );
    },
    // add dataset
    'update': function(id, dataType) {
      jQuery('#' + id).attr('type', dataType);
    },
    // remove dataset
    'remove': function(id) {
      let dataset = datasets.get(id),
        parent = dataset.parents('div[type]'),
        newElement = sentences.new(dataset.html()).clone();
      dataset.replaceWith(newElement);
      newElement.click(sentences.click).hover(sentences.hover, sentences.endHover);
      if (!parent.has('s[id]').length && !parent.has('s[corresp]').length) parent.removeAttr('subtype');
    }
  };

  // Corresps features
  let corresps = {
    // get element of given correp
    'get': function(id) {
      return elements.container.find('tei text s[corresp="#' + id + '"]');
    },
    // get elements of all correps
    'all': function() {
      return elements.container.find('tei text s[corresp]');
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
        let id = jQuery(this)
            .attr('corresp')
            .replace('#', ''),
          style = datasets.styleOf(id);
        corresps.styleOf(id, style);
      });
    },
    // new correp
    'new': function(id) {
      return jQuery('<s/>').attr('corresp', '#' + id);
    },
    // add correp
    'add': function(id) {
      let selection = selectedElements();
      if (selection.err) return selection;
      let target = selectionToSenctence(
        selection,
        corresps.new,
        { 'id': id, 'getdataType': false },
        events.corresps.click
      );
      corresps.styleOf(id, datasets.styleOf(id));
      return {
        err: false,
        res: 'everythings ok'
      };
    },
    // remove correp
    'remove': function(id) {
      let _corresps = corresps.get(id).each(function() {
        let el = jQuery(this),
          parent = el.parents('div[type]'),
          newElement = sentences.new(el.html()).clone();
        el.replaceWith(newElement);
        newElement.click(sentences.click).hover(sentences.hover, sentences.endHover);
        if (!parent.has('s[id]').length && !parent.has('s[corresp]').length) parent.removeAttr('subtype');
      });
    }
  };

  return self;
};
