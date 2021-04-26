/*
 * @prettier
 */

'use strict';

const DocumentHandler = function (opts = {}) {
  console.log(opts);
  let self = this;
  this.ids = opts.ids;
  // It will save a dataset (secure way to not DDOS mongoDB server)
  this.autoSave = _.debounce(this.saveDataset, 750);
  // It will store change states for each dataset
  this.hasChanged = {};
  // Events
  this.events = {};
  // Events
  this.lastAction = {
    'type': undefined, // What kind of action it was
    'data': undefined // Data that were involved
  };
  // It will store ready states for each elements (datasetForm, datasetsList & documentView)
  this.ready = {
    'datasetForm': false,
    'datasetsList': false,
    'documentView': false
  };
  this.colors = new Colors();
  // Add colors to datasets
  for (let i = 0; i < opts.datasets.current.length; i++) {
    opts.datasets.current[i].index = i;
    opts.datasets.current[i].color = this.colors.randomColor();
  }
  this.user = opts.user;
  this.datatypes = opts.datatypes;
  this.datasets = opts.datasets;
  this.currentDataset = null;
  this.metadata = opts.metadata;
  this.tei = opts.tei;
  this.pdf = { buffer: opts.pdf.buffer, sentences: opts.pdf.sentences };
  $('#datasets-confirm-modal-valid').click(function () {
    return self.onModalConfirmAccept();
  });
  return this;
};

// Attach event
DocumentHandler.prototype.attach = function (event, fn) {
  this.events[event] = fn;
};

// Check if document isReady
DocumentHandler.prototype.isReady = function (key, value) {
  if (typeof key === 'string' && typeof value === 'boolean') {
    this.ready[key] = value;
    if (this.isReady()) return this.init();
  } else {
    let result = true;
    for (let key in this.ready) {
      result = result && this.ready[key];
      if (!result) return result;
    }
    return result;
  }
};

// Attach event
DocumentHandler.prototype.init = function () {
  console.log('init');
  this.selectDataset(this.getFirstDataset());
  if (this.isReady() && typeof this.events.onReady === 'function') return this.events.onReady();
};

// Check if document has change(s) not saved
DocumentHandler.prototype.hasChanges = function () {
  let result = false;
  for (let key in this.hasChanged) {
    result = result || this.hasChanged[key] === true;
  }
  return result;
};

// Change status of current dataset (or the one with the given id) to "modified"
DocumentHandler.prototype.modified = function (id) {
  if (typeof id === 'undefined') {
    if (this.currentDataset) {
      this.currentDataset.status = 'modified';
      this.hasChanged[this.currentDataset.id] = true;
      if (this.currentDataset.id === this.datasetForm.currentId()) this.datasetForm.modified();
      this.datasetsList.update(this.currentDataset.id, this.currentDataset);
    }
  } else {
    let dataset = this.getDataset(id);
    if (dataset) {
      dataset.status = 'modified';
      this.hasChanged[dataset.id] = true;
      if (dataset.id === this.datasetForm.currentId()) this.datasetForm.modified();
      this.datasetsList.update(dataset.id, dataset);
    }
  }
};

// Change status of current dataset (or the one with the given id) to "removed"
DocumentHandler.prototype.removed = function (id) {
  if (typeof id === 'undefined') {
    if (this.currentDataset) {
      this.hasChanged[this.currentDataset.id] = undefined;
    }
  } else {
    let dataset = this.getDataset(id);
    if (dataset) {
      this.hasChanged[dataset.id] = undefined;
    }
  }
};

// Change status of current dataset (or the one with the given id) to "saved"
DocumentHandler.prototype.saved = function (id) {
  if (typeof id === 'undefined') {
    if (this.currentDataset) {
      this.currentDataset.status = 'saved';
      this.hasChanged[this.currentDataset.id] = false;
    }
  } else {
    let dataset = this.getDataset(id);
    if (dataset) {
      dataset.status = 'saved';
      this.hasChanged[dataset.id] = false;
    }
  }
};

// Change status of current dataset (or the one with the given id) to "valid"
DocumentHandler.prototype.valid = function (id) {
  if (typeof id === 'undefined') {
    if (this.currentDataset) {
      this.currentDataset.status = 'valid';
      this.hasChanged[this.currentDataset.id] = true;
    }
  } else {
    let dataset = this.getDataset(id);
    if (dataset) {
      dataset.status = 'valid';
      this.hasChanged[dataset.id] = true;
    }
  }
};

