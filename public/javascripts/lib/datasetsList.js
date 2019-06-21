const DatasetsList = function(data, events) {
  let datasets = {};

  let elements = {
      'container': HtmlBuilder.div({ 'id': '', 'class': 'container-fluid', 'text': '' })
    },
    mapping = {};

  self.datasets = {
    'add': function(id) {
      datasets[id] = new View.links.deletable(
        {
          'class': 'form-row',
          'text': '# ' + id,
          'value': id
        },
        {
          'onClick': function(id) {
            events.onClick(id);
          },
          'onDelete': function(id) {
            self.datasets.remove(id);
            events.onDelete(id);
          },
          'onAdd': function(id) {
            events.onAdd(id);
          }
        }
      );
      let container = datasets[id].elements().container;
      mapping[id] = container;
      elements.container.append(container);
    },
    'remove': function(id) {
      datasets[id] = undefined;
      mapping[id] = undefined;
    },
    'statusOf': function(id, value) {
      if (typeof value !== 'undefined') datasets[id].elements().status.value(value);
    },
    'styleOf': function(id, value) {
      if (typeof value !== 'undefined') datasets[id].elements().link.attr('style', value);
    }
  };

  // scroll ot dataset position
  let scrollTo = function(id) {
    let position = mapping[id].position().top + elements.container.parent().scrollTop() - 14;
    return elements.container.parent().animate({ scrollTop: position });
  };

  self.select = function(id) {
    elements.container.find('.selected').removeClass('selected');
    mapping[id].addClass('selected');
    scrollTo(id);
  };

  self.add = function(id, style, status) {
    self.datasets.add(id);
    self.datasets.statusOf(id, status);
    self.datasets.styleOf(id, style);
  };

  self.init = function(id, styles, status) {
    jQuery(id)
      .empty()
      .append(elements.container);
    for (let key in data) {
      self.datasets.add(data[key].id);
      self.datasets.statusOf(datasets[key].value(), status[key]);
      self.datasets.styleOf(datasets[key].value(), styles[key]);
    }
  };

  return self;
};
