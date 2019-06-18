const DatasetsList = function(data, events) {
  let datasets = {};

  let elements = {
    'container': HtmlBuilder.div({ 'id': '', 'class': 'container-fluid', 'text': '' })
  };

  self.datasets = {
    'add': function(id) {
      datasets[id] = new View.links.deletable(
        {
          'class': 'form-row',
          'text': 'Dataset ' + id,
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
      elements.container.append(datasets[id].elements().container);
    },
    'remove': function(id) {
      datasets[id] = undefined;
    },
    'statusOf': function(id, value) {
      if (typeof value !== 'undefined') datasets[id].elements().status.value(value);
    },
    'styleOf': function(id, value) {
      if (typeof value !== 'undefined') datasets[id].elements().link.attr('style', value);
    }
  };

  self.add = function(id, style, status) {
    self.datasets.add(id);
    self.datasets.statusOf(id, status);
    self.datasets.styleOf(id, style);
  };

  self.init = function(id, styles, status) {
    $(id)
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
