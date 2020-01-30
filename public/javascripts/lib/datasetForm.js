/*
 * @prettier
 */
const DatasetForm = function(events) {
  let self = this;

  self.selectedElement = undefined;
  self.dataset = {};
  self.dataTypes = {};
  self.metadata = {};

  let elements = {
    'container': HtmlBuilder.div({
      'id': '',
      'class': 'container-fluid',
      'text': ''
    }),
    'save': new View.buttons.save('Save for later '),
    'validation': new View.buttons.default('Validate'),
    'help': new View.buttons.help('Help'),
    'unlink': new View.buttons.unlink(),
    'dataset.status': new View.status.edition('dataset.status'),
    'dataset.id': new View.properties.uneditable.text(
      {
        'id': 'dataset.id',
        'key': 'DataSet',
        'value': ''
      },
      {}
    ),
    'dataset.cert': new View.properties.uneditable.text(
      {
        'id': 'dataset.cert',
        'key': 'cert : ',
        'value': ''
      },
      {}
    ),
    'dataset.dataType': new View.properties.editable.select(
      {
        'id': 'dataset.dataType',
        'key': 'Data type : ',
        'value': '',
        'options': []
      },
      {
        'onEdit': function(element) {},
        'onSave': function(element) {
          elements['dataset.status'].modified();
          self.dataset.status = elements['dataset.status'].value();
          self.dataset.dataType = elements['dataset.dataType'].value();
          self.setSubTypes(self.dataTypes[self.dataset.dataType]);
          if (typeof self.metadata[self.dataset.dataType] !== 'undefined') {
            elements['dataset.mostSuitableRepositories'].help({
              'href': encodeURI(self.metadata[self.dataset.dataType].url)
            });
            elements['dataset.description'].value(
              self.metadata[self.dataset.dataType].description ? self.metadata[self.dataset.dataType].description : ''
            );
            elements['dataset.bestDataFormatForSharing'].value(
              self.metadata[self.dataset.dataType].bestDataFormatForSharing
                ? self.metadata[self.dataset.dataType].bestDataFormatForSharing
                : ''
            );
            elements['dataset.mostSuitableRepositories'].value(
              self.metadata[self.dataset.dataType].mostSuitableRepositories
                ? self.metadata[self.dataset.dataType].mostSuitableRepositories
                : ''
            );
          } else {
            elements['dataset.mostSuitableRepositories'].help({
              'href': 'http://wiki.dataseer.io/doku.php'
            });
            elements['dataset.description'].value('');
            elements['dataset.bestDataFormatForSharing'].value('');
            elements['dataset.mostSuitableRepositories'].value('');
          }
          self.dataset.description = elements['dataset.description'].value();
          self.dataset.bestDataFormatForSharing = elements['dataset.bestDataFormatForSharing'].value();
          self.dataset.mostSuitableRepositories = elements['dataset.mostSuitableRepositories'].value();
          events.onSave(element);
        },
        'onCancel': function(element) {},
        'onChange': function(element) {
          elements['dataset.status'].modified();
          self.dataset.status = elements['dataset.status'].value();
          self.dataset.dataType = elements['dataset.dataType'].value();
          self.setSubTypes(self.dataTypes[self.dataset.dataType]);
          if (typeof self.metadata[self.dataset.dataType] !== 'undefined') {
            elements['dataset.mostSuitableRepositories'].help({
              'href': encodeURI(self.metadata[self.dataset.dataType].url)
            });
            elements['dataset.description'].value(
              self.metadata[self.dataset.dataType].description ? self.metadata[self.dataset.dataType].description : ''
            );
            elements['dataset.bestDataFormatForSharing'].value(
              self.metadata[self.dataset.dataType].bestDataFormatForSharing
                ? self.metadata[self.dataset.dataType].bestDataFormatForSharing
                : ''
            );
            elements['dataset.mostSuitableRepositories'].value(
              self.metadata[self.dataset.dataType].mostSuitableRepositories
                ? self.metadata[self.dataset.dataType].mostSuitableRepositories
                : ''
            );
          } else {
            elements['dataset.mostSuitableRepositories'].help({
              'href': 'http://wiki.dataseer.io/doku.php'
            });
            elements['dataset.description'].value('');
            elements['dataset.bestDataFormatForSharing'].value('');
            elements['dataset.mostSuitableRepositories'].value('');
          }
          self.dataset.description = elements['dataset.description'].value();
          self.dataset.bestDataFormatForSharing = elements['dataset.bestDataFormatForSharing'].value();
          self.dataset.mostSuitableRepositories = elements['dataset.mostSuitableRepositories'].value();
          events.onChange(element);
        }
      }
    ),
    'dataset.subType': new View.properties.editable.select(
      {
        'id': 'dataset.subType',
        'key': 'Sub type : ',
        'value': '',
        'options': []
      },
      {
        'onEdit': function(element) {},
        'onSave': function(element) {
          elements['dataset.status'].modified();
          self.dataset.status = elements['dataset.status'].value();
          self.dataset.subType = elements['dataset.subType'].value();
          if (typeof self.metadata[self.dataset.subType] !== 'undefined') {
            elements['dataset.mostSuitableRepositories'].help({
              'href': encodeURI(self.metadata[self.dataset.subType].url)
            });
            elements['dataset.description'].value(
              self.metadata[self.dataset.subType].description ? self.metadata[self.dataset.subType].description : ''
            );
            elements['dataset.bestDataFormatForSharing'].value(
              self.metadata[self.dataset.subType].bestDataFormatForSharing
                ? self.metadata[self.dataset.subType].bestDataFormatForSharing
                : ''
            );
            elements['dataset.mostSuitableRepositories'].value(
              self.metadata[self.dataset.subType].mostSuitableRepositories
                ? self.metadata[self.dataset.subType].mostSuitableRepositories
                : ''
            );
          } else if (typeof self.metadata[self.dataset.dataType] !== 'undefined') {
            elements['dataset.mostSuitableRepositories'].help({
              'href': encodeURI(self.metadata[self.dataset.dataType].url)
            });
            elements['dataset.description'].value(
              self.metadata[self.dataset.dataType].description ? self.metadata[self.dataset.dataType].description : ''
            );
            elements['dataset.bestDataFormatForSharing'].value(
              self.metadata[self.dataset.dataType].bestDataFormatForSharing
                ? self.metadata[self.dataset.dataType].bestDataFormatForSharing
                : ''
            );
            elements['dataset.mostSuitableRepositories'].value(
              self.metadata[self.dataset.dataType].mostSuitableRepositories
                ? self.metadata[self.dataset.dataType].mostSuitableRepositories
                : ''
            );
          } else {
            elements['dataset.mostSuitableRepositories'].help({
              'href': 'http://wiki.dataseer.io/doku.php'
            });
            elements['dataset.description'].value('');
            elements['dataset.bestDataFormatForSharing'].value('');
            elements['dataset.mostSuitableRepositories'].value('');
          }
          self.dataset.description = elements['dataset.description'].value();
          self.dataset.bestDataFormatForSharing = elements['dataset.bestDataFormatForSharing'].value();
          self.dataset.mostSuitableRepositories = elements['dataset.mostSuitableRepositories'].value();
          events.onSave(element);
        },
        'onCancel': function(element) {},
        'onChange': function(element) {
          elements['dataset.status'].modified();
          self.dataset.status = elements['dataset.status'].value();
          self.dataset.subType = elements['dataset.subType'].value();
          if (typeof self.metadata[self.dataset.subType] !== 'undefined') {
            elements['dataset.mostSuitableRepositories'].help({
              'href': encodeURI(self.metadata[self.dataset.subType].url)
            });
            elements['dataset.description'].value(
              self.metadata[self.dataset.subType].description ? self.metadata[self.dataset.subType].description : ''
            );
            elements['dataset.bestDataFormatForSharing'].value(
              self.metadata[self.dataset.subType].bestDataFormatForSharing
                ? self.metadata[self.dataset.subType].bestDataFormatForSharing
                : ''
            );
            elements['dataset.mostSuitableRepositories'].value(
              self.metadata[self.dataset.subType].mostSuitableRepositories
                ? self.metadata[self.dataset.subType].mostSuitableRepositories
                : ''
            );
          } else if (typeof self.metadata[self.dataset.dataType] !== 'undefined') {
            elements['dataset.mostSuitableRepositories'].help({
              'href': encodeURI(self.metadata[self.dataset.dataType].url)
            });
            elements['dataset.description'].value(
              self.metadata[self.dataset.dataType].description ? self.metadata[self.dataset.dataType].description : ''
            );
            elements['dataset.bestDataFormatForSharing'].value(
              self.metadata[self.dataset.dataType].bestDataFormatForSharing
                ? self.metadata[self.dataset.dataType].bestDataFormatForSharing
                : ''
            );
            elements['dataset.mostSuitableRepositories'].value(
              self.metadata[self.dataset.dataType].mostSuitableRepositories
                ? self.metadata[self.dataset.dataType].mostSuitableRepositories
                : ''
            );
          } else {
            elements['dataset.description'].value('');
            elements['dataset.bestDataFormatForSharing'].value('');
            elements['dataset.mostSuitableRepositories'].value('');
          }
          self.dataset.description = elements['dataset.description'].value();
          self.dataset.bestDataFormatForSharing = elements['dataset.bestDataFormatForSharing'].value();
          self.dataset.mostSuitableRepositories = elements['dataset.mostSuitableRepositories'].value();
          events.onChange(element);
        }
      }
    ),
    'dataset.description': new View.properties.uneditable.text(
      {
        'id': 'dataset.description',
        'key': 'Description : ',
        'value': ''
      },
      {}
    ),
    'dataset.bestDataFormatForSharing': new View.properties.uneditable.text(
      {
        'id': 'dataset.bestDataFormatForSharing',
        'key': 'Best data format for sharing : ',
        'value': ''
      },
      {}
    ),
    'dataset.mostSuitableRepositories': new View.properties.uneditable.text(
      {
        'id': 'dataset.mostSuitableRepositories',
        'key': 'Most suitable Repositories : ',
        'value': '',
        'help': {
          'title': 'If you disagree with this information, please edit the Dataseer Wiki available at: ',
          'href': 'http://wiki.dataseer.io/doku.php',
          'text': '?'
        }
      },
      {}
    ),
    'dataset.name': new View.properties.editable.text(
      {
        'id': 'dataset.name',
        'key': "Please provide a name for this dataset (e.g. 'heart pressure data') : ",
        'value': '',
        'placeholder': 'n/a'
      },
      {
        'onEdit': function(element) {},
        'onSave': function(element) {
          elements['dataset.status'].modified();
          self.dataset.status = elements['dataset.status'].value();
          self.dataset.name = element.value();
        },
        'onCancel': function(element) {},
        'onChange': function(element) {
          elements['dataset.status'].modified();
          self.dataset.status = elements['dataset.status'].value();
          self.dataset.name = element.value();
          events.onChange(element);
        }
      }
    ),
    'dataset.DOI': new View.properties.editable.text(
      {
        'id': 'dataset.DOI',
        'key': 'Please provide the DOI (or other stable link) to this dataset : ',
        'value': '',
        'placeholder': 'n/a'
      },
      {
        'onEdit': function(element) {},
        'onSave': function(element) {
          elements['dataset.status'].modified();
          self.dataset.status = elements['dataset.status'].value();
          self.dataset.DOI = element.value();
        },
        'onCancel': function(element) {},
        'onChange': function(element) {
          elements['dataset.status'].modified();
          self.dataset.status = elements['dataset.status'].value();
          self.dataset.DOI = element.value();
          events.onChange(element);
        }
      }
    ),
    'dataset.comments': new View.properties.editable.textarea(
      {
        'id': 'dataset.comments',
        'key': 'Please enter any comments here (such as a reason why this dataset cannot be shared) : ',
        'value': '',
        'rows': 3,
        'placeholder': 'n/a'
      },
      {
        'onChange': function(element) {
          elements['dataset.status'].modified();
          self.dataset.status = elements['dataset.status'].value();
          self.dataset.comments = element.value();
          events.onChange(element);
        }
      }
    )
  };

  // Add all inputs
  elements.container
    .append(
      View.forms
        .row()
        .append(elements['dataset.id'].elements().container)
        .append(elements['dataset.status'].elements().container)
        .append(elements['unlink'])
    )
    .append(View.forms.row().append(elements['dataset.cert'].elements().container))
    .append(View.forms.row().append(elements['dataset.dataType'].elements().container))
    .append(View.forms.row().append(elements['dataset.subType'].elements().container))
    .append(View.forms.row().append(elements['dataset.description'].elements().container))
    .append(View.forms.row().append(elements['dataset.bestDataFormatForSharing'].elements().container))
    .append(View.forms.row().append(elements['dataset.mostSuitableRepositories'].elements().container))
    .append(View.forms.row().append(elements['dataset.name'].elements().container))
    .append(View.forms.row().append(elements['dataset.DOI'].elements().container))
    .append(View.forms.row().append(elements['dataset.comments'].elements().container))
    .append(
      View.forms
        .row()
        .addClass('buttons-container')
        .append(elements['save'])
        .append(elements['validation'])
        .append(elements['help'])
    );

  elements.unlink.click(function() {
    events.onUnlink(self.selectedElement);
  });

  elements.unlink.attr('title', 'Unlink selected sentence to this dataset');

  elements.save.click(function() {
    self.dataset = self.values();
    events.onSave(self.dataset);
  });

  elements.validation.click(function() {
    self.dataset = self.values();
    events.onValidation(self.dataset);
  });

  elements['dataset.id'].elements().data.click(function() {
    events.onIdClick(elements['dataset.id'].value());
  });

  self.id = function() {
    if (typeof value === 'undefined') return elements['dataset.id'].value();
  };

  self.init = function(id) {
    jQuery(id)
      .empty()
      .append(elements.container);
    self.refresh();
  };

  self.refresh = function(options) {
    if (typeof options !== 'undefined') {
      if (typeof options.unlink !== 'undefined') options.unlink ? elements['unlink'].show() : elements['unlink'].hide();
    }
    if (typeof self.dataset.dataType !== 'undefined' || typeof self.dataset.subType !== 'undefined') {
      let param =
        typeof self.dataset.subType !== 'undefined' && self.dataset.subType !== ''
          ? self.dataset.subType
          : self.dataset.dataType;
      elements['dataset.mostSuitableRepositories'].help({
        'href': encodeURI(self.metadata[param].url)
      });
    }
    elements['dataset.id'].view();
    elements['dataset.cert'].view();
    let certValue = parseFloat(elements['dataset.cert'].value());
    if (certValue === 0.0)
      elements['dataset.cert']
        .elements()
        .container.parent()
        .hide();
    else
      elements['dataset.cert']
        .elements()
        .container.parent()
        .show();
    elements['dataset.dataType'].edit(false);
    elements['dataset.subType'].edit(false);
    elements['dataset.description'].view();
    elements['dataset.bestDataFormatForSharing'].view();
    elements['dataset.mostSuitableRepositories'].view();
    elements['dataset.name'].edit(false);
    elements['dataset.DOI'].edit(false);
    elements['dataset.comments'].view();
  };

  self.style = function(style) {
    elements['dataset.id'].elements().data.attr('style', style);
  };

  self.elements = function() {
    return elements;
  };

  self.values = function(dataset) {
    if (typeof dataset === 'undefined')
      return {
        'dataset.status': elements['dataset.status'].value(),
        'dataset.id': elements['dataset.id'].value(),
        'dataset.cert': elements['dataset.cert'].value(),
        'dataset.dataType': elements['dataset.dataType'].value(),
        'dataset.subType': elements['dataset.subType'].value(),
        'dataset.description': elements['dataset.description'].value(),
        'dataset.bestDataFormatForSharing': elements['dataset.bestDataFormatForSharing'].value(),
        'dataset.mostSuitableRepositories': elements['dataset.mostSuitableRepositories'].value(),
        'dataset.name': elements['dataset.name'].value(),
        'dataset.DOI': elements['dataset.DOI'].value(),
        'dataset.comments': elements['dataset.comments'].value()
      };
    elements['dataset.status'].value(dataset.status);
    elements['dataset.id'].value(dataset.id);
    elements['dataset.cert'].value(parseFloat(dataset.cert).toFixed(4));
    elements['dataset.dataType'].value(dataset.dataType);
    elements['dataset.subType'].value(dataset.subType);
    elements['dataset.description'].value(dataset.description);
    elements['dataset.bestDataFormatForSharing'].value(dataset.bestDataFormatForSharing);
    elements['dataset.mostSuitableRepositories'].value(dataset.mostSuitableRepositories);
    elements['dataset.name'].value(dataset.name);
    elements['dataset.DOI'].value(dataset.DOI);
    elements['dataset.comments'].value(dataset.comments);
    return self.values();
  };

  self.link = function(dataset, style, element) {
    self.style(style);
    self.dataset = dataset;
    self.setSubTypes(self.dataTypes[dataset.dataType]);
    self.values(dataset);
    self.selectedElement = element;
    self.refresh({
      'unlink':
        typeof self.selectedElement !== 'undefined' && typeof self.selectedElement.attr('corresp') !== 'undefined'
    });
  };

  self.loadData = function(data) {
    self.dataTypes = data.dataTypes;
    self.metadata = data.metadata;
    let options = [];
    for (let key in self.dataTypes) {
      options.push({
        'value': key,
        'text': key
      });
    }
    options.sort(function(a, b) {
      if (self.metadata[a.value].count < self.metadata[b.value].count) return 1;
      else if (self.metadata[a.value].count > self.metadata[b.value].count) return -1;
      else return 0;
    });
    elements['dataset.dataType'].options(options);
  };

  self.setSubTypes = function(subTypes) {
    let options = [];
    for (var i = 0; i < subTypes.length; i++) {
      options.push({
        'value': subTypes[i],
        'text': subTypes[i]
      });
    }
    options.sort(function(a, b) {
      if (self.metadata[a.value].count < self.metadata[b.value].count) return 1;
      else if (self.metadata[a.value].count > self.metadata[b.value].count) return -1;
      else return 0;
    });
    options.unshift({
      'value': '',
      'text': 'None'
    });
    elements['dataset.subType'].options(options);
  };

  return self;
};
