/*
 * @prettier
 */

'use strict';

const DatasetForm = function (id = `datasetForm`, events = {}) {
  let self = this;
  this.id = id;
  this.screen = $(`#${this.id}\\.screen`);
  this.container = $(`#${this.id} #datasetForm\\.container`); // container of datasetForm
  this.message = $(`#${this.id} #datasetForm\\.message`);
  this.datasetsTabs = this.container.find(`div[key="datasets"]`); // datasets list
  this.datasetTab = this.datasetsTabs.find(`div.tpl[key="datasets"]`); // dataset tab tpl
  this.resources = {
    metadata: {},
    dataTypes: {},
    subTypes: {}
  };
  this.defaultDataType = undefined; // will contain the default dataType
  this.dataset = {};
  this.events = events;
  this.buttons = {
    'display-left': this.screen.find(`.task-bar button[name="display-left"]`),
    'display-middle': this.screen.find(`.task-bar button[name="display-middle"]`),
    'display-right': this.screen.find(`.task-bar button[name="display-right"]`),
    'hide': this.screen.find(`.task-bar button[name="hide"]`),
    'show': this.screen.find(`.task-bar button[name="show"]`)
  };
  // On button click
  this.buttons[`display-left`].click(function () {
    self.screen.removeClass().addClass(`display-left`);
    self.hide();
    self.show();
    if (typeof self.events.onDisplayLeftClick === `function`) return self.events.onDisplayLeftClick();
  });
  this.buttons[`display-middle`].click(function () {
    self.screen.removeClass().addClass(`display-middle`);
    self.hide();
    self.show();
  });
  this.buttons[`display-right`].click(function () {
    self.screen.removeClass().addClass(`display-right`);
    self.hide();
    self.show();
    if (typeof self.events.onDisplayRightClick === `function`) return self.events.onDisplayRightClick();
  });
  this.buttons[`hide`].click(function () {
    self.hide();
  });
  this.buttons[`show`].click(function () {
    self.show();
  });
  // onDatasetIdClick
  $(`#${this.id} div[key="dataset\\.id"], #${this.id} div[key="dataset\\.label"]`)
    .parent()
    .click(function () {
      if (typeof self.events.onDatasetIdClick === `function`) return self.events.onDatasetIdClick(self.getDataset());
    });
  // onDatasetDoneClick
  $(`#${this.id} button[name="datasetForm\\.done"]`).click(function () {
    if (typeof self.events.onDatasetDoneClick === `function`) return self.events.onDatasetDoneClick(self.getDataset());
  });
  // onDatasetUnlinkClick
  $(`#${this.id} button[name="datasetForm\\.unlink"]`).click(function (event) {
    event.stopPropagation();
    if (typeof self.events.onDatasetUnlinkClick === `function`)
      return self.events.onDatasetUnlinkClick(self.getDataset());
  });
  // onRefreshDatatypesClick
  $(`#${this.id} button[name="datasetForm\\.refreshDatatypes"]`).click(function () {
    let el = $(this);
    if (el.attr(`loading`).toString() === `false` && typeof self.events.onRefreshDatatypesClick === `function`) {
      el.attr(`loading`, true);
      el.find(`.fa-sync-alt`).addClass(`fa-spin`);
      el.find(`.fa-sync-alt`).addClass(`fa-pulse`);
      return self.events.onRefreshDatatypesClick(function () {
        el.attr(`loading`, false);
        el.find(`.fa-sync-alt`).removeClass(`fa-spin`);
        el.find(`.fa-sync-alt`).removeClass(`fa-pulse`);
      });
    }
  });
  // input text event
  this.container.find(`input[type="text"]`).bind(`input propertychange`, function (event) {
    let el = $(this),
      target = el.attr(`target`).replace(`dataset.`, ``);
    if (typeof self.properties[target] === `function`) {
      self.properties[target](el.val());
      if (typeof self.events.onPropertyChange === `function`)
        self.events.onPropertyChange(target, self.properties[target]());
    }
  });
  this.container.find(`input[type="text"]`).focusout(function (event) {
    let el = $(this),
      target = el.attr(`target`).replace(`dataset.`, ``);
    if (target === `name`)
      self.refreshRRIDURL(el.val(), function () {
        if (typeof self.events.onPropertyChange === `function`)
          self.events.onPropertyChange(target, self.properties[target]());
      });
    if (typeof self.events.onLeave === `function`) self.events.onLeave(target, self.properties[target]());
  });
  // input checkbox event
  this.container.find(`input[type="checkbox"]`).bind(`input propertychange`, function (event) {
    let el = $(this),
      target = el.attr(`target`).replace(`dataset.`, ``);
    if (typeof self.properties[target] === `function`) {
      self.properties[target](el.prop(`checked`));
      if (typeof self.events.onPropertyChange === `function`)
        self.events.onPropertyChange(target, self.properties[target]());
    }
  });
  this.container.find(`input[type="checkbox"]`).focusout(function (event) {
    let el = $(this),
      target = el.attr(`target`).replace(`dataset.`, ``);
    if (typeof self.events.onLeave === `function`) self.events.onLeave(target, self.properties[target]());
  });
  // select event
  this.container.find(`select`).bind(`input propertychange`, function (event) {
    let el = $(this),
      option = el.find(`option:selected`),
      target = el.attr(`target`).replace(`dataset.`, ``),
      value = option.attr(`value`);
    if (typeof self.properties[target] === `function`) {
      self.properties[target](value);
      if (target === `dataType` || target === `subType`)
        return self.setRepos(function () {
          if (typeof self.events.onPropertyChange === `function`)
            return self.events.onPropertyChange(target, self.properties[target]());
        });
      if (typeof self.events.onPropertyChange === `function`)
        self.events.onPropertyChange(target, self.properties[target]());
    }
  });
  this.container.find(`select`).focusout(function (event) {
    let el = $(this),
      target = el.attr(`target`).replace(`dataset.`, ``);
    if (typeof self.events.onLeave === `function`) self.events.onLeave(target, self.properties[target]());
  });
  // textarea event
  this.container.find(`textarea`).bind(`input propertychange`, function (event) {
    let el = $(this),
      target = el.attr(`target`).replace(`dataset.`, ``);
    if (typeof self.properties[target] === `function`) {
      self.properties[target](el.val());
      if (typeof self.events.onPropertyChange === `function`)
        self.events.onPropertyChange(target, self.properties[target]());
    }
  });
  this.container.find(`textarea`).focusout(function (event) {
    let el = $(this),
      target = el.attr(`target`).replace(`dataset.`, ``);
    if (typeof self.events.onLeave === `function`) self.events.onLeave(target, self.properties[target]());
  });
  // Set or get a property
  this.properties = {
    id: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.id;
      self.container.find(`div[key="dataset\\.id"]`).attr(`value`, value).text(value);
      self.dataset.id = value;
      // input change behaviors
      self.updateLabel(value);
      // ----------------------
      return self.dataset.id;
    },
    status: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.status;
      self.container
        .find(`div[key="dataset\\.status"]`)
        .attr(`value`, value)
        .empty()
        .append(self.getIconOfStatus(value));
      self.dataset.status = value;
      return self.dataset.status;
    },
    reuse: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.reuse;
      let reuse = value === `false` || value === false ? false : !!value;
      self.container.find(`div[key="dataset\\.reuse"]`).attr(`value`, reuse);
      if (inputs) self.container.find(`input[type="checkbox"][name="datasetForm\\.reuse"]`).prop(`checked`, reuse);
      self.dataset.reuse = reuse;
      // input change behaviors
      self.refreshDatatypeInfos(); // refresh dataType infos
      // ----------------------
      return self.dataset.reuse;
    },
    qc: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.qc;
      let qc = value === `false` || value === false ? false : !!value;
      self.container.find(`div[key="dataset\\.qc"]`).attr(`value`, qc);
      if (inputs) self.container.find(`input[type="checkbox"][name="datasetForm\\.qc"]`).prop(`checked`, qc);
      self.dataset.qc = qc;
      // input change behaviors
      // ----------------------
      return self.dataset.qc;
    },
    representativeImage: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.representativeImage;
      let representativeImage = value === `false` || value === false ? false : !!value;
      self.container.find(`div[key="dataset\\.representativeImage"]`).attr(`value`, representativeImage);
      if (inputs)
        self.container
          .find(`input[type="checkbox"][name="datasetForm\\.representativeImage"]`)
          .prop(`checked`, representativeImage);
      self.dataset.representativeImage = representativeImage;
      // input change behaviors
      // ----------------------
      return self.dataset.representativeImage;
    },
    issue: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.issue;
      let issue = value === `false` || value === false ? false : !!value;
      self.container.find(`div[key="dataset\\.issue"]`).attr(`value`, issue);
      if (inputs) self.container.find(`input[type="checkbox"][name="datasetForm\\.issue"]`).prop(`checked`, issue);
      self.dataset.issue = issue;
      // input change behaviors
      // ----------------------
      return self.dataset.issue;
    },
    issues: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.issues;
      let issues = Array.isArray(value) ? value : [];
      self.dataset.issues = issues;
      // input change behaviors
      // ----------------------
      return self.dataset.issues;
    },
    dataType: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.dataType;
      self.container.find(`div[key="dataset\\.dataType"]`).attr(`value`, value);
      let option = self.container.find(`select[name="datasetForm\\.dataType"] option[value="${value}"]`);
      if (inputs) {
        option.prop(`selected`, true);
      }
      if (option.length === 0) {
        self.properties[`customDataType`](value, true);
        self.dataset.dataType = ``;
        self.container.find(`select[name="datasetForm\\.dataType"] option:first-child`).prop(`selected`, true);
      } else self.dataset.dataType = value;
      // input change behaviors
      self.setSubtypes(); // set subtypes
      self.refreshDatatypeInfos(); // refresh dataType infos
      // ----------------------
      return self.dataset.dataType;
    },
    subType: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.subType;
      self.container.find(`div[key="dataset\\.subType"]`).attr(`value`, value);
      if (inputs)
        self.container.find(`select[name="datasetForm\\.subType"] option[value="${value}"]`).prop(`selected`, true);
      self.dataset.subType = value;
      // input change behaviors
      self.refreshDatatypeInfos(); // refresh dataType infos
      // ----------------------
      return self.dataset.subType;
    },
    customDataType: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.customDataType;
      self.container.find(`div[key="dataset\\.customDataType"]`).attr(`value`, value);
      if (inputs) self.container.find(`input[type="text"][name="datasetForm\\.customDataType"]`).val(value);
      self.dataset.customDataType = value;
      return self.dataset.customDataType;
    },
    description: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.description;
      let text = value === `` ? `n/a` : value;
      self.container.find(`div[key="dataset\\.description"]`).attr(`value`, value).html(text);
      self.dataset.description = value;
      return self.dataset.description;
    },
    bestDataFormatForSharing: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.bestDataFormatForSharing;
      let text = value === `` ? `n/a` : value;
      self.container.find(`div[key="dataset\\.bestDataFormatForSharing"]`).attr(`value`, value).html(text);
      self.dataset.bestDataFormatForSharing = value;
      return self.dataset.bestDataFormatForSharing;
    },
    url: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.url;
      let data = value === `` ? `http://wiki.dataseer.ai/doku.php` : value;
      self.container.find(`a[key="dataset\\.url"]`).attr(`value`, data).attr(`href`, data);
      self.dataset.url = data;
      return self.dataset.url;
    },
    mostSuitableRepositories: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.mostSuitableRepositories;
      let text = value === `` ? `n/a` : value;
      self.container.find(`div[key="dataset\\.mostSuitableRepositories"]`).attr(`value`, value).html(text);
      self.dataset.mostSuitableRepositories = value;
      return self.dataset.mostSuitableRepositories;
    },
    bestPracticeForIndicatingReUseOfExistingData: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.bestPracticeForIndicatingReUseOfExistingData;
      let text = value === `` ? `n/a` : value;
      self.container
        .find(`div[key="dataset\\.bestPracticeForIndicatingReUseOfExistingData"]`)
        .attr(`value`, value)
        .html(text);
      self.dataset.bestPracticeForIndicatingReUseOfExistingData = value;
      return self.dataset.bestPracticeForIndicatingReUseOfExistingData;
    },
    highlight: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.highlight;
      let highlight = value === `false` ? false : !!value;
      self.container.find(`div[key="dataset\\.highlight"]`).attr(`value`, highlight);
      if (inputs)
        self.container.find(`input[type="checkbox"][name="datasetForm\\.highlight"]`).prop(`checked`, highlight);
      self.dataset.highlight = highlight;
      return self.dataset.highlight;
    },
    notification: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.notification;
      self.container.find(`div[key="dataset\\.notification"]`).attr(`value`, value).text(value);
      if (inputs) self.container.find(`input[type="text"][name="datasetForm\\.notification"]`).val(value);
      self.dataset.notification = value;
      // input change behaviors
      // Hide notification if empty, else show
      if (!self.dataset.notification) self.container.find(`div[key="dataset\\.notification"]`).hide();
      else self.container.find(`div[key="dataset\\.notification"]`).show();
      // ----------------------
      return self.dataset.notification;
    },
    repoRecommenderUrls: function (values, inputs = false) {
      if (typeof values === `undefined`) return self.dataset.repoRecommenderUrls;
      let data = !Array.isArray(values) ? [] : values;
      let element = self.container.find(`div[key="dataset\\.repoRecommenderUrls"]`);
      element.attr(`value`, JSON.stringify(values));
      element.empty();
      let list = $(`<ol>`);
      data.map(function (item) {
        if (item.url) list.append(`<li><a target="_blank" href="${item.url}">${item.label}</a></li>`);
        else list.append(`<li>${item.label}</li>`);
      });
      element.append(list);
      self.dataset.repoRecommenderUrls = data;
      // ----------------------
      return self.dataset.repoRecommenderUrls;
    },
    RRIDUrls: function (data, inputs = false) {
      if (typeof data === `undefined`) return self.dataset.RRIDUrls;
      let RRIDs =
        data !== null && typeof data.RRIDs === `object` && typeof data.RRIDs.values === `object`
          ? Object.keys(data.RRIDs.values)
          : [];
      let element = self.container.find(`div[key="dataset\\.RRIDUrls"]`);
      element.attr(`value`, JSON.stringify(RRIDs));
      element.empty();
      if (data === null) {
        element.append(`<div class="RRIDUrls-header">You must provide an entity* to obtain the suggested RRIDs.</div>`);
      } else {
        self.dataset.RRIDUrls = RRIDs;
        if (data.entity && data.entity.URLs && data.entity.value)
          element.append(
            `<div class="RRIDUrls-header">Suggested RRIDs for the entity* "<a target="_blank" href="${data.entity.URLs.resources}">${data.entity.value}</a>":</div>`
          );
        if (RRIDs.length <= 0) element.append(`<div class="RRIDUrls-results">None</div>`);
        else {
          let list = $(`<ul class="RRIDUrls-results"></ul>`);
          RRIDs.map(function (item) {
            let RRID = data.RRIDs.values[item];
            list.append(
              `<li>${item} <a target="_blank" href="${data.RRIDs.URLs.resources[item]}">(${RRID.name})</a></li>`
            );
          });
          element.append(list);
        }
        if (data.entity && data.entity.URLs && data.entity.value)
          element.append(
            `<div class="RRIDUrls-categories">Result(s) for <a target="_blank" href="${data.entity.URLs.antibody}">Antibodies</a>, ` +
              `<a target="_blank" href="${data.entity.URLs.biosamples}">Biosamples</a>, ` +
              `<a target="_blank" href="${data.entity.URLs.cellLine}">Cell Lines</a>, ` +
              `<a target="_blank" href="${data.entity.URLs.organism}">Organisms</a>, ` +
              `<a target="_blank" href="${data.entity.URLs.plasmid}">Plasmid</a> and ` +
              `<a target="_blank" href="${data.entity.URLs.tool}">Tools</a>.</div>`
          );
      }
      element.append(`<div class="RRIDUrls-sub">*based on the "name" of this dataset</div>`);
      // ----------------------
      return self.dataset.RRIDUrls;
    },
    name: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.name;
      self.container.find(`div[key="dataset\\.name"]`).attr(`value`, value);
      if (inputs) self.container.find(`input[type="text"][name="datasetForm\\.name"]`).val(value);
      self.dataset.name = value;
      // input change behaviors
      self.updateLabel(value);
      // ----------------------
      return self.dataset.name;
    },
    DOI: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.DOI;
      self.container.find(`div[key="dataset\\.DOI"]`).attr(`value`, value);
      if (inputs) self.container.find(`input[type="text"][name="datasetForm\\.DOI"]`).val(value);
      self.dataset.DOI = value;
      return self.dataset.DOI;
    },
    RRID: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.RRID;
      self.container.find(`div[key="dataset\\.RRID"]`).attr(`value`, value);
      if (inputs) self.container.find(`input[type="text"][name="datasetForm\\.RRID"]`).val(value);
      self.dataset.RRID = value;
      return self.dataset.RRID;
    },
    PID: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.PID;
      self.container.find(`div[key="dataset\\.PID"]`).attr(`value`, value);
      if (inputs) self.container.find(`input[type="text"][name="datasetForm\\.PID"]`).val(value);
      self.dataset.PID = value;
      return self.dataset.PID;
    },
    version: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.version;
      self.container.find(`div[key="dataset\\.version"]`).attr(`value`, value);
      if (inputs) self.container.find(`input[type="text"][name="datasetForm\\.version"]`).val(value);
      self.dataset.version = value;
      return self.dataset.version;
    },
    labSource: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.labSource;
      self.container.find(`div[key="dataset\\.labSource"]`).attr(`value`, value);
      if (inputs) self.container.find(`input[type="text"][name="datasetForm\\.labSource"]`).val(value);
      self.dataset.labSource = value;
      return self.dataset.labSource;
    },
    protocolSource: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.protocolSource;
      self.container.find(`div[key="dataset\\.protocolSource"]`).attr(`value`, value);
      if (inputs)
        self.container
          .find(`select[name="datasetForm\\.protocolSource"] option[value="${value}"]`)
          .prop(`selected`, true);
      self.dataset.protocolSource = value;
      return self.dataset.protocolSource;
    },
    catalog: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.catalog;
      self.container.find(`div[key="dataset\\.catalog"]`).attr(`value`, value);
      if (inputs) self.container.find(`input[type="text"][name="datasetForm\\.catalog"]`).val(value);
      self.dataset.catalog = value;
      return self.dataset.catalog;
    },
    citation: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.citation;
      self.container.find(`div[key="dataset\\.citation"]`).attr(`value`, value);
      if (inputs) self.container.find(`input[type="text"][name="datasetForm\\.citation"]`).val(value);
      self.dataset.citation = value;
      return self.dataset.citation;
    },
    entity: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.entity;
      self.container.find(`div[key="dataset\\.entity"]`).attr(`value`, value);
      if (inputs) self.container.find(`input[type="text"][name="datasetForm\\.entity"]`).val(value);
      self.dataset.entity = value;
      return self.dataset.entity;
    },
    comments: function (value, inputs = false) {
      if (typeof value === `undefined`) return self.dataset.comments;
      self.container.find(`div[key="dataset\\.comments"]`).attr(`value`, value);
      if (inputs) self.container.find(`textarea[name="datasetForm\\.comments"]`).val(value);
      self.dataset.comments = value;
      return self.dataset.comments;
    }
  };
  this.setInitialazingMessage();
  return this;
};

