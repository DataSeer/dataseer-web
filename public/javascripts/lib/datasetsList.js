/*
 * @prettier
 */

const DatasetsList = function(data, events) {
  let datasets = {};

  let elements = {
      'container': HtmlBuilder.div({ 'id': '', 'class': '', 'text': '' }),
      'datasetsList': HtmlBuilder.ul({ 'id': 'datasetsListItems', 'class': '', 'text': '' }),
      'newDataset': HtmlBuilder.div({ 'id': 'newDataset', 'class': '', 'text': '' })
    },
    mapping = {};

  self.datasets = {
    'add': function(id) {
      datasets[id] = new View.links.static(
        {
          'class': 'form-row',
          'text': id,
          'value': id,
          'style': ''
        },
        {
          'onClick': function(id) {
            events.onClick(id);
          },
          'onDelete': function(id) {
            events.onDelete(id);
          },
          'onLink': function(id) {
            events.onLink(id);
          }
        }
      );
      let _elements = datasets[id].elements(),
        container = _elements.container;
      mapping[id] = container;
      _elements.link.attr('title', 'Link selected sentence to this dataset');
      elements.datasetsList.append(container);
    },
    'remove': function(id) {
      datasets[id].delete();
      datasets[id] = undefined;
      mapping[id] = undefined;
    },
    'statusOf': function(id, value) {
      if (typeof value !== 'undefined') datasets[id].elements().status.value(value);
    },
    'styleOf': function(id, value) {
      if (typeof value !== 'undefined') datasets[id].elements().data.attr('style', value);
    }
  };

  // scroll ot dataset position
  let scrollTo = function(id) {
    let position = mapping[id].position().top + elements.container.parent().scrollTop() - 14;
    return elements.container.parent().animate({ scrollTop: position });
  };

  // Add all elements
  elements.container.append(elements.datasetsList);
  elements.container.append(elements.newDataset);
  elements.newDataset.append(new View.buttons.add('Add new Dataset'));

  elements.newDataset.find('button').click(function() {
    events.onNewDataset();
  });

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
    // Add all inputs
    for (let key in data) {
      self.datasets.add(data[key].id);
      self.datasets.statusOf(datasets[key].value(), status[key]);
      self.datasets.styleOf(datasets[key].value(), styles[key]);
    }
  };

  return self;
};