// Select a dataset
DocumentHandler.prototype.selectDataset = function (dataset) {
  if (dataset) {
    let self = this,
      id = dataset.id;
    this.currentDataset = dataset;
    this.datasetsList.select(this.currentDataset.id);
    this.datasetForm.link(
      this.currentDataset,
      { isCurator: this.user.isCurator, isCorresp: false },
      function (err, res) {
        if (err) console.log('dataset not selected');
        if (res) {
          if (res.shouldSave) {
            console.log('Should save selected dataset', res);
            self.updateDataset(res.dataset.id, res.dataset);
            self.autoSave(id);
          } else return console.log('Selected dataset up to date');
        }
      }
    ); // refresh datasetForm
  }
};

// Show error modal
DocumentHandler.prototype.showModalError = function (opts = {}) {
  $('#datasets-error-modal-label').html(opts.title);
  $('#datasets-error-modal-body').html(opts.body);
  $('#datasets-error-modal-btn').click();
};

// Show confirm modal
DocumentHandler.prototype.showModalConfirm = function (opts = {}) {
  $('#datasets-confirm-modal-label').html(opts.title);
  $('#datasets-confirm-modal-action').attr('value', opts.action);
  $('#datasets-confirm-modal-body').html(opts.body);
  $('#datasets-confirm-modal-data').html(opts.data);
  $('#datasets-confirm-modal-btn').click();
};

// onModalConfirmAccept
DocumentHandler.prototype.onModalConfirmAccept = function () {
  let action = $('#datasets-confirm-modal-action').attr('value');
  console.log('onModalConfirmAccept');
  if (typeof this.events.onModalConfirmAccept === 'function') return this.events.onModalConfirmAccept(action);
};

// Update a dataset
DocumentHandler.prototype.updateDataset = function (id, data = {}) {
  let dataset = this.getDataset(id);
  if (dataset)
    for (let key in data) {
      dataset[key] = data[key];
    }
};

// Save a dataset
DocumentHandler.prototype.saveDataset = function (id) {
  let self = this,
    dataset = this.getDataset(id);
  if (id === this.datasetForm.currentId()) this.datasetForm.loading();
  this.datasetsList.loading(id);
  return DataSeerAPI.updateDataset(
    {
      datasetsId: this.ids.datasets,
      dataset: dataset
    },
    function (err, res) {
      console.log(err, res);
      if (err) return err; // Need to define error behavior
      if (res.err) return err; // Need to define error behavior
      self.saved(id);
      self.hasChanged[id] = false;
      self.updateDataset(id, res.res);
      self.refreshDataset(id);
    }
  );
};

// Delete a dataset
DocumentHandler.prototype.deleteDataset = function (id) {
  let self = this,
    dataset = this.getDataset(id);
  if (id === this.datasetForm.currentId()) this.datasetForm.loading();
  this.datasetsList.loading(id);
  return DataSeerAPI.deleteDataset(
    {
      datasetsId: this.ids.datasets,
      dataset: dataset
    },
    function (err, res) {
      console.log(err, res);
      if (err) return err; // Need to define error behavior
      if (res.err) return err; // Need to define error behavior
      self.saved(id);
      self.hasChanged[id] = false;
      self.updateDataset(id, res.res);
      self.refreshDataset(id);
    }
  );
};

// Refresh a dataset
DocumentHandler.prototype.refreshDataset = function (id) {
  let self = this,
    dataset = this.getDataset(id);
  this.datasetsList.update(id, dataset);
  if (this.datasetForm.currentId() === id)
    this.datasetForm.link(dataset, { isCurator: this.user.isCurator, isCorresp: false }, function (err, res) {
      if (err) console.log('dataset not selected');
      if (res) {
        if (res.shouldSave) {
          console.log('Should save selected dataset', res);
          self.updateDataset(res.dataset.id, res.dataset);
          self.autoSave(id);
        } else console.log('Selected dataset up to date', res);
      }
    });
};

// Reorder an array
DocumentHandler.prototype.reorder = function (data, index) {
  if (index > data.length) return data;
  return data.slice(index).concat(data.slice(0, index));
};

// Get the first dataset (or undefined)
DocumentHandler.prototype.getFirstDataset = function () {
  return this.datasets.current[0];
};

// Get the first not "valid" dataset (or undefined)
DocumentHandler.prototype.getFirstDatasetNotValid = function (currentId = 0) {
  let data = this.reorder(
    this.datasets.current.map(function (item) {
      return { index: item.index, id: item.id, status: item.status };
    }),
    currentId + 1
  ); // reorder infos in new Array
  console.log(data);
  for (let i = 0; i < data.length; i++) {
    if (data[i].status !== 'valid') return this.datasets.current[data[i].index];
  }
  return null;
};

