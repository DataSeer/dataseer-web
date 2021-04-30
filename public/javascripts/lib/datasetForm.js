/*
 * @prettier
 */

'use strict';

const DatasetForm = function (id = 'datasetForm', events = {}) {
  let self = this;
  this.id = id;
  this.container = $(`#${this.id} #datasetForm\\.container`); // container of datasetForm
  this.message = $(`#${this.id} #datasetForm\\.message`);
  this.resources = {
    metadata: {},
    dataTypes: {},
    subTypes: {}
  };
  this.defaultDataType = undefined; // will contain the default dataType
  this.dataset = {};
  this.events = events;
  // onDatasetIdClick
  $(`#${this.id} div[key="dataset\\.id"], #${this.id} div[key="dataset\\.label"]`)
    .parent()
    .click(function () {
      if (typeof self.events.onDatasetIdClick === 'function') return self.events.onDatasetIdClick(self.getDataset());
    });
  // onDatasetDoneClick
  $(`#${this.id} button[name="datasetForm\\.done"]`).click(function () {
    if (typeof self.events.onDatasetDoneClick === 'function') return self.events.onDatasetDoneClick(self.getDataset());
  });
  // onDatasetUnlinkClick
  $(`#${this.id} button[name="datasetForm\\.unlink"]`).click(function (event) {
    event.stopPropagation();
    if (typeof self.events.onDatasetUnlinkClick === 'function')
      return self.events.onDatasetUnlinkClick(self.getDataset());
  });
  // onRefreshDatatypesClick
  $(`#${this.id} button[name="datasetForm\\.refreshDatatypes"]`).click(function () {
    let el = $(this);
    if (el.attr('loading').toString() === 'false' && typeof self.events.onRefreshDatatypesClick === 'function') {
      el.attr('loading', true);
      el.find('i').addClass('fa-spin');
      return self.events.onRefreshDatatypesClick(function () {
        el.attr('loading', false);
        el.find('i').removeClass('fa-spin');
      });
    }
  });
  // input text event
  this.container.find('input[type="text"]').bind('input propertychange', function (event) {
    let el = $(this),
      target = el.attr('target').replace('dataset.', '');
    if (typeof self.properties[target] === 'function') {
      self.properties[target](el.val());
      if (typeof self.events.onPropertyChange === 'function')
        self.events.onPropertyChange(target, self.properties[target]());
    }
  });
  // input checkbox event
  this.container.find('input[type="checkbox"]').bind('input propertychange', function (event) {
    let el = $(this),
      target = el.attr('target').replace('dataset.', '');
    if (typeof self.properties[target] === 'function') {
      self.properties[target](el.prop('checked'));
      if (typeof self.events.onPropertyChange === 'function')
        self.events.onPropertyChange(target, self.properties[target]());
    }
  });
  // select event
  this.container.find('select').bind('input propertychange', function (event) {
    let el = $(this),
      option = el.find('option:selected'),
      target = el.attr('target').replace('dataset.', ''),
      value = option.attr('value');
    if (typeof self.properties[target] === 'function') {
      self.properties[target](value);
      if (typeof self.events.onPropertyChange === 'function')
        self.events.onPropertyChange(target, self.properties[target]());
    }
  });
  // textarea event
  this.container.find('textarea').bind('input propertychange', function (event) {
    let el = $(this),
      target = el.attr('target').replace('dataset.', '');
    if (typeof self.properties[target] === 'function') {
      self.properties[target](el.val());
      if (typeof self.events.onPropertyChange === 'function')
        self.events.onPropertyChange(target, self.properties[target]());
    }
  });
  // Set or get a property
  this.properties = {
    id: function (value, inputs = false) {
      if (typeof value === 'undefined') return self.dataset.id;
      self.container.find('div[key="dataset\\.id"]').attr('value', value).text(value);
      self.dataset.id = value;
      // input change behaviors
      self.updateLabel(value);
      // ----------------------
      return self.dataset.id;
    },
    status: function (value, inputs = false) {
      if (typeof value === 'undefined') return self.dataset.status;
      self.container
        .find('div[key="dataset\\.status"]')
        .attr('value', value)
        .empty()
        .append(self.getIconOfStatus(value));
      self.dataset.status = value;
      return self.dataset.status;
    },
    reuse: function (value, inputs = false) {
      if (typeof value === 'undefined') return self.dataset.reuse;
      let reuse = value === 'false' || value === false ? false : !!value;
      self.container.find('div[key="dataset\\.reuse"]').attr('value', reuse);
      if (inputs) self.container.find('input[type="checkbox"][name="datasetForm\\.reuse"]').prop('checked', reuse);
      self.dataset.reuse = reuse;
      // input change behaviors
      self.refreshDatatypeInfos(); // refresh dataType infos
      // ----------------------
      return self.dataset.reuse;
    },
    dataType: function (value, inputs = false) {
      if (typeof value === 'undefined') return self.dataset.dataType;
      self.container.find('div[key="dataset\\.dataType"]').attr('value', value);
      if (inputs)
        self.container.find(`select[name="datasetForm\\.dataType"] option[value="${value}"]`).prop('selected', true);
      self.dataset.dataType = value;
      // input change behaviors
      self.setSubtypes(); // set subtypes
      self.refreshDatatypeInfos(); // refresh dataType infos
      // ----------------------
      return self.dataset.dataType;
    },
    subType: function (value, inputs = false) {
      if (typeof value === 'undefined') return self.dataset.subType;
      self.container.find('div[key="dataset\\.subType"]').attr('value', value);
      if (inputs)
        self.container.find(`select[name="datasetForm\\.subType"] option[value="${value}"]`).prop('selected', true);
      self.dataset.subType = value;
      // input change behaviors
      self.refreshDatatypeInfos(); // refresh dataType infos
      // ----------------------
      return self.dataset.subType;
    },
    customDataType: function (value, inputs = false) {
      if (typeof value === 'undefined') return self.dataset.customDataType;
      self.container.find('div[key="dataset\\.customDataType"]').attr('value', value);
      if (inputs) self.container.find('input[type="text"][name="datasetForm\\.customDataType"]').val(value);
      self.dataset.customDataType = value;
      return self.dataset.customDataType;
    },
    description: function (value, inputs = false) {
      if (typeof value === 'undefined') return self.dataset.description;
      let text = value === '' ? 'n/a' : value;
      self.container.find('div[key="dataset\\.description"]').attr('value', value).html(text);
      self.dataset.description = value;
      return self.dataset.description;
    },
    bestDataFormatForSharing: function (value, inputs = false) {
      if (typeof value === 'undefined') return self.dataset.bestDataFormatForSharing;
      let text = value === '' ? 'n/a' : value;
      self.container.find('div[key="dataset\\.bestDataFormatForSharing"]').attr('value', value).html(text);
      self.dataset.bestDataFormatForSharing = value;
      return self.dataset.bestDataFormatForSharing;
    },
    url: function (value, inputs = false) {
      if (typeof value === 'undefined') return self.dataset.url;
      let data = value === '' ? 'http://wiki.dataseer.ai/doku.php' : value;
      self.container.find('a[key="dataset\\.url"]').attr('value', data).attr('href', data);
      self.dataset.url = data;
      return self.dataset.url;
    },
    mostSuitableRepositories: function (value, inputs = false) {
      if (typeof value === 'undefined') return self.dataset.mostSuitableRepositories;
      let text = value === '' ? 'n/a' : value;
      self.container.find('div[key="dataset\\.mostSuitableRepositories"]').attr('value', value).html(text);
      self.dataset.mostSuitableRepositories = value;
      return self.dataset.mostSuitableRepositories;
    },
    bestPracticeForIndicatingReUseOfExistingData: function (value, inputs = false) {
      if (typeof value === 'undefined') return self.dataset.bestPracticeForIndicatingReUseOfExistingData;
      let text = value === '' ? 'n/a' : value;
      self.container
        .find('div[key="dataset\\.bestPracticeForIndicatingReUseOfExistingData"]')
        .attr('value', value)
        .html(text);
      self.dataset.bestPracticeForIndicatingReUseOfExistingData = value;
      return self.dataset.bestPracticeForIndicatingReUseOfExistingData;
    },
    highlight: function (value, inputs = false) {
      if (typeof value === 'undefined') return self.dataset.highlight;
      let highlight = value === 'false' ? false : !!value;
      self.container.find('div[key="dataset\\.highlight"]').attr('value', highlight);
      if (inputs)
        self.container.find('input[type="checkbox"][name="datasetForm\\.highlight"]').prop('checked', highlight);
      self.dataset.highlight = highlight;
      return self.dataset.highlight;
    },
    notification: function (value, inputs = false) {
      if (typeof value === 'undefined') return self.dataset.notification;
      self.container.find('div[key="dataset\\.notification"]').attr('value', value).text(value);
      if (inputs) self.container.find('input[type="text"][name="datasetForm\\.notification"]').val(value);
      self.dataset.notification = value;
      // input change behaviors
      // Hide notification if empty, else show
      if (!self.dataset.notification) self.container.find('div[key="dataset\\.notification"]').hide();
      else self.container.find('div[key="dataset\\.notification"]').show();
      // ----------------------
      return self.dataset.notification;
    },
    name: function (value, inputs = false) {
      if (typeof value === 'undefined') return self.dataset.name;
      self.container.find('div[key="dataset\\.name"]').attr('value', value);
      if (inputs) self.container.find('input[type="text"][name="datasetForm\\.name"]').val(value);
      self.dataset.name = value;
      // input change behaviors
      self.updateLabel(value);
      // ----------------------
      return self.dataset.name;
    },
    DOI: function (value, inputs = false) {
      if (typeof value === 'undefined') return self.dataset.DOI;
      self.container.find('div[key="dataset\\.DOI"]').attr('value', value);
      if (inputs) self.container.find('input[type="text"][name="datasetForm\\.DOI"]').val(value);
      self.dataset.DOI = value;
      return self.dataset.DOI;
    },
    comments: function (value, inputs = false) {
      if (typeof value === 'undefined') return self.dataset.comments;
      self.container.find('div[key="dataset\\.comments"]').attr('value', value);
      if (inputs) self.container.find('textarea[name="datasetForm\\.comments"]').val(value);
      self.dataset.comments = value;
      return self.dataset.comments;
    }
  };
  this.setInitialazingMessage();
  return this;
};

