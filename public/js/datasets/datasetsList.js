/*
 * @prettier
 */

'use strict';

const DatasetsList = function (id = `datasetsList`, events = {}) {
  let self = this;
  this.id = id;
  this.container = $(`#${this.id} #datasetsList\\.container\\.items\\.container`); // container of datasets
  this.scrollContainer = $(`#${this.id} #datasetsList\\.container\\.items`); // container with scroll
  this.message = $(`#${this.id} #datasetsList\\.container\\.items\\.message`);
  this.events = events;
  this.animationFinished = true;
  this.sentencesMapping = undefined;
  this.debouncedScroll = _.debounce(
    function (position) {
      self.scrollContainer.animate({ scrollLeft: position }, 200);
    },
    500,
    { leading: true, trailing: true }
  );
  // on mouse scroll
  this.scrollContainer.get(0).addEventListener(
    `wheel`,
    function (e) {
      if (self.animationFinished) {
        let element = $(this);
        self.animationFinished = false;
        let scroll = e.deltaY > 0 ? 250 : -250,
          position = Math.round(element.scrollLeft() + scroll);
        // element.scrollLeft(position);
        // self.animationFinished = true;
        element.animate({ scrollLeft: position }, 300, function () {
          self.animationFinished = true;
        });
      }
    },
    { passive: true }
  );
  // onNewDatasetClick
  $(`#${this.id} #datasetsList\\.container\\.bulkActions\\.newDataset`).click(function () {
    if (typeof self.events.onNewDatasetClick === `function`) return self.events.onNewDatasetClick();
  });
  // onMergeSelectionClick
  $(`#${this.id} #datasetsList\\.container\\.bulkActions\\.mergeSelection`).click(function () {
    if (typeof self.events.onMergeSelectionClick === `function`)
      return self.events.onMergeSelectionClick(self.getCheckedItems());
  });
  // onNewDatasetClick
  $(`#${this.id} #datasetsList\\.container\\.bulkActions\\.deleteSelection`).click(function () {
    if (typeof self.events.onDeleteSelectionClick === `function`)
      return self.events.onDeleteSelectionClick(self.getCheckedItems());
  });
  // onImportDatasetsClick
  $(`#${this.id} #datasetsList\\.container\\.bulkActions\\.importDatasets`).click(function () {
    if (typeof self.events.onImportDatasetsClick === `function`) return self.events.onImportDatasetsClick();
  });
  // onDetectNewSentencesClick
  $(`#${this.id} #datasetsList\\.container\\.bulkActions\\.detectNewSentences`).click(function () {
    if (typeof self.events.onDetectNewSentencesClick === `function`) return self.events.onDetectNewSentencesClick();
  });
  this.setInitialazingMessage();
  return this;
};

// Reorder an array
DatasetsList.prototype.getDatasetsIds = function (id) {
  let datasets = this.container
    .find(`.item[sentences]`)
    .map(function (index, elem) {
      return { id: $(elem).attr(`value`), status: $(elem).find(`[key="dataset\\.status"]`).attr(`value`) };
    })
    .get();
  if (typeof id === `string`) {
    let index = datasets.reduce(
      function (acc, item) {
        if (!acc.continue) return acc;
        acc.continue = acc.id !== item.id;
        acc.index++;
        return acc;
      },
      { continue: true, index: -1, id: id }
    ).index;
    if (index > -1) datasets = datasets.slice(index + 1).concat(datasets.slice(0, index + 1));
  }
  return datasets;
};

// Get the first not "valid" dataset (or undefined)
DatasetsList.prototype.getFirstDatasetIdNotValid = function (id) {
  let datasets = this.getDatasetsIds(id);
  for (let i = 0; i < datasets.length; i++) {
    if (datasets[i].status !== `valid`) return datasets[i].id;
  }
  return null;
};

// Get the first dataset (or undefined)
DatasetsList.prototype.getFirstDatasetId = function () {
  return this.container.find(`.item[sentences]:first-child`).attr(`value`);
};

// Set mapping of sentences
DatasetsList.prototype.setSentencesMapping = function (sentencesMapping) {
  this.sentencesMapping = sentencesMapping;
  this.sortItems();
};

// Get first sentence
DatasetsList.prototype.getFirstSentenceOf = function (json) {
  return JSON.parse(json)[0];
};

