const DatasetForm = function(events) {
  let self = this;

  self.dataset = {};
  self.dataTypes = {};

  let elements = {
    'container': HtmlBuilder.div({ 'id': '', 'class': 'container-fluid', 'text': '' }),
    'save': new View.buttons.save('Save Dataset'),
    'dataset.status': new View.status.edition('dataset.status'),
    'dataset.id': new View.properties.uneditable.text({
      'id': 'dataset.id',
      'key': 'DataSet',
      'value': ''
    }, {}),
    'dataset.confidence': new View.properties.uneditable.text({
      'id': 'dataset.confidence',
      'key': 'Confidence : ',
      'value': ''
    }, {}),
    'dataset.dataType': new View.properties.editable.select({
      'id': 'dataset.dataType',
      'key': 'Data type : ',
      'value': '',
      'options': []
    }, {
      'onEdit': function(element) {},
      'onSave': function(element) {
        elements['dataset.status'].modified();
        self.dataset.dataType = element.value();
        elements['dataset.descritpion'].value(self.dataTypes[self.dataset.dataType].descritpion);
        elements['dataset.bestDataFormatForSharing'].value(self.dataTypes[self.dataset.dataType].bestDataFormatForSharing);
        elements['dataset.mostSuitableRepositories'].value(self.dataTypes[self.dataset.dataType].mostSuitableRepositories);
        events.onChange(element);
      },
      'onCancel': function(element) {},
      'onChange': function(element) {
        elements['dataset.status'].modified();
        self.dataset.dataType = element.value();
        elements['dataset.descritpion'].value(self.dataTypes[self.dataset.dataType].descritpion);
        elements['dataset.bestDataFormatForSharing'].value(self.dataTypes[self.dataset.dataType].bestDataFormatForSharing);
        elements['dataset.mostSuitableRepositories'].value(self.dataTypes[self.dataset.dataType].mostSuitableRepositories);
        events.onChange(element);
      }
    }),
    'dataset.descritpion': new View.properties.uneditable.text({
      'id': 'dataset.descritpion',
      'key': 'Description : ',
      'value': ''
    }, {}),
    'dataset.bestDataFormatForSharing': new View.properties.uneditable.text({
      'id': 'dataset.bestDataFormatForSharing',
      'key': 'Best data format for sharing : ',
      'value': ''
    }, {}),
    'dataset.mostSuitableRepositories': new View.properties.uneditable.text({
      'id': 'dataset.mostSuitableRepositories',
      'key': 'Most suitable Repositories : ',
      'value': ''
    }, {}),
    'dataset.name': new View.properties.editable.text({
      'id': 'dataset.name',
      'key': 'Please provide a name for this dataset (e.g. \'heart pressure data\') : ',
      'value': '',
      'placeholder': 'n/a'
    }, {
      'onEdit': function(element) {},
      'onSave': function(element) {
        elements['dataset.status'].modified();
        self.dataset.name = element.value();
      },
      'onCancel': function(element) {},
      'onChange': function(element) {
        elements['dataset.status'].modified();
        self.dataset.name = element.value();
        events.onChange(element);
      }
    }),
    'dataset.DOI': new View.properties.editable.text({
      'id': 'dataset.DOI',
      'key': 'Please provide the DOI (or other stable link) to this dataset : ',
      'value': '',
      'placeholder': 'n/a'
    }, {
      'onEdit': function(element) {},
      'onSave': function(element) {
        elements['dataset.status'].modified();
        self.dataset.DOI = element.value();
      },
      'onCancel': function(element) {},
      'onChange': function(element) {
        elements['dataset.status'].modified();
        self.dataset.DOI = element.value();
        events.onChange(element);
      }
    }),
    'dataset.comments': new View.properties.editable.textarea({
      'id': 'dataset.comments',
      'key': 'Please enter any comments here (such as a reason why this dataset cannot be shared) : ',
      'value': '',
      'rows': 3,
      'placeholder': 'n/a'
    }, {
      'onChange': function(element) {
        elements['dataset.status'].modified();
        self.dataset.comments = element.value();
        events.onChange(element);
      }
    })
  };

  // Add all inputs
  elements.container
    .append(View.forms.row().append(elements['dataset.id'].elements().container).append(elements['dataset.status'].elements().container))
    .append(View.forms.row().append(elements['dataset.confidence'].elements().container))
    .append(View.forms.row().append(elements['dataset.dataType'].elements().container))
    .append(View.forms.row().append(elements['dataset.descritpion'].elements().container))
    .append(View.forms.row().append(elements['dataset.bestDataFormatForSharing'].elements().container))
    .append(View.forms.row().append(elements['dataset.mostSuitableRepositories'].elements().container))
    .append(View.forms.row().append(elements['dataset.name'].elements().container))
    .append(View.forms.row().append(elements['dataset.DOI'].elements().container))
    .append(View.forms.row().append(elements['dataset.comments'].elements().container))
    .append(View.forms.row().append(elements['save']));

  self.id = function() {
    if (typeof value === 'undefined') return elements['dataset.id'].value();
  };

  self.init = function(id) {
    $(id).empty().append(elements.container);
    elements['dataset.id'].view();
    elements['dataset.confidence'].view();
    elements['dataset.dataType'].edit(false);
    elements['dataset.descritpion'].view();
    elements['dataset.bestDataFormatForSharing'].view();
    elements['dataset.mostSuitableRepositories'].view();
    elements['dataset.name'].edit(false);
    elements['dataset.DOI'].edit(false);
    elements['dataset.comments'].view();

    elements['dataset.id'].elements().data.click(function() {
      events.onIdClick();
    });

    elements.save.click(function() {
      self.dataset = self.values();
      events.onValid(self.dataset);
    });
  };

  self.style = function(style) {
    elements['dataset.id'].elements().data.attr('style', style);
  };

  self.elements = function() {
    return elements;
  };

  self.values = function(dataset) {
    if (typeof dataset === 'undefined') return {
      'dataset.status': elements['dataset.status'].value(),
      'dataset.id': elements['dataset.id'].value(),
      'dataset.confidence': elements['dataset.confidence'].value(),
      'dataset.dataType': elements['dataset.dataType'].value(),
      'dataset.descritpion': elements['dataset.descritpion'].value(),
      'dataset.bestDataFormatForSharing': elements['dataset.bestDataFormatForSharing'].value(),
      'dataset.mostSuitableRepositories': elements['dataset.mostSuitableRepositories'].value(),
      'dataset.name': elements['dataset.name'].value(),
      'dataset.DOI': elements['dataset.DOI'].value(),
      'dataset.comments': elements['dataset.comments'].value()
    };
    elements['dataset.status'].value(dataset.status);
    elements['dataset.id'].value(dataset.id);
    elements['dataset.confidence'].value(dataset.confidence);
    elements['dataset.dataType'].value(dataset.dataType);
    elements['dataset.descritpion'].value(dataset.descritpion);
    elements['dataset.bestDataFormatForSharing'].value(dataset.bestDataFormatForSharing);
    elements['dataset.mostSuitableRepositories'].value(dataset.mostSuitableRepositories);
    elements['dataset.name'].value(dataset.name);
    elements['dataset.DOI'].value(dataset.DOI);
    elements['dataset.comments'].value(dataset.comments);
    return self.values();
  };

  self.link = function(dataset, style) {
    self.style(style);
    self.dataset = dataset;
    self.values(dataset);
    self.init();
  };

  self.setDataTypes = function(dataTypes) {
    self.dataTypes = dataTypes;
    let options = [];
    for (let key in dataTypes) {
      options.push({
        'value': key,
        'text': key
      });
    }
    elements['dataset.dataType'].options(options);
  };

  return self;
};