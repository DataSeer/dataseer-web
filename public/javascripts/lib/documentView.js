const DocumentView = function(events) {

  let self = this;

  let elements = {
    'container': HtmlBuilder.div({ 'id': '', 'class': 'container-fluid', 'text': '' })
  };

  let paragraphsWithoutDatasets = function() {
      let paragraphs = elements.container.find('div[subtype="dataseer"] > div > p');
      return paragraphs.map(function(i, el) {
        if (jQuery(el).children('s').length === 0) return el;
      });
    },
    // get selected element (if it is in container)
    selectedElements = function() {
      let selection = window.getSelection(),
        focusNode = jQuery(selection.focusNode),
        focusParent = focusNode.parent(),
        anchorNode = jQuery(selection.anchorNode),
        anchorParent = anchorNode.parent(),
        target = jQuery(selection);
      if (!(!selection.isCollapsed && selection.anchorNode && selection.focusNode)) {
        return {
          'err': true,
          'msg': 'Please select some text before add new dataset'
        };
      }
      if (!elements.container.has(jQuery(selection.focusNode).parent()).length) {
        return {
          'err': true,
          'msg': 'Text selected must be a part of XML document'
        };
      }
      if (!anchorParent.is(focusParent)) {
        return {
          'err': true,
          'msg': 'Text selected must be in same paragraph, and not contain part of an existing dataset'
        };
      }
      return {
        'err': null,
        'res': {
          'anchorParent': anchorParent,
          'nodes': selection.getRangeAt(0).cloneContents().childNodes
        }
      };
    },
    // scroll ot dataset position
    scrollTo = function(el) {
      let position = el.position().top + elements.container.parent().scrollTop() - 14;
      return elements.container.parent().animate({ scrollTop: position });
    };

  self.init = function(id, source) {
    jQuery(id).empty().append(elements.container);
    self.source(source);

    datasets.all().click(function() {
      let id = jQuery(this).attr('id');
      scrollTo(jQuery(this));
      events.datasets.click(id);
    });

    corresps.all().click(function() {
      let id = jQuery(this).attr('corresp').replace('#', '');
      scrollTo(jQuery(this));
      events.corresps.click(id);
    });

    datasets.colors();
    corresps.colors();
  };

  self.source = function(source) {
    if (typeof source === 'undefined') {
      let copy = elements.container.clone();
      copy.find('s').removeAttr('style');
      return copy.html();
    }
    elements.container.html(source.replace(/\s/gm, ' '));
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

  self.addDataset = function(id, dataType) {
    return datasets.add(id, dataType);
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

  let senteces = {
    'process': function() {
      jQuery('#document-view tei text p').each(function() {
        let el = jQuery(this),
          data = el.clone().children().remove('s').end().html();
        el.html(senteces.semgment(data));
      });
      jQuery('span[type="sentence"][from="dataseer"]').click(function() {
        senteces.selected(this);
        events.senteces.click(this);
      });
    },
    'unprocess': function() {
      jQuery('span[type="sentence"][from="dataseer"]').each(function() {
        let el = jQuery(this);
        el.replaceWith(el.html());
      });
    },
    'semgment': function(text) {
      let newSentence = function(html) { return '<span type="sentence" from="dataseer">' + html + '.</span>'; },
        _sentences = text.split('.');
      for (var i = 0; i < _sentences.length; i++) {
        _sentences[i] = newSentence(_sentences[i]);
      }
      return _sentences.join('');
    },
    'selected': function(el) {
      let current = jQuery('span[type="sentence"][from="dataseer"][selected="true"]');
      if (typeof el === 'undefined') return current;
      current.removeAttr('selected');
      jQuery(el).attr('selected', true);
      return senteces.selected();
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
          color = randomColor({ luminosity: 'light', hue: 'blue', format: 'rgba', alpha: datasets.confidenceOf(id) });
        datasets.styleOf(id, 'background-color:' + color);
      });
    },
    // new dataset
    'new': function(id, dataType) {
      return jQuery('<s/>').attr('id', id).attr('type', dataType);
    },
    // add dataset
    'add': function(id, dataType) {
      // let target = senteces.selected();
      // alert(target.length);
      // if (!target.length) return null;
      // target.replaceWith(datasets.new(id, dataType).html(target.html()));
      // let color = randomColor({ luminosity: 'light', hue: 'blue', format: 'rgba', alpha: datasets.confidenceOf(id) });
      // datasets.styleOf(id, 'background-color:' + color);
      // target.click(function() {
      //   let id = jQuery(this).attr('id');
      //   scrollTo(jQuery(this));
      //   events.datasets.click(id);
      // });
      let selection = selectedElements();
      if (selection.err) return selection;
      let result = selection.res;

      let html = result.anchorParent.html(),
        nodes = result.nodes,
        nodesHtml = '';
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].outerHTML) nodesHtml += nodes[i].outerHTML;
        else if (nodes[i].wholeText) nodesHtml += nodes[i].wholeText;
      }
      let target = datasets.new(id, dataType).html(nodesHtml);
      result.anchorParent.html(html.replace(nodesHtml, jQuery("<div/>").append(target.clone()).html()));
      jQuery('s[id="' + id + '"]').parents('div[type]').attr('subtype', 'dataseer');
      let color = randomColor({ luminosity: 'light', hue: 'blue', format: 'rgba', alpha: datasets.confidenceOf(id) });
      datasets.styleOf(id, 'background-color:' + color);
      target.click(function() {
        let id = jQuery(this).attr('id');
        scrollTo(jQuery(this));
        events.datasets.click(id);
      });
      return {
        'err': false,
        'res': 'everythings ok'
      };
    },
    // remove dataset
    'remove': function(id) {
      let dataset = datasets.get(id),
        parent = dataset.parents('div[type]');
      dataset.replaceWith(dataset.html());
      if (!parent.has('s[id]').length) parent.removeAttr('subtype');
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
        let id = jQuery(this).attr('corresp').replace('#', ''),
          style = datasets.styleOf(id);
        corresps.styleOf(id, style);
      });
    },
    // new correp
    'new': function(id) {
      return jQuery('<s/>').attr('corresp', id);
    },
    // add correp
    'add': function(id) {
      // let target = senteces.selected();
      // let target = selectedElements();
      // alert(id);
      // alert(target.length);
      // if (!target.length) return null;
      // target.replaceWith(corresps.new(id).html(target.html()));
      // let style = datasets.styleOf(id);
      // corresps.styleOf(id, style);
      // corresps.click(function() {
      //   let id = jQuery(this).attr('corresp').replace('#', '');
      //   scrollTo(jQuery(this));
      //   events.corresps.click(id);
      // });
      let selection = selectedElements();
      if (selection.err) return selection;
      let result = selection.res;

      let html = result.anchorParent.html(),
        nodes = result.nodes,
        nodesHtml = '';
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].outerHTML) nodesHtml += nodes[i].outerHTML;
        else if (nodes[i].wholeText) nodesHtml += nodes[i].wholeText;
      }
      let target = corresps.new(id).html(nodesHtml);
      result.anchorParent.html(html.replace(nodesHtml, jQuery("<div/>").append(target.clone()).html()));
      // jQuery('s[corresp="' + id + '"]').parents('div[type]').attr('subtype', 'dataseer');
      let color = randomColor({ luminosity: 'light', hue: 'blue', format: 'rgba', alpha: datasets.confidenceOf(id) });
      datasets.styleOf(id, 'background-color:' + color);
      target.click(function() {
        let id = jQuery(this).attr('id');
        scrollTo(jQuery(this));
        events.corresps.click(id);
      });
      return {
        'err': false,
        'res': 'everythings ok'
      };
    },
    // remove correp
    'remove': function(id) {
      let _corresps = corresps.get(id).each(function() {
        let el = jQuery(this);
        el.replaceWith(el.html());
      });
    }
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
      elements.container.parent().removeClass();
    },
    // set only dataseer elements visible
    'onlyDataseer': function() {
      self.views.allVisible();
      elements.container.parent().addClass('tei-only-dataseer');
    },
    // set only datasets elements visible
    'onlyDatasets': function() {
      self.views.onlyDataseer();
      paragraphsWithoutDatasets().addClass('hidden');
    },
    // set view for new dataset selection
    'segmented': function(value) {
      if (value) senteces.process();
      else senteces.unprocess();
    }
  };

  return self;
};