// Refresh order of items
DatasetsList.prototype.sortItems = function () {
  let self = this;
  this.container
    .find(`.item[sentences]`)
    .sort(function (a, b) {
      let aPos = self.sentencesMapping[self.getFirstSentenceOf($(a).attr(`sentences`)).id],
        bPos = self.sentencesMapping[self.getFirstSentenceOf($(b).attr(`sentences`)).id],
        aIsInteger = Number.isInteger(aPos),
        bIsInteger = Number.isInteger(bPos);
      if (aIsInteger && !bIsInteger) return -1;
      if (!aIsInteger && bIsInteger) return 1;
      if (!aIsInteger && !bIsInteger) return 0;
      return aPos - bPos;
    })
    .appendTo(this.container);
};

// Return icon for a given actionRequired
DatasetsList.prototype.getIconOfActionRequired = function (actionRequired, status) {
  let i = $(`<i>`);
  if (actionRequired === `No` || actionRequired === `Optionnal`)
    i.addClass(`fas fa-check success-color-dark`).attr(`title`, status);
  else if (actionRequired === `Yes`) i.addClass(`far fa-save success-color-dark`).attr(`title`, status);
  else i.addClass(`far fa-question-circle`).attr(`title`, `Unknow status`);
  return i;
};

// Attach event
DatasetsList.prototype.attach = function (event, fn) {
  this.events[event] = fn;
};

// Scroll to a given dataset
DatasetsList.prototype.scrollTo = function (id) {
  let element = this.container.find(`.item[key="dataset.id"][value="${id}"]`),
    previous = element.prev(),
    position = Math.round(
      element.position().left + this.scrollContainer.scrollLeft() - this.scrollContainer.width() / 2
    );
  this.debouncedScroll(position);
};

// Get checked ids
DatasetsList.prototype.getCheckedItems = function () {
  return this.container
    .find(`.item.checked`)
    .get()
    .map(function (item) {
      return { id: $(item).attr(`value`), checked: true };
    });
};

// Get checked ids
DatasetsList.prototype.getSelectedItem = function () {
  return this.container
    .find(`.item.selected`)
    .get()
    .map(function (item) {
      let el = $(item);
      return { id: el.attr(`value`), checked: el.hasClass(`checked`) };
    });
};

// Refresh Empty Message display
DatasetsList.prototype.refreshMsg = function () {
  let items = this.container.children(`.item`);
  if (items.length > 0) {
    this.scrollContainer.css(`overflow-x`, `scroll`);
    this.message.hide();
  } else this.setEmptyMessage();
};

// Set Empty datasetsList Message
DatasetsList.prototype.setEmptyMessage = function () {
  this.scrollContainer.css(`overflow-x`, `auto`);
  this.message.show();
  this.message.text(`DataSeer has not detected any datasets in this document`);
};

// Set Intializing datasetsList Message
DatasetsList.prototype.setInitialazingMessage = function () {
  this.scrollContainer.css(`overflow-x`, `auto`);
  this.message.text(`Populating datasets list...`);
  this.message.show();
};

// Load some datasets
DatasetsList.prototype.load = function (datasets = [], cb) {
  let self = this;
  return async.eachSeries(
    datasets,
    function (dataset, callback) {
      self.add(dataset);
      if (typeof self.events.onDatasetLoaded === `function`) self.events.onDatasetLoaded(dataset);
      return callback();
    },
    function (err) {
      return cb(err);
    }
  );
};

// Unload some datasets
DatasetsList.prototype.unload = function (datasets, cb) {
  let self = this;
  if (!datasets || !Array.isArray(datasets)) {
    this.container.empty();
    return cb();
  }
  return async.eachSeries(
    datasets,
    function (dataset, callback) {
      self.delete(dataset);
      if (typeof self.events.onDatasetUnloaded === `function`) self.events.onDatasetUnloaded(dataset);
      return callback();
    },
    function (err) {
      return cb(err);
    }
  );
};

