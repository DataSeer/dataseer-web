/*
 * @prettier
 */

'use strict';

const DatasetForm = function (events, isCurator) {
  let self = this;

  self.selectedElement = undefined;
  self.dataset = {};
  self.dataTypes = {};
  self.metadata = {};

  let elements = {
    container: HtmlBuilder.div({
      id: 'dataset-form-form',
      class: 'container-fluid',
      text: ''
    }),
    lock: HtmlBuilder.div({
      id: 'dataset-form-lock',
      class: 'container-fluid lock',
      text: 'At least one dataset must be added to be able to use this form'
    }),
    save: new View.buttons.save('Save for later'),
    validation: new View.buttons.check('Done with this Dataset'),
    help: new View.buttons.help('Help'),
    unlink: new View.buttons.unlink(),
    'dataset.status': new View.status.edition('dataset.status'),
    'dataset.id': new View.properties.uneditable.text(
      {
        id: 'dataset.id',
        key: 'DataSet',
        value: ''
      },
      {}
    ),
    'dataset.cert': new View.properties.uneditable.text(
      {
        id: 'dataset.cert',
        key: 'cert: ',
        value: ''
      },
      {}
    ),
    'dataset.reuse': new View.properties.editable.checkbox(
      {
        id: 'dataset.reuse',
        key: 're-use: ',
        value: ''
      },
      {
        onChange: function (element) {
          elements['dataset.status'].modified();
          self.dataset.status = elements['dataset.status'].value();
          self.dataset.reuse = element.value();
          self.setDataFromDatatype();
          events.onChange(element);
        },
        onLeave: function () {
          events.onLeave();
        }
      }
    ),
    'dataset.customDataType': new View.properties.editable.text(
      {
        id: 'dataset.customDataType',
        key: 'Custom Data type: ',
        value: ''
      },
      {
        onEdit: function (element) {},
        onSave: function (element) {},
        onCancel: function (element) {},
        onChange: function (element) {
          elements['dataset.status'].modified();
          self.dataset.status = elements['dataset.status'].value();
          self.dataset.dataType = element.value();
          events.onChange(element);
        }
      }
    ),
    'dataset.dataType': new View.properties.editable.select(
      {
        id: 'dataset.dataType',
        key: 'Data type: ',
        value: '',
        options: []
      },
      {
        onEdit: function (element) {},
        onSave: function (element) {},
        onCancel: function (element) {},
        onChange: function (element) {
          elements['dataset.status'].modified();
          self.dataset.status = elements['dataset.status'].value();
          self.setDataType();
          events.onChange(element);
        }
      }
    ),
    'dataset.subType': new View.properties.editable.select(
      {
        id: 'dataset.subType',
        key: 'Sub type: ',
        value: '',
        options: []
      },
      {
        onEdit: function (element) {},
        onSave: function (element) {},
        onCancel: function (element) {},
        onChange: function (element) {
          elements['dataset.status'].modified();
          self.dataset.status = elements['dataset.status'].value();
          self.setSubType();
          events.onChange(element);
        }
      }
    ),
    'dataset.description': new View.properties.uneditable.text(
      {
        id: 'dataset.description',
        key: 'Description: ',
        value: ''
      },
      {}
    ),
    'dataset.bestDataFormatForSharing': new View.properties.uneditable.text(
      {
        id: 'dataset.bestDataFormatForSharing',
        key: 'Best data format for sharing: ',
        value: ''
      },
      {}
    ),
    'dataset.mostSuitableRepositories': new View.properties.uneditable.text(
      {
        id: 'dataset.mostSuitableRepositories',
        key: 'Most suitable Repositories: ',
        value: '',
        help: {
          title: 'If you disagree with this information, please edit the Dataseer Wiki available at: ',
          href: 'http://wiki.dataseer.ai/doku.php',
          text: '?'
        }
      },
      {}
    ),
    'dataset.name': new View.properties.editable.text(
      {
        id: 'dataset.name',
        key: "Please provide a name for this dataset (e.g. 'sampling locations'): ",
        value: '',
        placeholder: 'n/a'
      },
      {
        onEdit: function (element) {},
        onSave: function (element) {},
        onCancel: function (element) {},
        onChange: function (element) {
          elements['dataset.status'].modified();
          self.dataset.status = elements['dataset.status'].value();
          self.dataset.name = element.value();
          events.onChange(element);
        },
        onLeave: function () {
          events.onLeave();
        }
      }
    ),
    'dataset.highlight': new View.properties.editable.checkbox(
      {
        id: 'dataset.highlight',
        key: 'Highlight this dataset: ',
        value: ''
      },
      {
        onChange: function (element) {
          elements['dataset.status'].modified();
          self.dataset.status = elements['dataset.status'].value();
          self.dataset.highlight = element.value();
          events.onChange(element);
        },
        onLeave: function () {
          events.onLeave();
        }
      }
    ),
    'dataset.notification': new View.properties.editable.notification(
      {
        editable: isCurator,
        id: 'dataset.notification',
        key: 'Enter a message here (or leave it empty so nothing will be displayed): ',
        placeholder: 'Enter the message here or leave it empty',
        value: ''
      },
      {
        onChange: function (element) {
          elements['dataset.status'].modified();
          self.dataset.status = elements['dataset.status'].value();
          self.dataset.notification = element.value();
          events.onChange(element);
        },
        onLeave: function () {
          events.onLeave();
        }
      }
    ),
    'dataset.DOI': new View.properties.editable.text(
      {
        id: 'dataset.DOI',
        key: 'Please provide the DOI (or other stable link) to this dataset: ',
        value: '',
        placeholder: 'n/a'
      },
      {
        onEdit: function (element) {},
        onSave: function (element) {},
        onCancel: function (element) {},
        onChange: function (element) {
          elements['dataset.status'].modified();
          self.dataset.status = elements['dataset.status'].value();
          self.dataset.DOI = element.value();
          events.onChange(element);
        },
        onLeave: function () {
          events.onLeave();
        }
      }
    ),
    'dataset.comments': new View.properties.editable.textarea(
      {
        id: 'dataset.comments',
        key: 'Please enter any comments here (such as a reason why this dataset cannot be shared): ',
        value: '',
        rows: 3,
        placeholder: 'n/a'
      },
      {
        onChange: function (element) {
          elements['dataset.status'].modified();
          self.dataset.status = elements['dataset.status'].value();
          self.dataset.comments = element.value();
          events.onChange(element);
        },
        onLeave: function () {
          events.onLeave();
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
    // .append(View.forms.row().append(elements['dataset.cert'].elements().container)) // fix-161 : hide cert
    .append(View.forms.row().append(elements['dataset.reuse'].elements().container))
    .append(View.forms.row().append(elements['dataset.dataType'].elements().container))
    .append(View.forms.row().append(elements['dataset.subType'].elements().container))
    .append(View.forms.row().append(elements['dataset.customDataType'].elements().container))
    .append(View.forms.row().append(elements['dataset.description'].elements().container))
    .append(View.forms.row().append(elements['dataset.bestDataFormatForSharing'].elements().container))
    .append(View.forms.row().append(elements['dataset.mostSuitableRepositories'].elements().container))
    .append(View.forms.row().append(elements['dataset.highlight'].elements().container))
    .append(View.forms.row().append(elements['dataset.notification'].elements().container))
    .append(View.forms.row().append(elements['dataset.name'].elements().container))
    .append(View.forms.row().append(elements['dataset.DOI'].elements().container))
    .append(View.forms.row().append(elements['dataset.comments'].elements().container))
    .append(View.forms.row().addClass('buttons-container').append(elements['validation']))
    .append(elements['lock']);

  elements.unlink.click(function () {
    events.onUnlink(self.selectedElement);
  });

  elements.unlink.attr('title', 'Unlink selected sentence to this dataset');

  elements.save.click(function () {
    self.dataset = self.values();
    events.onSave(self.dataset);
  });

  elements.validation.click(function () {
    self.dataset = self.values();
    events.onValidation(self.dataset);
  });

  elements['dataset.id'].elements().data.click(function () {
    events.onIdClick(elements['dataset.id'].value());
  });

  self.id = function () {
    if (typeof value === 'undefined') return elements['dataset.id'].value();
  };

  self.getProperty = function (property) {
    return elements['dataset.' + property].value();
  };

  self.init = function (id) {
    jQuery(id).empty().append(elements.container).append(elements.lock);
    self.refresh();
    self.lock();
  };

  self.lock = function () {
    self.refresh();
    $('#dataset-form-form').hide();
    $('#dataset-form-lock').show();
  };

  self.unlock = function () {
    self.refresh();
    $('#dataset-form-form').show();
    $('#dataset-form-lock').hide();
  };

  self.refresh = function (options) {
    if (typeof options !== 'undefined') {
      if (typeof options.unlink !== 'undefined') options.unlink ? elements['unlink'].show() : elements['unlink'].hide();
    }
    if (typeof self.dataset.dataType !== 'undefined' || typeof self.dataset.subType !== 'undefined') {
      let param =
          typeof self.dataset.subType !== 'undefined' && self.dataset.subType !== ''
            ? self.dataset.subType
            : self.dataset.dataType,
        url =
          typeof self.metadata[param] !== 'undefined' ? self.metadata[param].url : 'http://wiki.dataseer.io/doku.php';
      elements['dataset.mostSuitableRepositories'].help({
        href: encodeURI(url)
      });
    }
    elements['dataset.id'].view();
    elements['dataset.cert'].view();
    elements['dataset.reuse'].view();
    let certValue = parseFloat(elements['dataset.cert'].value());
    if (certValue === 0.0) elements['dataset.cert'].elements().container.parent().hide();
    else elements['dataset.cert'].elements().container.parent().show();
    elements['dataset.dataType'].edit(false);
    elements['dataset.subType'].edit(false);
    elements['dataset.customDataType'].edit(false);
    elements['dataset.description'].view();
    elements['dataset.bestDataFormatForSharing'].view();
    elements['dataset.mostSuitableRepositories'].view();
    elements['dataset.name'].edit(false);
    if (isCurator) elements['dataset.highlight'].view();
    else elements['dataset.highlight'].elements().container.parent().hide();
    elements['dataset.notification'].view();
    if (!isCurator && !elements['dataset.notification'].value().length)
      elements['dataset.notification'].elements().container.parent().hide();
    else elements['dataset.notification'].elements().container.parent().show();
    elements['dataset.DOI'].edit(false);
    elements['dataset.comments'].view();
  };

  self.style = function (style) {
    elements['dataset.id'].elements().data.attr('style', style);
  };

  self.elements = function () {
    return elements;
  };

  self.refreshStatus = function (status) {
    elements['dataset.status'].value(status);
  };

  self.values = function (dataset) {
    if (typeof dataset === 'undefined') return self.dataset;
    self.dataset = dataset;
    elements['dataset.status'].value(dataset.status);
    elements['dataset.id'].value(dataset.id);
    elements['dataset.cert'].value(parseFloat(dataset.cert).toFixed(4));
    elements['dataset.reuse'].value(dataset.reuse);
    elements['dataset.dataType'].value(dataset.dataType);
    if (elements['dataset.dataType'].value() === '') {
      self.showCustomDataType();
      elements['dataset.customDataType'].value(dataset.dataType);
    } else self.hideCustomDataType();
    elements['dataset.subType'].value(dataset.subType);
    elements['dataset.name'].value(dataset.name);
    elements['dataset.notification'].value(dataset.notification);
    elements['dataset.highlight'].value(dataset.highlight);
    elements['dataset.DOI'].value(dataset.DOI);
    elements['dataset.comments'].value(dataset.comments);
    return self.values();
  };

  self.link = function (dataset, style, element) {
    self.unlock();
    self.style(style);
    self.dataset = dataset;
    self.selectedElement = element;
    self.setDataTypes();
    self.setSubTypes();
    self.values(dataset);
    self.setDataFromDatatype();
    self.setDataFromSubtype();
    self.refresh({
      unlink: typeof self.selectedElement !== 'undefined' && typeof self.selectedElement.attr('corresp') !== 'undefined'
    });
  };

  self.loadData = function (data) {
    self.dataTypes = data.dataTypes;
    self.metadata = data.metadata;
    self.setDataTypes();
    self.setSubTypes();
  };

  self.setDataTypes = function () {
    let options = [];
    for (let key in self.dataTypes) {
      options.push({
        value: key,
        text: self.metadata[key].label || key
      });
    }
    options.sort(function (a, b) {
      if (self.metadata[a.value].count < self.metadata[b.value].count) return 1;
      else if (self.metadata[a.value].count > self.metadata[b.value].count) return -1;
      else return 0;
    });
    options.unshift({
      value: '',
      text: 'None'
    });
    elements['dataset.dataType'].options(options);
  };

  self.setSubTypes = function () {
    let subTypes = self.dataTypes[self.dataset.dataType],
      options = [];
    if (Array.isArray(subTypes)) {
      for (var i = 0; i < subTypes.length; i++) {
        options.push({
          value: subTypes[i],
          text: self.metadata[subTypes[i]].label || subTypes[i]
        });
      }
      options.sort(function (a, b) {
        if (self.metadata[a.value].count < self.metadata[b.value].count) return 1;
        else if (self.metadata[a.value].count > self.metadata[b.value].count) return -1;
        else return 0;
      });
    }
    options.unshift({
      value: '',
      text: 'None'
    });
    elements['dataset.subType'].options(options);
    return true;
  };

  self.showCustomDataType = function () {
    return $('.form-row:has(#dataset\\.customDataType)').show();
  };

  self.hideCustomDataType = function () {
    elements['dataset.customDataType'].value('');
    return $('.form-row:has(#dataset\\.customDataType)').hide();
  };

  self.setDataType = function () {
    self.dataset.status = elements['dataset.status'].value();
    if (elements['dataset.dataType'].value() === '') {
      self.showCustomDataType();
      self.dataset.dataType = elements['dataset.customDataType'].value();
    } else {
      self.hideCustomDataType();
      self.dataset.dataType = elements['dataset.dataType'].value();
    }
    self.dataset.subType = '';
    self.setSubTypes();
    self.setDataFromDatatype();
  };

  self.setDataReUseAdvice = function () {
    if (self.dataset.reuse) {
      elements['dataset.mostSuitableRepositories'].help({
        href: encodeURI(self.metadata['dataset re-use'].url)
      });
      elements['dataset.description'].value(
        self.metadata['dataset re-use'].description ? self.metadata['dataset re-use'].description : ''
      );
      elements['dataset.bestDataFormatForSharing'].value(
        self.metadata['dataset re-use'].bestDataFormatForSharing
          ? self.metadata['dataset re-use'].bestDataFormatForSharing
          : ''
      );
      elements['dataset.mostSuitableRepositories'].value(
        self.metadata['dataset re-use'].mostSuitableRepositories
          ? self.metadata['dataset re-use'].mostSuitableRepositories
          : ''
      );
    }
    self.dataset.mostSuitableRepositories = elements['dataset.mostSuitableRepositories'].value();
    self.dataset.description = elements['dataset.description'].value();
    self.dataset.bestDataFormatForSharing = elements['dataset.bestDataFormatForSharing'].value();
    self.dataset.bestDataFormatForSharing = elements['dataset.bestDataFormatForSharing'].value();
  };

  self.setDataFromDatatype = function () {
    if (typeof self.metadata[self.dataset.dataType] !== 'undefined') {
      elements['dataset.mostSuitableRepositories'].help({
        href: encodeURI(self.metadata[self.dataset.dataType].url)
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
        href: 'http://wiki.dataseer.io/doku.php'
      });
      elements['dataset.description'].value('');
      elements['dataset.bestDataFormatForSharing'].value('');
      elements['dataset.mostSuitableRepositories'].value('');
    }
    self.dataset.description = elements['dataset.description'].value();
    self.dataset.bestDataFormatForSharing = elements['dataset.bestDataFormatForSharing'].value();
    self.dataset.mostSuitableRepositories = elements['dataset.mostSuitableRepositories'].value();
    self.setDataReUseAdvice();
  };

  self.setSubType = function () {
    self.dataset.status = elements['dataset.status'].value();
    self.dataset.subType = elements['dataset.subType'].value();
    if (!self.setDataFromSubtype()) self.setDataFromDatatype();
  };

  self.setDataFromSubtype = function () {
    if (typeof self.metadata[self.dataset.subType] !== 'undefined') {
      elements['dataset.mostSuitableRepositories'].help({
        href: encodeURI(self.metadata[self.dataset.subType].url)
      });
      elements['dataset.description'].value(
        self.metadata[self.dataset.subType].description
          ? self.metadata[self.dataset.subType].description
          : self.metadata[self.dataset.dataType].description
      );
      elements['dataset.bestDataFormatForSharing'].value(
        self.metadata[self.dataset.subType].bestDataFormatForSharing
          ? self.metadata[self.dataset.subType].bestDataFormatForSharing
          : self.metadata[self.dataset.dataType].bestDataFormatForSharing
      );
      elements['dataset.mostSuitableRepositories'].value(
        self.metadata[self.dataset.subType].mostSuitableRepositories
          ? self.metadata[self.dataset.subType].mostSuitableRepositories
          : self.metadata[self.dataset.dataType].mostSuitableRepositories
      );
    }
    self.dataset.description = elements['dataset.description'].value();
    self.dataset.bestDataFormatForSharing = elements['dataset.bestDataFormatForSharing'].value();
    self.dataset.mostSuitableRepositories = elements['dataset.mostSuitableRepositories'].value();
    self.setDataReUseAdvice();
  };

  return self;
};
