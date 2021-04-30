/*
 * @prettier
 */

'use strict';

const DocumentHandler = function (opts = {}, events) {
  let self = this;
  this.ids = opts.ids;
  // It will save a dataset (secure way to not DDOS mongoDB server)
  this.autoSave = _.debounce(this.saveDataset, 750);
  // It will store change states for each dataset
  this.hasChanged = {};
  // Events
  this.events = events;
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
  this._colors = new Colors();
  this.colors = {};
  // Add colors to datasets
  for (let i = 0; i < opts.datasets.current.length; i++) {
    opts.datasets.current[i].index = i;
    opts.datasets.current[i].color = this._colors.randomColor();
    this.colors[opts.datasets.current[i].id] = opts.datasets.current[i].color;
  }
  this.user = opts.user;
  this.datatypes = opts.datatypes;
  this.datasets = opts.datasets;
  this.currentDataset = null;
  this.currentCorresp = null;
  this.metadata = opts.metadata;
  this.tei = opts.tei;
  if (opts.pdf)
    this.pdf = {
      buffer: opts.pdf.buffer,
      metadata: { sentences: opts.pdf.metadata.sentences, pages: opts.pdf.metadata.pages }
    };
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
  let self = this;
  this.selectDataset(this.getFirstDataset().id, function () {
    console.log('init');
    if (typeof self.events.onReady === 'function') return self.events.onReady();
  });
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

// Change status of the dataset (with the given id) to "loading"
DocumentHandler.prototype.loading = function (id) {
  if (id === this.datasetForm.currentId()) this.datasetForm.loading();
  this.datasetsList.loading(id);
};

// Select a dataset
DocumentHandler.prototype.selectDataset = function (id, cb) {
  if (id) {
    let self = this;
    this.currentDataset = this.getDataset(id);
    this.currentCorresp = null;
    if (this.documentView.selectedSentence && this.documentView.selectedSentence.sentenceId)
      this.documentView.unselectSentence(this.documentView.selectedSentence);
    this.documentView.selectDataset(this.currentDataset.id, function (err) {
      self.datasetsList.select(self.currentDataset.id);
      self.datasetForm.link(
        self.currentDataset,
        { isCurator: self.user.isCurator, isCorresp: false },
        function (err, res) {
          if (err) {
            console.log('dataset not selected');
            return cb(err);
          }
          if (res) {
            if (res.shouldSave) {
              console.log('Should save selected dataset', res);
              self.updateDataset(res.dataset.id, res.dataset);
              self.autoSave(id);
              return typeof cb === 'function' ? cb(null, id) : undefined;
            } else {
              console.log('Selected dataset up to date');
              return typeof cb === 'function' ? cb(true) : undefined;
            }
          } else return typeof cb === 'function' ? cb(true) : undefined;
        }
      ); // refresh datasetForm
    });
  } else return typeof cb === 'function' ? cb(true) : undefined;
};

// Select a dataset
DocumentHandler.prototype.selectCorresp = function (datasetId, sentenceId, cb) {
  if (datasetId && sentenceId) {
    let self = this;
    this.currentCorresp = { datasetId: datasetId, sentenceId: sentenceId };
    if (this.documentView.selectedSentence && this.documentView.selectedSentence.sentenceId)
      this.documentView.unselectSentence(this.documentView.selectedSentence);
    this.documentView.selectCorresp({ id: datasetId, sentenceId: sentenceId }, function (err) {
      self.datasetsList.select(self.currentCorresp.datasetId);
      self.datasetForm.link(
        self.getDataset(self.currentCorresp.datasetId),
        { isCurator: self.user.isCurator, isCorresp: true },
        function (err, res) {
          if (err) {
            console.log('corresp not selected');
            return cb(err);
          }
          return typeof cb === 'function' ? cb(true) : undefined;
        }
      ); // refresh datasetForm
    });
  } else return typeof cb === 'function' ? cb(true) : undefined;
};

// Show error modal
DocumentHandler.prototype.showModalError = function (opts = {}) {
  $('#datasets-error-modal-label').html(opts.title);
  $('#datasets-error-modal-body').html(opts.body);
  $('#datasets-error-modal-btn').click();
};

// Show confirm modal
DocumentHandler.prototype.showModalConfirm = function (opts = {}, confirm) {
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
DocumentHandler.prototype.saveDataset = function (id, cb) {
  let self = this,
    dataset = this.getDataset(id);
  this.loading(id);
  return DataSeerAPI.updateDataset(
    {
      datasetsId: this.ids.datasets,
      dataset: dataset
    },
    function (err, res) {
      console.log(err, res);
      if (err) return typeof cb === 'function' ? cb(err) : undefined;
      if (res.err) return typeof cb === 'function' ? cb(true, res) : undefined;
      self.saved(id);
      self.hasChanged[id] = false;
      self.updateDataset(id, res.res);
      self.refreshDataset(id);
      return typeof cb === 'function' ? cb(err, res) : undefined;
    }
  );
};

// Delete a dataset
DocumentHandler.prototype.deleteDataset = function (id, cb) {
  let self = this,
    dataset = this.getDataset(id);
  this.loading(id);
  return DataSeerAPI.deleteDataset(
    {
      datasetsId: this.ids.datasets,
      dataset: dataset
    },
    function (err, res) {
      console.log(err, res);
      if (err) return cb(err); // Need to define error behavior
      if (res.err) return cb(true, res); // Need to define error behavior
      self.datasets.deleted.push(self.datasets.current.splice(dataset.index, 1)[0]); // delete current dataset
      self.datasetsList.delete(id);
      self.documentView.removeDataset(dataset);
      return cb();
    }
  );
};

// Delete a corresp
DocumentHandler.prototype.deleteCorresp = function (opts = {}, cb) {
  let self = this,
    corresp = { id: opts.id, sentenceId: opts.sentenceId };
  return DataSeerAPI.deleteCorresp({ datasetsId: self.datasets._id, dataset: corresp }, function (err, res) {
    console.log(err, res);
    if (err) return cb(err); // Need to define error behavior
    if (res.err) return cb(true, res); // Need to define error behavior
    self.removeCorresp({ dataset: self.getDataset(opts.id), sentenceId: opts.sentenceId }, function (err, dataset) {
      return cb(err, dataset);
    });
  });
};

// Create new DatasetId
DocumentHandler.prototype.newDatasetId = function () {
  let index = 1,
    newId = 'dataset-' + index;
  while (this.datasetExist(newId)) {
    index += 1;
    newId = 'dataset-' + index;
  }
  return newId;
};

// Create new Dataset
DocumentHandler.prototype.newDataset = function (opts = {}, cb) {
  let self = this;
  console.log(opts);
  return DataSeerAPI.getdataType(opts.text, function (err, res) {
    if (err) return cb(err, res);
    if (res.err) return cb(true, res);
    console.log(err, res);
    let dataType = res['datatype'] ? res['datatype'] : self.datasetForm.defaultDataType,
      cert = res['cert'] ? res['cert'] : 0;
    // return cb(err, );
    let dataset = { id: self.newDatasetId(), dataType: dataType, cert: cert, sentenceId: opts.sentenceId };
    return DataSeerAPI.createDataset({ datasetsId: self.datasets._id, dataset: dataset }, function (err, res) {
      if (err) return cb(err, res);
      if (res.err) return cb(true, res);
      console.log(err, res);
      return self.addDataset(res.res, function (err, dataset) {
        return cb(err, dataset);
      });
    });
  });
};

// Add  new Dataset
DocumentHandler.prototype.addDataset = function (dataset, cb) {
  dataset.color = this._colors.randomColor();
  dataset.index = this.datasets.current.length;
  this.colors[dataset.id] = dataset.color;
  this.datasets.current.push(dataset);
  this.documentView.addDataset(dataset);
  this.datasetsList.add(dataset);
  return cb(null, this.getDataset(dataset.id));
};

// Create new Corresp
DocumentHandler.prototype.newCorresp = function (opts = {}, cb) {
  let self = this;
  let dataset = { id: opts.id, sentenceId: opts.sentenceId };
  return DataSeerAPI.createCorresp({ datasetsId: self.datasets._id, dataset: dataset }, function (err, res) {
    if (err) return cb(err, res);
    if (res.err) return cb(true, res);
    console.log(err, res);
    return self.addCorresp({ dataset: self.getDataset(opts.id), sentenceId: opts.sentenceId }, function (err, dataset) {
      return cb(err, dataset);
    });
  });
};

// Add  new Corresp
DocumentHandler.prototype.addCorresp = function (opts = {}, cb) {
  console.log(opts);
  this.documentView.addCorresp(opts.dataset, opts.sentenceId);
  return cb(null, this.getDataset(opts.dataset.id));
};

// Remove Corresp
DocumentHandler.prototype.removeCorresp = function (opts = {}, cb) {
  console.log(opts);
  this.documentView.removeCorresp(opts.dataset, opts.sentenceId);
  return cb(null, this.getDataset(opts.dataset.id));
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

// Get the dataset with given id (or undefined)
DocumentHandler.prototype.datasetExist = function (id) {
  for (let i = 0; i < this.datasets.current.length; i++) {
    if (this.datasets.current[i].id === id) return true;
  }
  return false;
};

// Link some elements to the documentHandler
DocumentHandler.prototype.link = function (opts = {}) {
  let self = this;
  if (opts.documentView) {
    this.documentView = opts.documentView;
    this.documentView.init({ pdf: this.pdf, xml: this.tei, colors: this.colors }, function () {
      console.log('documentView ready !');
      self.isReady('documentView', true);
    });
  }
  // Init datasetForm First
  if (opts.datasetForm) {
    this.datasetForm = opts.datasetForm;
    this.isReady('datasetForm', true);
    this.datasetForm.loadResources(this.datatypes);
    console.log('datasetForm ready !');
  }
  // the datasetList
  if (opts.datasetsList) {
    this.datasetsList = opts.datasetsList;
    // Load data in datasetsList
    this.datasetsList.load(this.datasets.current, function () {
      console.log('datasetsList ready !');
    });
    this.isReady('datasetsList', true);
  }
  this.synchronize();
};

// DocumentHandler synchronization
DocumentHandler.prototype.synchronize = function () {
  let self = this;
  if (this.documentView) {
    // Attach documentView events
    this.documentView.attach('onDatasetClick', function (sentence) {
      console.log(sentence);
      if (sentence.isCorresp) return self.selectCorresp(sentence.datasetId, sentence.sentenceId);
      else if (sentence.isDataset) return self.selectDataset(sentence.datasetId);
      else console.log('onDatasetClick: case not handled', sentence);
    });
    // Attach documentView events
    this.documentView.attach('onSentenceClick', function (sentence) {});
  }
  if (this.datasetsList) {
    // Attach datasetsList events
    this.datasetsList.attach('onDatasetLoaded', function (dataset) {
      // console.log(dataset);
    });
    this.datasetsList.attach('onDatasetClick', function (dataset) {
      // console.log(dataset);
      self.selectDataset(dataset.id); // set current dataset
    });
    this.datasetsList.attach('onDatasetCheck', function (dataset) {
      // console.log(dataset);
    });
    this.datasetsList.attach('onDatasetDelete', function (dataset) {
      let nextId = self.getNextDataset(dataset.id).id;
      self.deleteDataset(dataset.id, function () {
        self.selectDataset(nextId);
      });
    });
    this.datasetsList.attach('onDatasetLink', function (dataset) {
      let selectedSentence = self.documentView.selectedSentence;
      if (selectedSentence && selectedSentence.sentenceId) {
        return self.newCorresp({ id: dataset.id, sentenceId: selectedSentence.sentenceId }, function (err, dataset) {
          if (err) return console.log(err);
          console.log('onDatasetLink');
          self.selectCorresp(dataset.id, selectedSentence.sentenceId);
        });
      }
      return self.showModalError({
        title: 'Error: Link sentence to dataset',
        body: 'You must select a sentence before linking it to the dataset'
      });
    });
    this.datasetsList.attach('onNewDatasetClick', function () {
      let selectedSentence = self.documentView.selectedSentence;
      if (selectedSentence && selectedSentence.sentenceId && selectedSentence.text) {
        return self.newDataset(
          { text: selectedSentence.text, sentenceId: selectedSentence.sentenceId },
          function (err, dataset) {
            if (err) return console.log(err);
            self.selectDataset(dataset.id);
          }
        );
      } else
        return self.showModalError({
          title: 'Error: New dataset',
          body: 'You must select a sentence to create a new dataset'
        });
    });
    this.datasetsList.attach('onMergeSelectionClick', function (ids) {
      // console.log(ids);
      if (ids.length <= 1)
        self.showModalError({
          title: 'Error: Merge selection',
          body: 'You must select at least two datasets'
        });
      else self.mergeDatasets(ids);
    });
    this.datasetsList.attach('onDeleteSelectionClick', function (ids) {
      // console.log(ids);
      if (ids.length <= 0)
        self.showModalError({
          title: 'Error: Delete selection',
          body: 'You must select at least one dataset'
        });
      else self.deleteDatasets(ids);
    });
  }
  if (this.datasetForm) {
    // Attach datasetsList events
    this.datasetForm.attach('onPropertyChange', function (property, value) {
      // console.log(property, value);
      self.modified();
      self.currentDataset[property] = value;
      self.autoSave(self.currentDataset.id);
      if (property === 'highlight')
        if (value) self.datasetsList.highlight(self.currentDataset.id);
        else self.datasetsList.unhighlight(self.currentDataset.id);
    });
    this.datasetForm.attach('onDatasetIdClick', function (dataset) {
      // console.log(dataset);
      self.selectDataset(dataset.id);
    });
    this.datasetForm.attach('onDatasetDoneClick', function (dataset) {
      // console.log(dataset);
      if (!self.user.isCurator) {
        if (!dataset.dataType) {
          return self.showModalError({
            title: 'Missing data',
            body: 'To validate, please provide a datatype (predefined or custom)'
          });
        }
        if (!dataset.name)
          return self.showModalError({
            title: 'Missing data',
            body: 'To validate, please provide a name for this dataset'
          });
        if (!dataset.DOI && !dataset.comments) {
          return self.showModalError({
            title: 'Missing data',
            body: 'To validate, please provide either a DOI for the dataset or a comment in the comment box'
          });
        }
      }
      if (self.hasChanged[dataset.id]) self.autoSave(dataset.id);
      self.selectDataset(self.getNextDataset(dataset.id).id);
    });
    this.datasetForm.attach('onDatasetUnlinkClick', function (dataset) {
      console.log(dataset);
      if (self.currentCorresp && self.currentCorresp.sentenceId) {
        return self.deleteCorresp({ id: dataset.id, sentenceId: self.currentCorresp.sentenceId }, function (err) {
          if (err) return console.log(err);
          self.selectDataset(dataset.id);
        });
      }
      return self.showModalError({
        title: 'Error: Link sentence to dataset',
        body: 'You must select a sentence before linking it to the dataset'
      });
    });
    this.datasetForm.attach('onRefreshDatatypesClick', function (done) {
      console.log('onRefreshDatatypesClick');
      return DataSeerAPI.resyncJsonDataTypes(function (err, res) {
        console.log(err, res);
        return done();
      });
    });
  }
};