// Add a dataset
DatasetsList.prototype.add = function (dataset) {
  if (!Array.isArray(dataset.sentences) || !dataset.sentences.length || typeof dataset.sentences[0] === `undefined`)
    return;
  let self = this,
    label = dataset.name ? dataset.name : dataset.id,
    elements = {
      item: $(`<div>`)
        .addClass(`item`)
        .attr(`key`, `dataset.id`)
        .attr(`value`, dataset.id)
        .attr(`sentences`, JSON.stringify(dataset.sentences))
        .attr(`sentence`, dataset.sentences[0].id)
        .css(`background-color`, dataset.color.background.rgba)
        .css(`border-color`, dataset.color.background.rgba),
      label: $(`<div>`)
        .attr(`key`, `dataset.label`)
        .attr(`value`, label)
        .attr(`title`, `Click here to work on this Dataset`)
        .css(`color`, dataset.color.foreground)
        .append($(`<div>`).text(label).addClass(`noselect`)),
      actionRequired: $(`<div>`)
        .attr(`key`, `dataset.actionRequired`)
        .attr(`value`, dataset.actionRequired)
        .attr(`title`, dataset.status)
        .append(this.getIconOfActionRequired(dataset.actionRequired, dataset.status)),
      checked: $(`<div>`)
        .attr(`key`, `dataset.checked`)
        .attr(`value`, false)
        .attr(`title`, `Click here to add this Dataset to the selection`)
        .append($(`<i>`).addClass(`far fa-check-square`).attr(`title`, `This Dataset is not in the selection`)),
      link: $(`<button>`)
        .addClass(`btn btn-primary btn-sm btn-lite`)
        .attr(`title`, `Link the selected sentence to this dataset`)
        .attr(`name`, `datasetsList.link`)
        .append($(`<i>`).addClass(`fas fa-link`)),
      delete: $(`<button>`)
        .addClass(`btn btn-danger btn-sm btn-lite`)
        .attr(`title`, `Delete this dataset`)
        .attr(`name`, `datasetsList.delete`)
        .append($(`<i>`).addClass(`far fa-trash-alt`))
    };
  if (dataset.highlight) elements.item.addClass(`highlight`);
  elements.item
    .append(elements.label)
    .append(elements.checked)
    .append(elements.link)
    .append(elements.delete)
    .append(elements.actionRequired);
  this.container.append(elements.item);
  // sort elements by sentence Ids
  if (this.sentencesMapping) this.sortItems();
  this.refreshMsg();
  // events
  elements.item.click(function (event) {
    self.select(dataset.id);
    self.scrollTo(dataset.id);
    let elem = $(this);
    if (typeof self.events.onDatasetClick === `function`) {
      let sentences = JSON.parse(elem.attr(`sentences`)),
        currentSentenceId = elem.attr(`sentence`),
        nextSentence = sentences.reduce(function (acc, item) {
          if (acc === false) acc = item;
          if (item.id === currentSentenceId) acc = false;
          return acc;
        }, false),
        nextSentenceId = nextSentence === false ? sentences[0].id : nextSentence.id;
      elem.attr(`sentence`, nextSentenceId);
      return self.events.onDatasetClick({
        id: dataset.id,
        sentences: sentences,
        sentence: { id: currentSentenceId },
        checked: elem.hasClass(`checked`)
      });
    }
  });
  elements.link.click(function (event) {
    event.preventDefault();
    event.stopPropagation();
    let item = self.container.find(`.item[key="dataset.id"][value="${dataset.id}"]`),
      checked = item.children(`[key="dataset.checked"]`),
      i = checked.children(`i`),
      isChecked = checked.attr(`value`) !== `true`;
    if (typeof self.events.onDatasetLink === `function`)
      return self.events.onDatasetLink({ id: dataset.id, sentences: dataset.sentences, checked: isChecked });
  });
  elements.delete.click(function (event) {
    event.preventDefault();
    event.stopPropagation();
    let item = self.container.find(`.item[key="dataset.id"][value="${dataset.id}"]`),
      checked = item.children(`[key="dataset.checked"]`),
      i = checked.children(`i`),
      isChecked = checked.attr(`value`) !== `true`;
    if (typeof self.events.onDatasetDelete === `function`)
      return self.events.onDatasetDelete({ id: dataset.id, sentences: dataset.sentences, checked: isChecked });
  });
  elements.checked.click(function (event) {
    event.preventDefault();
    event.stopPropagation();
    let item = self.container.find(`.item[key="dataset.id"][value="${dataset.id}"]`),
      checked = item.children(`[key="dataset.checked"]`),
      i = checked.children(`i`),
      isChecked = checked.attr(`value`) !== `true`;
    checked.attr(`value`, isChecked);
    if (isChecked) {
      i.attr(`title`, `This Dataset is in the selection`);
      checked.attr(`title`, `Click here to remove this Dataset to the selection`);
      item.addClass(`checked`);
    } else {
      i.attr(`title`, `This Dataset is not in the selection`);
      checked.attr(`title`, `Click here to add this Dataset to the selection`);
      item.removeClass(`checked`);
    }
    if (typeof self.events.onDatasetCheck === `function`)
      return self.events.onDatasetCheck({ id: dataset.id, sentences: dataset.sentences, checked: isChecked });
  });
};

