/*
 * @prettier
 */

const DatasetsList = function(data, events) {
  let datasets = {};

  let elements = {
      'container': HtmlBuilder.div({ 'id': '', 'class': 'datasetListContainer', 'text': '' }),
      'datasetsList': HtmlBuilder.div({ 'id': 'datasetsListItems', 'class': '', 'text': '' }),
      'datasetsListItemsContainer': HtmlBuilder.div({ 'id': 'datasetsListItemsContainer', 'class': '', 'text': '' }),
      'newDataset': HtmlBuilder.div({ 'id': 'newDataset', 'class': 'right', 'text': '' })
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
            scrollTo(id);
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
      let previous = elements.datasetsListItemsContainer.innerWidth();
      elements.datasetsListItemsContainer.append(container);
      let next = elements.datasetsListItemsContainer.find('.form-row:last').innerWidth() + 40;
      elements.datasetsListItemsContainer.innerWidth(previous + next);
      scrollTo(id);
    },
    'remove': function(id) {
      let previous = elements.datasetsListItemsContainer.innerWidth();
      elements.datasetsListItemsContainer.innerWidth(previous - (datasets[id].elements().container.innerWidth() + 40));
      scrollTo(id);
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
    let position = mapping[id].position().left;
    elements.datasetsList.animate({ scrollLeft: position });
  };

  // Add all elements
  elements.datasetsList.append(elements.datasetsListItemsContainer);
  elements.container.append(elements.datasetsList);
  elements.container.append(elements.newDataset);
  theButton = new View.buttons.add('Add new Dataset');
  theButton.attr('style', 'white-space: normal;');
  elements.newDataset.append(theButton);

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
