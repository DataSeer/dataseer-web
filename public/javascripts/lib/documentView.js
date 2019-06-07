const DocumentView = function(events) {

  let self = this;

  let elements = {
    'container': HtmlBuilder.div({ 'id': '', 'class': 'container-fluid', 'text': '' })
  };

  let paragraphsWithoutDatasets = function() {
      let paragraphs = elements.container.find('div[subtype="dataseer"] > div > p');
      return paragraphs.map(function(i, el) {
        if ($(el).children('s').length === 0) return el;
      });
    },
    // get selected element (if it is in container)
    selectedElements = function() {
      let selection = window.getSelection(),
        focusNode = $(selection.focusNode),
        focusParent = focusNode.parent(),
        anchorNode = $(selection.anchorNode),
        anchorParent = anchorNode.parent(),
        target = $(selection);
      if (!(!selection.isCollapsed && selection.anchorNode && selection.focusNode)) {
        alert('You must select some text before add new dataset');
        return null;
      }
      if (!elements.container.has($(target.focusNode).parent())) {
        alert('selection must be in document-view');
        return null;
      }
      if (!anchorParent.is(focusParent)) {
        alert('selection must be in same paragraph (and not contain part of dataset)');
        return null;
      }
      if (!elements.container.has($(target.focusNode).parent())) {
        alert('selection must be in document-view');
        return null;
      }
      if (!elements.container.has($(target.focusNode).parent())) {
        alert('selection must be in document-view');
        return null;
      }
      return {
        'anchorParent': anchorParent,
        'nodes': selection.getRangeAt(0).cloneContents().childNodes
      };

    },
    // scroll ot dataset position
    scrollTo = function(el) {
      let position = el.position().top + elements.container.parent().scrollTop() - 14;
      return elements.container.parent().animate({ scrollTop: position });
    };

  self.init = function(id, source) {
    $(id).empty().append(elements.container);
    self.source(source);

    datasets.all().click(function() {
      let id = $(this).attr('id');
      scrollTo($(this));
      events.datasets.click(id);
    });

    corresps.all().click(function() {
      let id = $(this).attr('corresp').replace('#', '');
      scrollTo($(this));
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
      let id = $(this).attr('id'),
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
      $('#document-view tei text p').each(function() {
        let el = $(this),
          data = el.clone().children().remove('s').end().html();
        el.html(senteces.semgment(data));
      });
      $('span[type="sentence"][from="dataseer"]').click(function() {
        senteces.selected(this);
        events.senteces.click(this);
      });
    },
    'unprocess': function() {
      $('span[type="sentence"][from="dataseer"]').each(function() {
        let el = $(this);
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
      let current = $('span[type="sentence"][from="dataseer"][selected="true"]');
      if (typeof el === 'undefined') return current;
      current.removeAttr('selected');
      $(el).attr('selected', true);
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
        let id = $(this).attr('id'),
          color = randomColor({ luminosity: 'light', hue: 'blue', format: 'rgba', alpha: datasets.confidenceOf(id) });
        datasets.styleOf(id, 'background-color:' + color);
      });
    },
    // new dataset
    'new': function(id, dataType) {
      return $('<s/>').attr('id', id).attr('type', dataType);
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
      //   let id = $(this).attr('id');
      //   scrollTo($(this));
      //   events.datasets.click(id);
      // });
      let result = selectedElements();
      if (!result) return null;

      let html = result.anchorParent.html(),
        nodes = result.nodes,
        nodesHtml = '';
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].outerHTML) nodesHtml += nodes[i].outerHTML;
        else if (nodes[i].wholeText) nodesHtml += nodes[i].wholeText;
      }
      let target = datasets.new(id, dataType).html(nodesHtml);
      result.anchorParent.html(html.replace(nodesHtml, $("<div/>").append(target.clone()).html()));
      $('s[id="' + id + '"]').parents('div[type]').attr('subtype', 'dataseer');
      let color = randomColor({ luminosity: 'light', hue: 'blue', format: 'rgba', alpha: datasets.confidenceOf(id) });
      datasets.styleOf(id, 'background-color:' + color);
      target.click(function() {
        let id = $(this).attr('id');
        scrollTo($(this));
        events.datasets.click(id);
      });
    },
    // remove dataset
    'remove': function(id) {
      let dataset = datasets.get(id);
      dataset.replaceWith(dataset.html());
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
        let id = $(this).attr('corresp').replace('#', ''),
          style = datasets.styleOf(id);
        corresps.styleOf(id, style);
      });
    },
    // new correp
    'new': function(id) {
      return $('<s/>').attr('corresp', id);
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
      //   let id = $(this).attr('corresp').replace('#', '');
      //   scrollTo($(this));
      //   events.corresps.click(id);
      // });

      let result = selectedElements();
      if (!result) return null;

      let html = result.anchorParent.html(),
        nodes = result.nodes,
        nodesHtml = '';
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].outerHTML) nodesHtml += nodes[i].outerHTML;
        else if (nodes[i].wholeText) nodesHtml += nodes[i].wholeText;
      }
      let target = corresps.new(id).html(nodesHtml);
      result.anchorParent.html(html.replace(nodesHtml, $("<div/>").append(target.clone()).html()));
      // $('s[corresp="' + id + '"]').parents('div[type]').attr('subtype', 'dataseer');
      let color = randomColor({ luminosity: 'light', hue: 'blue', format: 'rgba', alpha: datasets.confidenceOf(id) });
      datasets.styleOf(id, 'background-color:' + color);
      target.click(function() {
        let id = $(this).attr('id');
        scrollTo($(this));
        events.corresps.click(id);
      });
    },
    // remove correp
    'remove': function(id) {
      let _corresps = corresps.get(id).each(function() {
        let el = $(this);
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