// update label of dataset
DatasetForm.prototype.updateLabel = function (value = '') {
  let data = value ? value : this.dataset.id;
  // Update label
  this.container.find('div[key="dataset\\.label"]').attr('value', data).text(data);
};

// get current dataset id
DatasetForm.prototype.currentId = function () {
  return this.dataset.id;
};

// get current dataset (API formated)
DatasetForm.prototype.getDataset = function () {
  return {
    id: this.dataset.id,
    status: this.dataset.status,
    reuse: this.dataset.reuse,
    dataType: this.dataset.dataType ? this.dataset.dataType : this.dataset.customDataType,
    subType: this.dataset.subType,
    description: this.dataset.description,
    bestDataFormatForSharing: this.dataset.bestDataFormatForSharing,
    mostSuitableRepositories: this.dataset.mostSuitableRepositories,
    bestPracticeForIndicatingReUseOfExistingData: this.dataset.bestPracticeForIndicatingReUseOfExistingData,
    highlight: this.dataset.highlight,
    notification: this.dataset.notification,
    name: this.dataset.name,
    DOI: this.dataset.DOI,
    comments: this.dataset.comments
  };
};

// Attach event
DatasetForm.prototype.attach = function (event, fn) {
  this.events[event] = fn;
};

// Get resource property for an given dataType (or subType) id
DatasetForm.prototype.getResourceOf = function (id, key, subKey) {
  if (
    !id ||
    !key ||
    !this.resources ||
    !this.resources.metadata ||
    !this.resources.metadata[id] ||
    !this.resources.metadata[id][key]
  )
    return '';
  else {
    let result = subKey ? this.resources.metadata[id][key][subKey] : this.resources.metadata[id][key];
    return result ? result : '';
  }
};