// Update a dataset
DatasetsList.prototype.update = function (id, dataset) {
  let element = this.container.find(`.item[key="dataset.id"][value="${id}"]`);
  if (!element.get().length) return false;
  let label = dataset.name ? dataset.name : dataset.id;
  this.setActionRequired(dataset.id, dataset.actionRequired, dataset.status);
  element.attr(`sentences`, JSON.stringify(dataset.sentences));
  element.find(`div[key="dataset.label"]`).attr(`value`, label).find(`div.noselect`).text(label);
};

// Delete a dataset
DatasetsList.prototype.delete = function (id) {
  this.container.find(`.item[key="dataset.id"][value="${id}"]`).remove();
  this.refreshMsg();
};

// Check if a dataset is selected
DatasetsList.prototype.isSelected = function (id) {
  let dataset = this.container.find(`.item[key="dataset.id"][value="${id}"]`);
  if (!dataset.get().length) return new Error(`Invalid dataset-id`);
  return dataset.hasClass(`selected`);
};

// Check if a dataset is checked
DatasetsList.prototype.isChecked = function (id) {
  let dataset = this.container.find(`.item[key="dataset.id"][value="${id}"]`);
  if (!dataset.get().length) return new Error(`Invalid dataset-id`);
  return dataset.hasClass(`checked`);
};

// Select a dataset
DatasetsList.prototype.select = function (id) {
  let dataset = this.container.find(`.item[key="dataset.id"][value="${id}"]`);
  if (!dataset.get().length) return false;
  this.container.find(`.item.selected`).removeClass(`selected`);
  dataset.addClass(`selected`);
  this.scrollTo(id);
  return true;
};

// Unselect a dataset
DatasetsList.prototype.unselect = function (id) {
  if (!id) return this.container.find(`.item`).removeClass(`selected`);
  let dataset = this.container.find(`.item[key="dataset.id"][value="${id}"]`);
  if (!dataset.get().length) return false;
  if (dataset.hasClass(`selected`)) dataset.removeClass(`selected`);
  return true;
};

// Select a dataset
DatasetsList.prototype.check = function (id) {
  let dataset = this.container.find(`.item[key="dataset.id"][value="${id}"]`);
  if (!dataset.get().length) return false;
  if (dataset.hasClass(`checked`)) dataset.removeClass(`checked`);
  else {
    this.container.find(`.item checked`).removeClass(`checked`);
    dataset.addClass(`checked`);
  }
  return true;
};

// Unselect a dataset
DatasetsList.prototype.uncheck = function (id) {
  let dataset = this.container.find(`.item[key="dataset.id"][value="${id}"]`);
  if (!dataset.get().length) return false;
  if (dataset.hasClass(`checked`)) dataset.removeClass(`checked`);
  return true;
};

// Set status to a dataset
DatasetsList.prototype.setActionRequired = function (id, actionRequired, status) {
  return this.container
    .find(`.item[key="dataset.id"][value="${id}"] div[key="dataset.actionRequired"]`)
    .empty()
    .append(this.getIconOfActionRequired(actionRequired, status));
};

// Highlight a dataset
DatasetsList.prototype.highlight = function (id) {
  return this.container.find(`.item[key="dataset.id"][value="${id}"]`).addClass(`highlight`);
};

// Unhighlight a dataset
DatasetsList.prototype.unhighlight = function (id) {
  return this.container.find(`.item[key="dataset.id"][value="${id}"]`).removeClass(`highlight`);
};

// Color a dataset
DatasetsList.prototype.color = function (id, color) {
  return this.container
    .find(`.item[key="dataset.id"][value="${id}"]`)
    .css(`background-color`, color.background)
    .css(`color`, color.foreground);
};

// Uncolor a dataset
DatasetsList.prototype.uncolor = function (id) {
  return this.container.find(`.item[key="dataset.id"][value="${id}"]`).css(`background-color`, ``).css(`color`, ``);
};

// Set status "modified"
DatasetsList.prototype.modified = function () {};

// Set status "loading"
DatasetsList.prototype.loading = function (id) {};

// Merge some datasets (into the first)
DatasetsList.prototype.merge = function (datasets) {};
