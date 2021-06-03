/*
 * @prettier
 */

'use strict';

const DocumentHandler = function (opts = {}, events) {
  let self = this;
  this.ids = opts.ids;
  // It will save a dataset (secure way to not DDOS mongoDB server)
  this.autoSave = _.debounce(this.saveDataset, 2000);
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
    opts.datasets.current[i].color = this._colors.randomColor();
    this.colors[opts.datasets.current[i].id] = opts.datasets.current[i].color;
  }
  this.sentencesMapping = undefined;
  this.user = opts.user;
  this.datatypes = opts.datatypes;
  this.datasets = opts.datasets;
  this.metadata = opts.metadata;
  this.tei = opts.tei;
  if (opts.pdf)
    this.pdf = {
      url: opts.pdf.url,
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

// Refresh the sentences mapping
DocumentHandler.prototype.refreshSentencesMapping = function () {
  if (this.sentencesMapping) {
    if (this.documentView.pdfVisible) this.datasetsList.setSentencesMapping(this.sentencesMapping.pdf);
    else this.datasetsList.setSentencesMapping(this.sentencesMapping.xml);
  }
};

// Attach event
DocumentHandler.prototype.init = function () {
  // refresh mapping
  this.sentencesMapping = this.documentView.getSentencesMapping();
  this.refreshSentencesMapping();
  let self = this,
    firstId = this.datasetsList.getFirstDatasetId(),
    dataset = firstId ? this.getDataset(firstId) : {};
  if (dataset && dataset.sentences && dataset.sentences.length) {
    this.selectSentence({ id: dataset.sentences[0].id, noAnim: true }, function () {
      console.log('init');
      if (typeof self.events.onReady === 'function') return self.events.onReady();
    });
  } else {
    console.log('init');
    this.datasetForm.setEmptyMessage();
    this.datasetsList.setEmptyMessage();
    if (typeof self.events.onReady === 'function') return self.events.onReady();
  }
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
  let dataset = this.getDataset(id);
  if (dataset) {
    this.hasChanged[dataset.id] = true;
    dataset.status = 'modified';
    this.datasetsList.update(dataset.id, dataset);
    if (dataset.id === this.datasetForm.currentId()) this.datasetForm.modified();
  }
};

// Change status of current dataset (or the one with the given id) to "saved"
DocumentHandler.prototype.saved = function (id) {
  let dataset = this.getDataset(id);
  if (dataset) {
    dataset.status = 'saved';
    this.hasChanged[dataset.id] = false;
  }
};

// Change status of current dataset (or the one with the given id) to "valid"
DocumentHandler.prototype.valid = function (id) {
  let dataset = this.getDataset(id);
  if (dataset) {
    dataset.status = 'valid';
    this.hasChanged[dataset.id] = true;
  }
};

// Change status of the dataset (with the given id) to "loading"
DocumentHandler.prototype.loading = function (id) {
  if (id === this.datasetForm.currentId()) this.datasetForm.loading();
  this.datasetsList.loading(id);
};

// Get datasets of a sentence
DocumentHandler.prototype.getDatasetsOfSentence = function (sentenceId) {
  return this.datasets.current.filter(function (dataset) {
    return dataset.sentences.reduce(function (acc, sentence) {
      return acc || sentence.id === sentenceId;
    }, false);
  });
};

// Select a sentence
DocumentHandler.prototype.selectSentence = function (opts, cb) {
  let self = this,
    datasets = self.getDatasetsOfSentence(opts.id),
    dataset =
      datasets.length > 0
        ? opts.selectedDatasetId
          ? this.getDataset(opts.selectedDatasetId)
          : datasets[0]
        : undefined,
    selectedSentences = this.documentView.getSelectedSentences();
  return this.documentView.scrollToSentence({ id: opts.id, noAnim: opts.noAnim }, function (err) {
    if (!opts.disableSelection) {
      self.documentView.unselectSentences(selectedSentences);
      self.documentView.selectSentence({ sentenceId: opts.id });
    }
    if (dataset && self.documentView.getSelectedSentences().length === 1) {
      let sentence = self.documentView.getSentence(opts.id);
      self.datasetsList.select(dataset.id);
      self.datasetForm.show();
      self.datasetForm.link(
        {
          dataset: dataset,
          sentence: {
            id: sentence.sentenceId,
            text: sentence.text
            // url: self.documentView.pdfViewer.getSentenceDataURL(sentence.sentenceId)
          }
        },
        datasets,
        { isCurator: self.user.isCurator || self.user.isAnnotator },
        function (err, res) {
          if (err) {
            console.log('dataset not selected');
            return cb(err);
          }
          if (res) {
            if (res.shouldSave) {
              console.log('Should save selected dataset', res);
              self.modified(res.dataset.id);
              self.updateDataset(res.dataset.id, res.dataset);
              self.saveDataset(res.dataset.id);
              return typeof cb === 'function' ? cb(null, res.dataset.id) : undefined;
            } else {
              console.log('Selected dataset up to date');
              return typeof cb === 'function' ? cb(true) : undefined;
            }
          } else return typeof cb === 'function' ? cb(true) : undefined;
        }
      );
    } else {
      self.datasetsList.unselect();
      self.datasetForm.hide();
      self.datasetForm.unlink();
      return typeof cb === 'function' ? cb(true) : undefined;
    }
  });
};

// Show error on finish
DocumentHandler.prototype.throwDatasetsNotValidError = function () {
  this.showModalError({
    title: 'Error: Datasets validation',
    body: 'Please validate all datasets below before moving on the next step.',
    data: this.getDatasetsNotValidList()
  });
};

// Build error msg
DocumentHandler.prototype.getDatasetsNotValidList = function () {
  let datasets = this.datasets.current.filter(function (dataset) {
    return dataset.status !== 'valid';
  });
  return `<ul>${datasets
    .map(function (dataset) {
      return `<li>(${dataset.id}) ${dataset.name ? dataset.name : dataset.id}</li>`;
    })
    .join('')}</ul>`;
};

// Show error modal
DocumentHandler.prototype.showModalError = function (opts = {}) {
  $('#datasets-error-modal-label').html(opts.title);
  $('#datasets-error-modal-body').html(opts.body);
  $('#datasets-error-modal-data').html(opts.data);
  if (opts.data) $('#datasets-error-modal-data').show();
  else $('#datasets-error-modal-data').hide();
  $('#datasets-error-modal-btn').click();
};

// Show confirm modal
DocumentHandler.prototype.showModalConfirm = function (opts = {}, confirm) {
  $('#datasets-confirm-modal-label').html(opts.title);
  $('#datasets-confirm-modal-action').attr('value', opts.action);
  $('#datasets-confirm-modal-body').html(opts.body);
  $('#datasets-confirm-modal-data').html(opts.data);
  if (opts.data) $('#datasets-confirm-modal-data').show();
  else $('#datasets-confirm-modal-data').hide();
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
  if (!this.hasChanged[id]) return typeof cb === 'function' ? cb(null, dataset) : undefined;
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

// Merge some datasets
DocumentHandler.prototype.mergeDatasets = function (datasets, cb) {
  if (datasets.length > 1) {
    let self = this,
      target = this.getDataset(datasets[0].id);
    return async.mapSeries(
      datasets.slice(1),
      function (item, callback) {
        let dataset = Object.assign({}, self.getDataset(item.id)),
          links = self.documentView.getLinks(dataset);
        return self.deleteDataset(dataset.id, function (err, res) {
          if (err) return callback(err);
          console.log({ datasetId: target.id, sentences: links });
          return self.newLinks({ datasetId: target.id, sentences: links }, function (err) {
            return callback(err);
          });
        });
      },
      function (err) {
        return cb(err);
      }
    );
  } else return cb();
};

// Delete some datasets
DocumentHandler.prototype.deleteDatasets = function (datasets, cb) {
  let self = this;
  return async.mapSeries(
    datasets,
    function (dataset, callback) {
      return self.deleteDataset(dataset.id, function (err, res) {
        return callback(err);
      });
    },
    function (err) {
      return cb(err);
    }
  );
};

// Delete a dataset
DocumentHandler.prototype.deleteDataset = function (id, cb) {
  let self = this,
    dataset = this.getDataset(id);
  this.loading(id);
  this.datasetForm.unlink(id);
  return DataSeerAPI.deleteDataset(
    {
      datasetsId: this.ids.datasets,
      dataset: dataset
    },
    function (err, res) {
      console.log(err, res);
      if (err) return cb(err); // Need to define error behavior
      if (res.err) return cb(true, res); // Need to define error behavior
      let index = self.getDatasetIndex(dataset.id);
      if (index > -1) self.datasets.deleted.push(self.datasets.current.splice(index, 1)[0]); // delete current dataset
      self.datasetsList.delete(id);
      self.documentView.removeDataset(dataset);
      return cb(undefined, res);
    }
  );
};

// Delete a link
DocumentHandler.prototype.deleteLink = function (opts = {}, cb) {
  let self = this;
  return DataSeerAPI.unlinkSentence(
    {
      datasetsId: self.datasets._id,
      dataset: { id: opts.id },
      sentence: { id: opts.sentence.id, text: opts.sentence.text }
    },
    function (err, res) {
      console.log(err, res);
      if (err) return cb(err); // Need to define error behavior
      if (res.err) return cb(true, res); // Need to define error behavior
      return self.removeLink(
        { dataset: self.getDataset(opts.id), sentence: { id: opts.sentence.id, text: opts.sentence.text } },
        function (err, dataset) {
          return cb(err, dataset);
        }
      );
    }
  );
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

// Create new DatasetId
DocumentHandler.prototype.newDataInstanceId = function () {
  let index = 1,
    newId = 'dataInstance-' + index;
  while (this.dataInstanceExist(newId)) {
    index += 1;
    newId = 'dataInstance-' + index;
  }
  return newId;
};

// Create new Dataset
DocumentHandler.prototype.newDataset = function (sentences = {}, cb) {
  let self = this,
    datasetSentence = sentences[0],
    linksSentences = sentences.slice(1);
  return DataSeerAPI.getdataType(datasetSentence.text, function (err, res) {
    if (err) return cb(err, res);
    if (res.err) return cb(true, res);
    console.log(err, res);
    let dataType = res['datatype'] ? res['datatype'] : self.datasetForm.defaultDataType,
      cert = res['cert'] ? res['cert'] : 0;
    let dataset = {
      id: self.newDatasetId(),
      dataInstanceId: self.newDataInstanceId(),
      sentences: [{ id: datasetSentence.sentenceId, text: datasetSentence.text }],
      dataType: dataType,
      cert: cert
    };
    return DataSeerAPI.createDataset({ datasetsId: self.datasets._id, dataset: dataset }, function (err, res) {
      if (err) return cb(err, res);
      if (res.err) return cb(true, res);
      console.log(err, res);
      return self.addDataset(res.res, datasetSentence.sentenceId, function (err, dataset) {
        if (linksSentences.length === 0) return cb(err, dataset);
        else
          return self.newLinks({ datasetId: dataset.id, sentences: linksSentences }, function (err, dataset) {
            return cb(err, dataset);
          });
      });
    });
  });
};

// Add  new Dataset
DocumentHandler.prototype.addDataset = function (dataset, sentenceId, cb) {
  dataset.color = this._colors.randomColor();
  this.colors[dataset.id] = dataset.color;
  this.datasets.current.push(dataset);
  this.documentView.addDataset(dataset, sentenceId);
  this.datasetsList.add(dataset);
  return cb(null, this.getDataset(dataset.id));
};

// Create new Links
DocumentHandler.prototype.newLinks = function (opts = {}, cb) {
  console.log(opts);
  let self = this,
    dataset = self.getDataset(opts.datasetId);
  return async.mapSeries(
    opts.sentences,
    function (sentence, next) {
      return DataSeerAPI.linkSentence(
        {
          datasetsId: self.datasets._id,
          dataset: { id: opts.datasetId },
          sentence: { id: sentence.sentenceId, text: sentence.text }
        },
        function (err, res) {
          console.log(err, res);
          if (err) return cb(err, res);
          if (res.err) return cb(true, res);
          return self.addLink(
            { dataset: self.getDataset(opts.datasetId), sentence: { id: sentence.sentenceId, text: sentence.text } },
            function (err, dataset) {
              return next(err);
            }
          );
        }
      );
    },
    function (err) {
      return cb(err, dataset);
    }
  );
};

// Add Link
DocumentHandler.prototype.addLink = function (opts = {}, cb) {
  this.documentView.addLink(opts.dataset, opts.sentence.id);
  let dataset = this.getDataset(opts.dataset.id);
  dataset.sentences.push(opts.sentence);
  return cb(null, this.getDataset(dataset.id));
};

// Remove Link
DocumentHandler.prototype.removeLink = function (opts = {}, cb) {
  this.documentView.removeLink(opts.dataset, opts.sentence.id);
  let dataset = this.getDataset(opts.dataset.id),
    index = dataset.sentences.reduce(function (acc, item, i) {
      if (item.id === opts.sentence.id) acc = i;
      return acc;
    }, -1);
  if (index > -1) dataset.sentences.splice(index, 1); // delete current dataset
  return cb(null, this.getDataset(opts.dataset.id));
};

// Refresh a dataset
DocumentHandler.prototype.refreshDataset = function (id) {
  let self = this,
    dataset = this.getDataset(id);
  this.datasetsList.update(id, dataset);
  if (this.datasetForm.currentId() === id)
    this.datasetForm.updateDataset(
      dataset,
      { isCurator: this.user.isCurator || this.user.isAnnotator },
      function (err, res) {
        if (err) console.log('dataset not selected');
        else console.log('dataset refreshed');
      }
    );
};

// return index of dataset
DocumentHandler.prototype.getDatasetIndex = function (id) {
  for (let i = 0; i < this.datasets.current.length; i++) {
    if (this.datasets.current[i].id === id) return i;
  }
  return -1;
};

// Get the next dataset (or undefined)
DocumentHandler.prototype.getNextDataset = function (id) {
  let dataset = this.getDataset(id),
    firstChoice = this.datasetsList.getFirstDatasetIdNotValid(dataset.id),
    secondChoice = this.datasetsList.getFirstDatasetId();
  if (firstChoice) return this.getDataset(firstChoice);
  else if (secondChoice) return this.getDataset(secondChoice);
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

// Get the dataset with given id (or undefined)
DocumentHandler.prototype.dataInstanceExist = function (id) {
  for (let i = 0; i < this.datasets.current.length; i++) {
    if (this.datasets.current[i].dataInstanceId === id) return true;
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
      return self.isReady('documentView', true);
    });
  }
  // Init datasetForm First
  if (opts.datasetForm) {
    this.datasetForm = opts.datasetForm;
    this.isReady('datasetForm', true);
    this.datasetForm.loadResources(this.datatypes);
    console.log('datasetForm ready !');
  }
  // the datasetsList
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
    this.documentView.attach('onDatasetClick', function (sentence) {});
    this.documentView.attach('onSentenceClick', function (sentence) {
      return self.selectSentence({ id: sentence.sentenceId, disableSelection: true });
    });
    this.documentView.attach('onFulltextView', function () {
      return self.refreshSentencesMapping();
    });
    this.documentView.attach('onSectionView', function () {
      return self.refreshSentencesMapping();
    });
    this.documentView.attach('onParagraphView', function () {
      return self.refreshSentencesMapping();
    });
    this.documentView.attach('onPdfView', function () {
      return self.refreshSentencesMapping();
    });
  }
  if (this.datasetsList) {
    // Attach datasetsList events
    this.datasetsList.attach('onDatasetLoaded', function (dataset) {
      // console.log(dataset);
    });
    this.datasetsList.attach('onDatasetClick', function (dataset) {
      // console.log(dataset);
      self.selectSentence({
        id: dataset.sentenceId,
        selectedDatasetId: dataset.id
      });
    });
    this.datasetsList.attach('onDatasetCheck', function (dataset) {
      // console.log(dataset);
    });
    this.datasetsList.attach('onDatasetDelete', function (dataset) {
      let nextDataset = self.getNextDataset(dataset.id),
        nextId = nextDataset.id ? nextDataset.id : undefined;
      return self.deleteDataset(dataset.id, function () {
        return self.selectSentence({ id: nextDataset.sentences[0].id, selectedDatasetId: nextId });
      });
    });
    this.datasetsList.attach('onDatasetLink', function (dataset) {
      let selectedSentences = self.documentView.getSelectedSentences();
      if (selectedSentences.length === 0)
        return self.showModalError({
          title: 'Error: Link sentence to dataset',
          body: 'You must select a sentence before linking it to the dataset'
        });
      else
        return self.newLinks({ datasetId: dataset.id, sentences: selectedSentences }, function (err, dataset) {
          if (err) return console.log(err);
          return self.selectSentence({ id: selectedSentences[selectedSentences.length - 1].sentenceId });
        });
    });
    this.datasetsList.attach('onNewDatasetClick', function () {
      let selectedSentences = self.documentView.getSelectedSentences();
      if (selectedSentences.length === 0)
        return self.showModalError({
          title: 'Error: New dataset',
          body: 'You must select a sentence to create a new dataset'
        });
      else
        return self.newDataset(selectedSentences, function (err, dataset) {
          if (err) return console.log(err);
          return self.selectSentence({ id: dataset.sentences[0].id, selectedDatasetId: dataset.id });
        });
    });
    this.datasetsList.attach('onMergeSelectionClick', function (ids) {
      // console.log(ids);
      if (ids.length <= 1)
        return self.showModalError({
          title: 'Error: Merge selection',
          body: 'You must select at least two datasets'
        });
      else {
        let id = ids[0].id,
          dataset = self.getDataset(id);
        return self.mergeDatasets(ids, function () {
          return self.selectSentence({ id: dataset.sentences[0].id, selectedDatasetId: id });
        });
      }
    });
    this.datasetsList.attach('onDeleteSelectionClick', function (ids) {
      // console.log(ids);
      if (ids.length <= 0)
        return self.showModalError({
          title: 'Error: Delete selection',
          body: 'You must select at least one dataset'
        });
      else {
        let dataset = self.getNextDataset(ids[ids.length - 1].id),
          nextId = dataset.id;
        return self.deleteDatasets(ids, function () {
          return self.selectSentence({ id: dataset.sentences[0].id, selectedDatasetId: nextId });
        });
      }
    });
  }
  if (this.datasetForm) {
    // Attach datasetsList events
    this.datasetForm.attach('onPropertyChange', function (property, value) {
      // console.log(property, value);
      let dataset = self.datasetForm.getDataset();
      self.modified(dataset.id);
      self.updateDataset(dataset.id, dataset);
      self.autoSave(dataset.id);
      if (property === 'highlight')
        if (value) self.datasetsList.highlight(dataset.id);
        else self.datasetsList.unhighlight(dataset.id);
    });
    this.datasetForm.attach('onLeave', function () {
      let dataset = self.datasetForm.getDataset();
      self.saveDataset(dataset.id);
    });
    this.datasetForm.attach('onDatasetIdClick', function (dataset) {
      // console.log(dataset);
      if (dataset.sentenceId) return self.selectSentence({ id: dataset.sentenceId, selectedDatasetId: dataset.id });
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
      let nextDataset = self.getNextDataset(dataset.id),
        nextId = nextDataset.id ? nextDataset.id : undefined;
      return self.selectSentence({ id: dataset.sentenceId, selectedDatasetId: nextId });
    });
    this.datasetForm.attach('onDatasetUnlinkClick', function (dataset) {
      let sentence = self.datasetForm.currentSentence(),
        modifiedDataset = self.getDataset(dataset.id);
      if (!modifiedDataset) return console.log('bad dataset id');
      if (!modifiedDataset.sentences) return console.log('empty sentences');
      if (modifiedDataset.sentences.length === 1) {
        let nextDataset = self.getNextDataset(dataset.id),
          nextId = nextDataset.id ? nextDataset.id : undefined;
        return self.deleteDataset(dataset.id, function () {
          return self.selectSentence({ id: nextDataset.sentences[0].id, selectedDatasetId: nextId });
        });
      } else
        return self.deleteLink({ id: dataset.id, sentence: sentence }, function (err) {
          if (err) return console.log(err);
          return self.selectSentence({ id: sentence.id });
        });
    });
    this.datasetForm.attach('onTabClick', function (data) {
      console.log('onTabClick');
      return self.selectSentence({ id: data.sentence.id, selectedDatasetId: data.dataset.id });
    });
    this.datasetForm.attach('onRefreshDatatypesClick', function (done) {
      return DataSeerAPI.resyncJsonDataTypes(function (err, res) {
        console.log(err, res);
        return done();
      });
    });
    this.datasetForm.attach('onDisplayLeftClick', function () {
      self.documentView.displayRight();
    });
    this.datasetForm.attach('onDisplayRightClick', function () {
      self.documentView.displayLeft();
    });
  }
};