// Extract some infos (based on resources)
DatasetForm.prototype.extractInfos = function (keys, properties) {
  let self = this,
    result = {};
  keys.map(function (key) {
    result[key] = {};
    properties.map(function (property) {
      if (typeof property === 'string') result[key][property] = self.getResourceOf(self.dataset[key], property);
      else if (typeof property === 'object')
        result[key][property.key] = self.getResourceOf(self.dataset[key], property.key, property.subKey);
    });
  });
  return result;
};

// Update dataType infos (based on resources)
DatasetForm.prototype.updateDatatypeInfos = function () {
  let self = this,
    hasChanged = false,
    properties = [
      'description',
      'bestDataFormatForSharing',
      'bestPracticeForIndicatingReUseOfExistingData',
      { key: 'mostSuitableRepositories', subKey: this.dataset.reuse ? 'reuse' : 'default' }
    ],
    keys = ['dataType', 'subType'],
    metadata = this.extractInfos(keys, properties);
  // Set dataType/subType infos
  let old = Object.assign({}, this.dataset);
  properties.map(function (property) {
    keys.map(function (key) {
      if (typeof property === 'string') {
        if (metadata[key][property] && self.dataset[property] !== metadata[key][property])
          self.dataset[property] = metadata[key][property];
      } else if (typeof property === 'object' && property.key) {
        if (metadata[key][property.key] && self.dataset[property.key] !== metadata[key][property.key])
          self.dataset[property.key] = metadata[key][property.key];
      }
    });
  });
  for (let property in this.dataset) {
    if (this.dataset[property] !== old[property]) hasChanged = true;
  }
  return hasChanged;
};