// Get the next dataset (or undefined)
DocumentHandler.prototype.getNextDataset = function (id) {
  let dataset = this.getDataset(id),
    firstChoice = this.getFirstDatasetNotValid(dataset.index),
    secondChoice = this.getFirstDataset();
  console.log(firstChoice, secondChoice, this.datasets.current);
  if (firstChoice) return firstChoice;
  else if (secondChoice) return secondChoice;
  return dataset;
};

// Get the dataset with given id (or undefined)
DocumentHandler.prototype.getDataset = function (id) {
  for (let i = 0; i < this.datasets.current.length; i++) {
    if (this.datasets.current[i].id === id) return this.datasets.current[i];
  }
  return null;
};

// Create new Dataset
DocumentHandler.prototype.newDataset = function (opts = {}) {};

// Link some elements to the documentHandler
DocumentHandler.prototype.link = function (opts = {}) {
  let self = this;
  if (opts.documentView) {
    this.documentView = opts.documentView;
    this.documentView.renderPDF(this.pdf, function () {
      console.log('PDF rendered');
      self.isReady('documentView', true);
    });
  }
  // Init datasetForm First
  if (opts.datasetForm) {
    this.datasetForm = opts.datasetForm;
    this.isReady('datasetForm', true);
    this.datasetForm.loadResources(this.datatypes);
    console.log('resources loaded !');
  }
  // the datasetList
  if (opts.datasetsList) {
    this.datasetsList = opts.datasetsList;
    // Load data in datasetsList
    this.datasetsList.load(this.datasets.current, function () {
      console.log('datasets loaded !');
    });
    this.isReady('datasetsList', true);
  }
  this.synchronize();
};

// DocumentHandler synchronization
DocumentHandler.prototype.synchronize = function () {
  let self = this;
  if (this.datasetsList) {
    // Attach datasetsList events
    this.datasetsList.attach('onDatasetLoaded', function (dataset) {
      console.log(dataset);
    });
    this.datasetsList.attach('onDatasetClick', function (dataset) {
      console.log(dataset);
      self.selectDataset(self.getDataset(dataset.id)); // set current dataset
    });
    this.datasetsList.attach('onDatasetCheck', function (dataset) {
      console.log(dataset);
    });
    this.datasetsList.attach('onDatasetDelete', function (dataset) {
      console.log(dataset);
      self.deleteDataset(dataset.id);
    });
    this.datasetsList.attach('onDatasetLink', function (dataset) {
      console.log(dataset);
    });
    this.datasetsList.attach('onNewDatasetClick', function () {});
    this.datasetsList.attach('onMergeSelectionClick', function (ids) {
      console.log(ids);
      if (ids.length <= 1)
        self.showModalError({
          title: 'Merge selection error',
          body: 'You must select at least two datasets to use this feature'
        });
      else self.mergeDatasets(ids);
    });
    this.datasetsList.attach('onDeleteSelectionClick', function (ids) {
      console.log(ids);
      if (ids.length <= 0)
        self.showModalError({
          title: 'Merge selection error',
          body: 'You must select at least one dataset to use this feature'
        });
      else self.deleteDatasets(ids);
    });
  }
  if (this.datasetForm) {
    // Attach datasetsList events
    this.datasetForm.attach('onPropertyChange', function (property, value) {
      console.log(property, value);
      self.modified();
      self.currentDataset[property] = value;
      self.autoSave(self.currentDataset.id);
      if (property === 'highlight')
        if (value) self.datasetsList.highlight(self.currentDataset.id);
        else self.datasetsList.unhighlight(self.currentDataset.id);
    });
    this.datasetForm.attach('onDatasetIdClick', function (dataset) {
      console.log(dataset);
      self.selectDataset(self.getDataset(dataset.id));
    });
    this.datasetForm.attach('onDatasetDoneClick', function (dataset) {
      console.log(dataset);
      if (self.hasChanged[dataset.id]) self.autoSave(dataset.id);
      self.selectDataset(self.getNextDataset(dataset.id));
    });
    this.datasetForm.attach('onDatasetUnlinkClick', function (dataset) {
      console.log(dataset);
    });
    this.datasetForm.attach('onRefreshDatatypesClick', function (dataset) {
      console.log(dataset);
    });
  }
};