// Set RepoRecommender result
DatasetForm.prototype.setRepos = function (cb) {
  let self = this;
  let dataType = this.dataset.dataType ? this.getDatatypeInfos(this.dataset.dataType) : undefined;
  let subType = this.dataset.subType ? this.getDatatypeInfos(this.dataset.dataType, this.dataset.subType) : undefined;
  return API.repoRecommender.findRepo(
    { dataType: dataType ? dataType.label : undefined, subType: subType ? subType.label : undefined },
    function (err, query) {
      console.log(err, query);
      if (!query.err) self.properties.repoRecommenderUrls(query.res);
      else self.properties.repoRecommenderUrls(null);
      return cb();
    }
  );
};

// Refresh RRID URL
DatasetForm.prototype.refreshRRIDURL = function (entity, cb) {
  let self = this;
  if (!entity) {
    // Reset entity results
    self.properties.RRIDUrls(null);
    return cb();
  }
  return API.scicrunch.processEntity({ entity: entity }, function (err, query) {
    if (err || query.err) {
      // Reset entity results
      self.properties.RRIDUrls(null);
    } else {
      self.properties.RRIDUrls(query.res);
    }
    return cb();
  });
};

// update label of dataset
DatasetForm.prototype.updateLabel = function (value = ``) {
  let data = value ? value : this.dataset.id;
  // Update label
  this.container.find(`div[key="dataset\\.label"]`).attr(`value`, data).text(data);
  this.container.find(`div[key="dataset\\.tab"][dataset-id="${this.dataset.id}"]`).attr(`value`, data).text(data);
};