// Refresh dataType infos (based on resources)
DatasetForm.prototype.refreshDatatypeInfos = function () {
  let self = this,
    properties = [
      'description',
      'bestDataFormatForSharing',
      'bestPracticeForIndicatingReUseOfExistingData',
      { key: 'mostSuitableRepositories', subKey: this.dataset.reuse ? 'reuse' : 'default' },
      'url'
    ],
    keys = ['dataType', 'subType'],
    metadata = this.extractInfos(keys, properties);
  // Set dataType/subType infos
  properties.map(function (property) {
    keys.map(function (key) {
      if (typeof property === 'string')
        self.properties[property](metadata[key][property] ? metadata[key][property] : undefined);
      else if (typeof property === 'object' && property.key)
        self.properties[property.key](metadata[key][property.key] ? metadata[key][property.key] : undefined);
    });
  });
  if (this.dataset.reuse) {
    this.container.find('div[key="dataset\\.bestDataFormatForSharing"]').parent().hide();
    this.container.find('div[key="dataset\\.bestPracticeForIndicatingReUseOfExistingData"]').parent().show();
  } else {
    this.container.find('div[key="dataset\\.bestDataFormatForSharing"]').parent().show();
    this.container.find('div[key="dataset\\.bestPracticeForIndicatingReUseOfExistingData"]').parent().hide();
  }
};

// Build default options
DatasetForm.prototype.defaultOption = function () {
  return $('<option>').text('None').attr('value', '');
};

// Build options (datatypes)
DatasetForm.prototype.buildOptions = function (datatypes = []) {
  let options = [this.defaultOption()];
  for (let i = 0; i < datatypes.length; i++) {
    options.push($('<option>').text(datatypes[i].label).attr('value', datatypes[i].id));
  }
  return options;
};

// Load Resources
DatasetForm.prototype.loadResources = function (resources) {
  this.defaultDataType = Object.keys(resources.dataTypes).sort(function (a, b) {
    if (resources.metadata[a].count < resources.metadata[b].count) return 1;
    else if (resources.metadata[a].count > resources.metadata[b].count) return -1;
    else return 0;
  })[0];
  this.resources = resources;
  this.setDatatypes();
  this.setSubtypes();
  this.setEmptyMessage();
};

// refresh Datatype view
DatasetForm.prototype.refreshDatatypeView = function () {
  if (!this.dataset.dataType || (!this.dataset.dataType && !this.dataset.subType))
    this.container.find('div[key="dataset\\.customDataType"]').parent().show();
  else this.container.find('div[key="dataset\\.customDataType"]').parent().hide();
};

// Set dataTypes
DatasetForm.prototype.getOptionsInfo = function (ids = []) {
  let self = this;
  return ids
    .map(function (key) {
      if (typeof self.resources.metadata[key] === 'object')
        return {
          id: self.resources.metadata[key].id,
          label: self.resources.metadata[key].label,
          count: self.resources.metadata[key].count ? self.resources.metadata[key].count : 0
        };
      else
        return {
          id: 'unknow',
          label: 'unknow',
          count: -1
        };
    })
    .sort(function (a, b) {
      return b.count - a.count;
    });
};

// Set dataTypes
DatasetForm.prototype.setDatatypes = function () {
  let data = this.getOptionsInfo(Object.keys(this.resources.dataTypes)),
    options = this.buildOptions(data),
    select = this.container.find('select[name="datasetForm\\.dataType"]');
  select.empty();
  options.map(function (item) {
    select.append(item);
  });
  this.properties['dataType']('');
  this.refreshDatatypeView();
};

// Set subTypes
DatasetForm.prototype.setSubtypes = function () {
  let data = this.dataset.dataType ? this.getOptionsInfo(this.resources.dataTypes[this.dataset.dataType]) : [],
    options = this.buildOptions(data),
    select = this.container.find('select[name="datasetForm\\.subType"]');
  select.empty();
  options.map(function (item) {
    select.append(item);
  });
  this.properties['subType']('');
  this.refreshDatatypeView();
};

// Set view for curator or not
DatasetForm.prototype.setView = function (opts = {}) {
  if (opts.isCurator) {
    this.container.find('input[type="text"][name="datasetForm\\.notification"]').parent().show();
    this.container.find('button[name="datasetForm\\.refreshDatatypes"]').parent().show();
    this.container.find('input[type="checkbox"][name="datasetForm\\.highlight"]').parent().show();
  } else {
    this.container.find('input[type="text"][name="datasetForm\\.notification"]').parent().hide();
    this.container.find('button[name="datasetForm\\.refreshDatatypes"]').parent().hide();
    this.container.find('input[type="checkbox"][name="datasetForm\\.highlight"]').parent().hide();
  }
  if (opts.isCorresp) {
    this.container.find('button[name="datasetForm\\.unlink"]').show();
  } else {
    this.container.find('button[name="datasetForm\\.unlink"]').hide();
  }
};

// Return icon for a given status
DatasetForm.prototype.getIconOfStatus = function (status) {
  let i = $('<i>');
  if (status === 'valid') i.addClass('fas fa-check success-color-dark').attr('title', 'This dataset is valid');
  else if (status === 'saved') i.addClass('far fa-save success-color-dark').attr('title', 'This dataset is saved');
  else if (status === 'modified') i.addClass('fas fa-pen warning-color-dark').attr('title', 'This dataset is modified');
  else if (status === 'loading')
    i.addClass('fas fa-spinner success-color-dark').attr('title', 'This dataset is updating');
  else i.addClass('far fa-question-circle').attr('title', 'Unknow status');
  return i;
};

// Link dataset to datasetForm
DatasetForm.prototype.link = function (dataset, opts = {}, callback) {
  this.dataset = Object.assign({}, dataset);
  // Set all values
  for (let key in dataset) {
    if (typeof this.properties[key] === 'function') {
      this.dataset[key] = dataset[key];
    }
  }
  // Try to update some missing data concerning dataType/subType
  let update = this.updateDatatypeInfos();
  // Set properties
  for (let key in dataset) {
    if (typeof this.properties[key] === 'function') {
      this.properties[key](this.dataset[key], true);
    }
  }
  this.properties['dataType'](dataset['dataType'], true);
  this.properties['subType'](dataset['subType'], true);
  this.setView({ isCurator: opts.isCurator, isCorresp: opts.isCorresp });
  this.color();
  this.hideMessage();
  return typeof callback === 'function' ? callback(null, { shouldSave: update, dataset: this.dataset }) : undefined;
};

// Link dataset to datasetForm
DatasetForm.prototype.unlink = function (dataset) {
  this.dataset = {};
  this.uncolor();
  this.setEmptyMessage();
  return this.showMessage();
};

// Set color on dataset id
DatasetForm.prototype.color = function () {
  return this.container
    .find('div[key="dataset\\.id"], div[key="dataset\\.label"]')
    .parent()
    .css('color', this.dataset.color.foreground)
    .css('background-color', this.dataset.color.background.rgba);
};

// Unset color on dataset id
DatasetForm.prototype.uncolor = function () {
  return this.container.find('div[key="dataset\\.id"]');
};

// Set status "modified"
DatasetForm.prototype.modified = function () {
  return this.properties['status']('modified');
};

// Set status "modified"
DatasetForm.prototype.loading = function () {
  return this.properties['status']('loading');
};

// Set Empty datasetForm Message
DatasetForm.prototype.hideMessage = function () {
  return this.message.addClass('hide');
};

// Set Empty datasetForm Message
DatasetForm.prototype.showMessage = function () {
  return this.message.removeClass('hide');
};

// Set Empty datasetForm Message
DatasetForm.prototype.setEmptyMessage = function () {
  return this.message
    .empty()
    .append($('<div>').text('At least one dataset must be added to be able to use this form'))
    .append(
      $('<div>').text('Select a sentence that concerns a dataset, click it and then click the button "Add new Dataset')
    );
};

// Set Intializing datasetForm Message
DatasetForm.prototype.setInitialazingMessage = function () {
  return this.message.empty().append($('<div>').text('Populating dataset Form...'));
};