// refresh label of dataset
DatasetForm.prototype.refreshLabel = function () {
  let data = this.dataset.name ? this.dataset.name : this.dataset.id;
  // Update label
  this.container.find(`div[key="dataset\\.label"]`).attr(`value`, data).text(data);
  this.container.find(`div[key="dataset\\.tab"][dataset-id="${this.dataset.id}"]`).attr(`value`, data).text(data);
};

// refresh text of dataset
DatasetForm.prototype.refreshText = function (text) {
  // Update text
  this.container.find(`div[key="sentence\\.text"]`).attr(`value`, text).html(text);
};

// get current dataset id
DatasetForm.prototype.currentId = function () {
  return this.dataset.id;
};

// get current dataset sentence
DatasetForm.prototype.currentSentence = function () {
  return this.dataset.sentence;
};

// get current dataset (API formated)
DatasetForm.prototype.getDataset = function () {
  return {
    id: this.dataset.id,
    status: this.dataset.status,
    reuse: this.dataset.reuse,
    qc: this.dataset.qc,
    representativeImage: this.dataset.representativeImage,
    issue: this.dataset.issue,
    issues: this.dataset.issues,
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
    protocolSource: this.dataset.protocolSource,
    labSource: this.dataset.labSource,
    version: this.dataset.version,
    PID: this.dataset.PID,
    RRID: this.dataset.RRID,
    catalog: this.dataset.catalog,
    citation: this.dataset.citation,
    entity: this.dataset.entity,
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
    return ``;
  else {
    let result = subKey ? this.resources.metadata[id][key][subKey] : this.resources.metadata[id][key];
    return result ? result : ``;
  }
};

// Extract some infos (based on resources)
DatasetForm.prototype.extractInfos = function (keys, properties) {
  let self = this,
    result = {};
  keys.map(function (key) {
    result[key] = {};
    properties.map(function (property) {
      if (typeof property === `string`) result[key][property] = self.getResourceOf(self.dataset[key], property);
      else if (typeof property === `object`)
        result[key][property.key] = self.getResourceOf(self.dataset[key], property.key, property.subKey);
    });
  });
  return result;
};

// Refresh dataType infos (based on resources)
DatasetForm.prototype.refreshDatatypeInfos = function () {
  let self = this,
    properties = [
      `description`,
      `bestDataFormatForSharing`,
      `bestPracticeForIndicatingReUseOfExistingData`,
      { key: `mostSuitableRepositories`, subKey: this.dataset.reuse ? `reuse` : `default` },
      `url`
    ],
    keys = [`dataType`, `subType`],
    metadata = this.extractInfos(keys, properties);
  // Set dataType/subType infos
  properties.map(function (property) {
    if (typeof property === `string`) self.properties[property](``);
    else if (typeof property === `object` && property.key) self.properties[property.key](``);
  });
  properties.map(function (property) {
    keys.map(function (key) {
      if (typeof property === `string`)
        self.properties[property](metadata[key][property] ? metadata[key][property] : undefined);
      else if (typeof property === `object` && property.key)
        self.properties[property.key](metadata[key][property.key] ? metadata[key][property.key] : undefined);
    });
  });
  if (this.dataset.reuse) {
    this.container.find(`div[key="dataset\\.bestDataFormatForSharing"]`).parent().hide();
    this.container.find(`div[key="dataset\\.bestPracticeForIndicatingReUseOfExistingData"]`).parent().show();
  } else {
    this.container.find(`div[key="dataset\\.bestDataFormatForSharing"]`).parent().show();
    this.container.find(`div[key="dataset\\.bestPracticeForIndicatingReUseOfExistingData"]`).parent().hide();
  }
};

// Get dataType infos (based on resources)
DatasetForm.prototype.getDatatypeInfos = function (dataType, subType) {
  let self = this,
    result = {},
    properties = [
      `label`,
      `description`,
      `bestDataFormatForSharing`,
      `bestPracticeForIndicatingReUseOfExistingData`,
      { key: `mostSuitableRepositories`, subKey: this.dataset.reuse ? `reuse` : `default` },
      `url`
    ],
    keys = [`dataType`, `subType`],
    metadata = this.extractInfos(keys, properties);
  // Set dataType/subType infos
  properties.map(function (property) {
    if (typeof property === `string`) result[property] = ``;
    else if (typeof property === `object` && property.key) result[property.key] = ``;
  });
  properties.map(function (property) {
    keys.map(function (key) {
      if (typeof property === `string`)
        result[property] = metadata[key][property] ? metadata[key][property] : result[property];
      else if (typeof property === `object` && property.key)
        result[property.key] = metadata[key][property.key] ? metadata[key][property.key] : result[property.key];
    });
  });
  return result;
};

// Build default options
DatasetForm.prototype.defaultOption = function () {
  return $(`<option>`).text(`None`).attr(`value`, ``);
};

// Build options (datatypes)
DatasetForm.prototype.buildOptions = function (datatypes = []) {
  let options = [this.defaultOption()];
  for (let i = 0; i < datatypes.length; i++) {
    options.push($(`<option>`).text(datatypes[i].label).attr(`value`, datatypes[i].id));
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
    this.container.find(`div[key="dataset\\.customDataType"]`).parent().show();
  else this.container.find(`div[key="dataset\\.customDataType"]`).parent().hide();
};

// Set dataTypes
DatasetForm.prototype.getOptionsInfo = function (ids = []) {
  let self = this;
  return ids
    .map(function (key) {
      if (typeof self.resources.metadata[key] === `object`)
        return {
          id: self.resources.metadata[key].id,
          label: self.resources.metadata[key].label,
          count: self.resources.metadata[key].count ? self.resources.metadata[key].count : 0
        };
      else
        return {
          id: `unknow`,
          label: `unknow`,
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
    select = this.container.find(`select[name="datasetForm\\.dataType"]`);
  select.empty();
  options.map(function (item) {
    select.append(item);
  });
  this.properties[`dataType`](``);
  this.refreshDatatypeView();
};

// Set subTypes
DatasetForm.prototype.setSubtypes = function () {
  let data = this.dataset.dataType ? this.getOptionsInfo(this.resources.dataTypes[this.dataset.dataType]) : [],
    options = this.buildOptions(data),
    select = this.container.find(`select[name="datasetForm\\.subType"]`);
  select.empty();
  options.map(function (item) {
    select.append(item);
  });
  this.properties[`subType`](``);
  this.refreshDatatypeView();
};

// Set view for curator or not
DatasetForm.prototype.setView = function (opts = {}) {
  if (opts.isCurator) {
    this.container.find(`input[type="text"][name="datasetForm\\.notification"]`).parent().show();
    this.container.find(`button[name="datasetForm\\.refreshDatatypes"]`).parent().show();
    this.container.find(`input[type="checkbox"][name="datasetForm\\.highlight"]`).parent().show();
  } else {
    this.container.find(`input[type="text"][name="datasetForm\\.notification"]`).parent().hide();
    this.container.find(`button[name="datasetForm\\.refreshDatatypes"]`).parent().hide();
    this.container.find(`input[type="checkbox"][name="datasetForm\\.highlight"]`).parent().hide();
  }
  if (opts.isLink === false) {
    this.container.find(`button[name="datasetForm\\.unlink"]`).hide();
  } else {
    this.container.find(`button[name="datasetForm\\.unlink"]`).show();
  }
};

// Return icon for a given status
DatasetForm.prototype.getIconOfStatus = function (status) {
  let i = $(`<i>`);
  if (status === `valid`) i.addClass(`fas fa-check success-color-dark`).attr(`title`, `This dataset is valid`);
  else if (status === `saved`) i.addClass(`far fa-save success-color-dark`).attr(`title`, `This dataset is saved`);
  else if (status === `modified`) i.addClass(`fas fa-pen warning-color-dark`).attr(`title`, `This dataset is modified`);
  else if (status === `loading`)
    i.addClass(`fas fa-spinner success-color-dark`).attr(`title`, `This dataset is updating`);
  else i.addClass(`far fa-question-circle`).attr(`title`, `Unknow status`);
  return i;
};

// update dataset
DatasetForm.prototype.updateDataset = function (dataset) {
  // Set properties
  for (let key in dataset) {
    if (typeof this.properties[key] === `function`) {
      this.properties[key](dataset[key], true);
    }
  }
  this.properties[`customDataType`](``, true);
  this.properties[`dataType`](dataset[`dataType`], true);
  this.properties[`subType`](dataset[`subType`], true);
};

// update dataset
DatasetForm.prototype.updateSentence = function (sentence) {
  // Set properties
  // $('.sentence-img').attr('src', sentence.url);
  // $('.sentence-text').text(sentence.text);
};

// link dataset
DatasetForm.prototype.link = function (data, datasets, opts = {}, callback) {
  let self = this;
  let text = data.dataset.sentences
    .sort(function (a, b) {
      let c = parseInt(a.id.replace(`sentence-`, ``), 10),
        d = parseInt(b.id.replace(`sentence-`, ``), 10);
      return c - d;
    })
    .map(function (item) {
      return item.text;
    })
    .join(`<br/>`);
  this.refreshText(text);
  this.refreshDataset(data, opts, function (err, res) {
    if (datasets && datasets.length > 0) {
      self.refreshDatasetsList(datasets);
    }
    return self.setRepos(function () {
      return self.refreshRRIDURL(data.dataset.name, function () {
        return callback(err, res);
      });
    });
  });
};

// refresh dataset list
DatasetForm.prototype.refreshDatasetsList = function (datasets) {
  this.clearTabs();
  for (let i = 0; i < datasets.length; i++) {
    this.addTab(datasets[i], { width: Math.floor((1 / datasets.length) * 100) });
  }
  this.refreshLabel();
};

// clear tabs in datasets list
DatasetForm.prototype.clearTabs = function () {
  return this.datasetsTabs.find(`div[key="dataset"]`).map(function () {
    let el = $(this);
    if (!el.hasClass(`tpl`)) el.remove();
  });
};

// add tab in datasets list
DatasetForm.prototype.addTab = function (dataset, opts) {
  let self = this;
  let newTab = this.datasetsTabs.find(`div.tpl[key="dataset"]`).clone();
  newTab.removeClass(`tpl`);
  // color
  newTab.css(`color`, dataset.color.foreground).css(`background-color`, dataset.color.background.rgba);
  // dataset & sentence properties
  if (dataset.id === this.dataset.id) newTab.addClass(`selected`);
  newTab.css(`width`, `${opts.width}%`);
  newTab.click(function () {
    let el = $(this),
      datasetId = el.find(`div[key="dataset\\.tab"]`).attr(`dataset-id`),
      sentenceId = el.find(`div[key="sentence\\.id"]`).attr(`value`),
      sentenceText = el.find(`div[key="sentence\\.text"]`).attr(`value`);
    if (typeof self.events.onTabClick !== `undefined`)
      self.events.onTabClick({ dataset: { id: datasetId }, sentence: { id: sentenceId, text: sentenceText } });
  });
  newTab.find(`div[key="dataset\\.tab"]`).attr(`value`, dataset.id).attr(`dataset-id`, dataset.id).text(dataset.id);
  newTab.find(`div[key="dataset\\.label"]`).attr(`value`, dataset.id).text(dataset.id);
  newTab.find(`div[key="sentence\\.id"]`).attr(`value`, this.dataset.sentence.id);
  newTab.find(`div[key="sentence\\.text"]`).attr(`value`, this.dataset.sentence.text);
  return this.datasetsTabs.append(newTab);
};

// refresh dataset
DatasetForm.prototype.refreshDataset = function (data = {}, opts = {}, callback) {
  if (!data.dataset) {
    this.setEmptyMessage();
    this.showMessage();
    return typeof callback === `function` ? callback(true) : undefined;
  }
  this.dataset.color = data.dataset.color;
  this.dataset.sentence = data.sentence;
  this.updateDataset(data.dataset);
  // this.updateSentence(data.sentence);
  let shouldSave =
    this.properties[`description`]() !== data.dataset.description ||
    this.properties[`bestDataFormatForSharing`]() !== data.dataset.bestDataFormatForSharing ||
    this.properties[`mostSuitableRepositories`]() !== data.dataset.mostSuitableRepositories ||
    this.properties[`bestPracticeForIndicatingReUseOfExistingData`]() !==
      data.dataset.bestPracticeForIndicatingReUseOfExistingData;
  this.setView({ isCurator: opts.isCurator, isLink: opts.isLink });
  this.color();
  this.hideMessage();
  return typeof callback === `function` ? callback(null, { shouldSave: shouldSave, dataset: this.dataset }) : undefined;
};

// Link dataset to datasetForm
DatasetForm.prototype.unlink = function () {
  this.dataset = {};
  this.uncolor();
  this.setEmptyMessage();
  return this.showMessage();
};

// Set color on dataset id
DatasetForm.prototype.color = function () {
  return this.container
    .find(`div[key="dataset\\.id"], div[key="dataset\\.label"]`)
    .parent()
    .css(`color`, this.dataset.color.foreground)
    .css(`background-color`, this.dataset.color.background.rgba);
};

// Unset color on dataset id
DatasetForm.prototype.uncolor = function () {
  return this.container.find(`div[key="dataset\\.id"]`);
};

// Set status "modified"
DatasetForm.prototype.modified = function () {
  return this.properties[`status`](`modified`);
};

// Set status "modified"
DatasetForm.prototype.loading = function () {
  return this.properties[`status`](`loading`);
};

// Set Empty datasetForm Message
DatasetForm.prototype.hideMessage = function () {
  return this.message.addClass(`hide`);
};

// Set Empty datasetForm Message
DatasetForm.prototype.showMessage = function () {
  return this.message.removeClass(`hide`);
};

// Set Empty datasetForm Message
DatasetForm.prototype.setEmptyMessage = function () {
  return this.message
    .empty()
    .append($(`<div>`).text(`The selected sentences are not linked to a dataset`))
    .append($(`<div>`).text(`If they are, click the button "Add new Dataset"`));
};

// Set Intializing datasetForm Message
DatasetForm.prototype.setInitialazingMessage = function () {
  return this.message.empty().append($(`<div>`).text(`Populating dataset Form...`));
};

// Hide datasetForm
DatasetForm.prototype.hide = function () {
  this.container.hide();
  this.buttons[`hide`].hide();
  this.buttons[`show`].show();
  this.buttons[`display-left`].hide();
  this.buttons[`display-middle`].hide();
  this.buttons[`display-right`].hide();
  this.screen.removeClass(`maximized`).addClass(`minimized`);
};

// Show datasetForm
DatasetForm.prototype.show = function () {
  this.container.show();
  this.buttons[`hide`].show();
  this.buttons[`show`].hide();
  this.buttons[`display-middle`].show();
  this.buttons[`display-left`].show();
  this.buttons[`display-middle`].show();
  this.buttons[`display-right`].show();
  this.screen.removeClass(`minimized`).addClass(`maximized`);
};
