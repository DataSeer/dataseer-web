/*
 * @prettier
 */

'use strict';

(function ($) {
  // Get current document Id
  const documentId = $(document.getElementById('document.id')).attr('value');

  const convertDatasetsFromAPI = function (datasets) {
    let result = {
      extracted: {},
      deleted: datasets.deleted,
      current: {}
    };
    for (let i = 0; i < datasets.extracted.length; i++) {
      result.extracted[datasets.extracted[i].id] = datasets.extracted[i];
    }
    for (let i = 0; i < datasets.current.length; i++) {
      result.current[datasets.current[i].id] = datasets.current[i];
    }
    return result;
  };

  const showLoop = function () {
      let loop = $('#pdf-loading-loop'),
        container = loop.find('.loader-container'),
        loader = container.find('.loader'),
        width = $('html').width();
      loop.css('width', width);
      loop.css('height', window.document.body.clientHeight);
      container.css('padding-top', `${window.document.body.clientHeight * 0.5 - loader.height() * 0.5}px`);
      container.css('padding-left', `${width * 0.5 - loader.width() * 0.5}px`);
      loop.show();
    },
    hideLoop = function () {
      $('#pdf-loading-loop').hide();
    };

  showLoop();

  $('#pdf-loading-loop-infos').text(`Downloading Document data...`);
  // Get data of current document with datasets informations
  return DataSeerAPI.getDocument(documentId, { datasets: true }, function (err, doc) {
    $('#pdf-loading-loop-infos').text(`Downloading PDF file...`);
    return DataSeerAPI.getPDF(doc.pdf, function (err, pdf) {
      $('#pdf-loading-loop-infos').text(`Downloading TEI file...`);
      return DataSeerAPI.getTEI(doc.tei, function (err, tei) {
        $('#pdf-loading-loop-infos').text(`Loading PDF pages...`);
        let currentDocument = {
          datasets: convertDatasetsFromAPI(doc.datasets),
          metadata: doc.metadata,
          source: tei.data,
          pdf: pdf,
          status: 'datasets',
          updated_at: doc.updated_at,
          uploaded_at: doc.uploaded_at,
          _id: doc._id
        };
        console.log(currentDocument);

        window.addEventListener('unhandledrejection', function (event) {
          alert('An error has occured while processing this document... (' + currentDocument._id + ')');
          hideLoop();
        });

        // Get the current Object
        DataSeerAPI.jsonDataTypes(function (err, data) {
          if (err) return alert('Error : Datatypes unavailable, dataseer-ml service does not respond');
          let user = {
              id: $('#user_id').attr('value'),
              username: $('#user_username').attr('value'),
              role: $('#user_role').attr('value')
            },
            subTypes = data.subTypes,
            dataTypes = data.dataTypes,
            metadata = data.metadata,
            _status = {
              modified: 'modified',
              saved: 'saved',
              valid: 'valid'
            },
            defaultDataType = Object.keys(dataTypes).sort(function (a, b) {
              if (metadata[a].count < metadata[b].count) return 1;
              else if (metadata[a].count > metadata[b].count) return -1;
              else return 0;
            })[0],
            defaultDataset = {
              status: _status.modified,
              id: '',
              reuse: false,
              cert: '0',
              dataType: defaultDataType,
              subType: '',
              description:
                typeof metadata[defaultDataType] !== 'undefined' && metadata[defaultDataType].description
                  ? metadata[defaultDataType].description
                  : '',
              bestDataFormatForSharing:
                typeof metadata[defaultDataType] !== 'undefined' && metadata[defaultDataType].bestDataFormatForSharing
                  ? metadata[defaultDataType].bestDataFormatForSharing
                  : '',
              mostSuitableRepositories:
                typeof metadata[defaultDataType] !== 'undefined' && metadata[defaultDataType].mostSuitableRepositories
                  ? metadata[defaultDataType].mostSuitableRepositories
                  : '',
              name: '',
              DOI: '',
              comments: '',
              text: ''
            },
            getDataType = function (type) {
              if (typeof dataTypes[type] !== 'undefined') return type;
              if (typeof subTypes[type] !== 'undefined') return type;
              return defaultDataType;
            },
            getSubType = function (type) {
              if (typeof subTypes[type] !== 'undefined') return type;
              return '';
            },
            isAnExtractedDataset = function (dataset, extractedDatasets) {
              for (let key in extractedDatasets) {
                if (dataset.text === extractedDatasets[key].text) {
                  return true;
                }
              }
              return false;
            },
            getUnsavedDatasets = function (datasets) {
              let result = [];
              for (let key in datasets) {
                if (datasets[key].status !== _status.valid) result.push(key);
              }
              return result;
            },
            getStatusOfDatasets = function (datasets) {
              let result = {};
              for (let key in datasets) {
                result[key] = datasets[key].status;
              }
              return result;
            },
            reorder = function (data, index) {
              return data.slice(index).concat(data.slice(0, index));
            },
            nextDataset = function (status, currentId) {
              let result = IndexOfNextDataset(status, currentId);
              if (result.index > -1) return currentDocument.datasets.current[result.key];
              else return null;
            },
            IndexOfNextDataset = function (status, currentId) {
              let result = -1,
                keys = Object.keys(currentDocument.datasets.current),
                indexOfCurrentId = keys.indexOf(currentId),
                arr = reorder(keys, indexOfCurrentId > -1 ? indexOfCurrentId + 1 : 0);

              for (var i = 0; i < arr.length; i++) {
                let key = arr[i];
                if (currentDocument.datasets.current[key] && currentDocument.datasets.current[key].status === status)
                  return {
                    index: i,
                    key: arr[i]
                  };
              }
              return result;
            },
            saveDataset = function (dataset, cb) {
              dataset.status = _status.valid;
              return DataSeerAPI.updateDataset(
                {
                  datasetsId: doc.datasets._id,
                  dataset: dataset
                },
                function (err, res) {
                  console.log(err, res);
                  let hasCallback = cb && typeof cb === 'function';
                  if (err) return hasCallback ? cb(err) : err; // Need to define error behavior
                  if (res.err) return hasCallback ? cb(res) : res; // Need to define error behavior
                  let result = res.res;
                  currentDocument.datasets.current[result.id] = result;
                  let fullDataType = result.subType === '' ? result.dataType : result.dataType + ':' + result.subType;
                  // Update dataType in XML
                  documentView.updateDataset(user, result.id, fullDataType, result.reuse);
                  datasetsList.datasets.textOf(result.id, result.name ? result.name : result.id);
                  datasetsList.datasets.highlightOf(result.id, result.highlight);
                  datasetsList.datasets.statusOf(result.id, result.status);
                  datasetForm.refreshStatus(result.status);
                  hasChanged = false;
                  return hasCallback ? cb(null, result) : undefined;
                }
              );
            },
            deleteDataset = function (id) {
              hasChanged = true;
              documentView.deleteDataset(id);
              documentView.deleteAllCorresps(id);
              currentDocument.datasets.current[id].fromDataseerML = isAnExtractedDataset(
                currentDocument.datasets.current[id],
                currentDocument.datasets.extracted
              );
              currentDocument.datasets.deleted.push(currentDocument.datasets.current[id]);
              delete currentDocument.datasets.current[id];
              return DataSeerAPI.deleteDataset(
                {
                  datasetsId: doc.datasets._id,
                  dataset: { id: id }
                },
                function (err, res) {
                  console.log(err, res);
                  if (err) return err; // Need to define error behavior
                  hasChanged = false;
                  let keys = Object.keys(currentDocument.datasets.current);
                  if (keys.length <= 0) {
                    datasetForm.lock();
                  } else if (id === datasetForm.id()) {
                    documentView.views.unselectCanvas();
                    let key = keys.length > 1 ? keys[1] : keys[0];
                    datasetsList.select(key);
                    datasetForm.link(currentDocument.datasets.current[key], documentView.color(key));
                    documentView.views.scrollTo(key);
                  }
                }
              );
            },
            checkStatusOfDatasets = function () {
              let result = true;
              for (let key in currentDocument.datasets.current) {
                if (
                  currentDocument.datasets.current[key] &&
                  currentDocument.datasets.current[key].status !== _status.valid
                )
                  return false;
              }
              return result;
            };

          let lastSave = Date.now(),
            lastChange = Date.now(),
            saving = false,
            saveAfterCooldownTimeOut = false, // will contain timeout of save after cooldown
            hasChanged = false, // tell us if there is some change
            autoSave = function (dataset, cb) {
              if (hasChanged && !saving && lastChange - lastSave > 2000) {
                saving = true;
                return saveDataset(dataset, function (err, res) {
                  $('#fixedMsgBottomRight').text('All changes saved !').removeClass().addClass('saved').fadeOut('slow');
                  lastSave = Date.now();
                  hasChanged = false;
                  saving = false;
                  if (cb && typeof cb === 'function') return cb(err, res);
                });
              } else {
                if (saveAfterCooldownTimeOut === false)
                  saveAfterCooldownTimeOut = window.setTimeout(function () {
                    saving = true;
                    return saveDataset(datasetForm.values(), function () {
                      $('#fixedMsgBottomRight')
                        .text('All changes saved !')
                        .removeClass()
                        .addClass('saved')
                        .fadeOut('slow');
                      lastSave = Date.now();
                      hasChanged = false;
                      saving = false;
                      window.clearTimeout(saveAfterCooldownTimeOut);
                      saveAfterCooldownTimeOut = false;
                    });
                  }, 2000);
              }
            },
            throwAutoSave = function (dataset, cb) {
              $('#fixedMsgBottomRight').text('Saving...').removeClass().addClass('saving').show();
              lastChange = Date.now();
              hasChanged = true;
              autoSave(dataset, cb);
            };

          // All components
          let datasetForm = new DatasetForm(
              {
                // On final validation
                onValidation: function (dataset) {
                  return saveDataset(dataset, function (err, res) {
                    if (user.role !== 'curator') {
                      if (dataset.name === '') {
                        $('#datasets-error-modal-label').html('Dataset validation');
                        $('#datasets-error-modal-body').html(
                          'Before moving on, please provide a name for this dataset'
                        );
                        $('#datasets-error-modal-btn').click();
                        return;
                      } else if (res.DOI === '' && res.comments === '') {
                        $('#datasets-error-modal-label').html('Dataset validation');
                        $('#datasets-error-modal-body').html(
                          'Please provide either a DOI for the dataset or a comment in the comment box'
                        );
                        $('#datasets-error-modal-btn').click();
                        return;
                      } else if (dataset.dataType === '') {
                        $('#datasets-error-modal-label').html('Dataset validation');
                        $('#datasets-error-modal-body').html(
                          'To validate, please provide a datatype (predefined or custom)'
                        );
                        $('#datasets-error-modal-btn').click();
                        return;
                      }
                    }
                    let next = nextDataset('saved', res.id);
                    if (next !== null) {
                      datasetsList.select(next.id);
                      datasetForm.link(next, documentView.color(next.id));
                      documentView.views.scrollTo(next.id);
                    } else {
                      datasetsList.select(res.id);
                      datasetForm.link(res, documentView.color(res.id));
                      documentView.views.scrollTo(res.id);
                    }
                  });
                },
                // On save
                onSave: function (dataset) {
                  return alert('feature disabled');
                },
                onIdClick: function (id) {
                  datasetsList.select(id);
                  datasetForm.link(currentDocument.datasets.current[id], documentView.color(id));
                  documentView.views.scrollTo(id);
                },
                onChange: function (element) {
                  let id = datasetForm.id(),
                    name = datasetForm.getProperty('name'),
                    highlight = datasetForm.getProperty('highlight');
                  datasetsList.datasets.statusOf(id, _status.modified);
                  datasetsList.datasets.textOf(id, name ? name : id);
                  datasetsList.datasets.highlightOf(id, highlight);
                  throwAutoSave(datasetForm.values());
                },
                onLeave: function (element) {
                  if (hasChanged) saveDataset(datasetForm.values());
                },
                onUnlink: function (element) {
                  let id = element.attr('corresp').substring(1); // Remove '#' of corresp attribute
                  DataSeerAPI.deleteCorresp(
                    {
                      datasetsId: doc.datasets._id,
                      dataset: { id: id, sentenceId: element.attr('sentenceid') }
                    },
                    function (err, res) {
                      console.log(err, res);
                      if (err) return err; // Need to define error behavior
                      documentView.deleteCorresp(element);
                      documentView.views.unselectCanvas();
                      datasetForm.link(currentDocument.datasets.current[id], documentView.color(id));
                      documentView.views.scrollTo(id);
                    }
                  );
                }
              },
              user.role !== 'standard_user'
            ),
            datasetsList = new DatasetsList(currentDocument.datasets.current, {
              onNewDataset: function () {
                if (typeof currentDocument.datasets.current === 'undefined') currentDocument.datasets.current = {};
                let index = Object.keys(currentDocument.datasets.current).length + 1,
                  newId = 'dataset-' + index;
                while (typeof currentDocument.datasets.current[newId] !== 'undefined') {
                  index += 1;
                  newId = 'dataset-' + index;
                }
                return documentView.addDataset(user, newId, defaultDataType, false, function (err, res) {
                  if (err) {
                    $('#datasets-error-modal-label').html('Add Dataset');
                    if (typeof res === 'string') $('#datasets-error-modal-body').html(res);
                    else if (typeof res === 'object' && res.status[0] !== '2')
                      $('#datasets-error-modal-body').html(
                        'DataseerML Service : (HTTP ' + res.status + ') ' + res.statusText
                      );
                    else $('#datasets-error-modal-body').html('Unknow Error');
                    $('#datasets-error-modal-btn').click();
                  } else {
                    currentDocument.datasets.current[newId] = Object.assign(
                      Object.create(Object.getPrototypeOf(defaultDataset)),
                      defaultDataset
                    );
                    currentDocument.datasets.current[newId].id = newId;
                    currentDocument.datasets.current[newId].reuse = res.reuse;
                    currentDocument.datasets.current[newId].sentenceId = res.sentenceId;
                    currentDocument.datasets.current[newId].cert = res.cert;
                    currentDocument.datasets.current[newId].dataType = getDataType(res.datatype);
                    currentDocument.datasets.current[newId].subType = getSubType(res.datatype);
                    currentDocument.datasets.current[newId].text = documentView.getTextOfDataset(newId);
                    currentDocument.datasets.current[newId].status = _status.saved;
                    return DataSeerAPI.createDataset(
                      {
                        datasetsId: doc.datasets._id,
                        dataset: currentDocument.datasets.current[newId]
                      },
                      function (err, res) {
                        console.log(err, res);
                        // HTTP Error
                        if (err) return err; // Need to define error behavior
                        // Process Error
                        if (res.err) {
                          alert('An error has occured');
                          return res.err;
                        } // Need to define error behavior
                        hasChanged = false;
                        datasetsList.add(
                          currentDocument.datasets.current[newId],
                          documentView.color(newId),
                          currentDocument.datasets.current[newId].status
                        );
                        datasetsList.select(newId);
                        datasetForm.link(currentDocument.datasets.current[newId], documentView.color(newId));
                        documentView.views.unselectCanvas();
                        documentView.views.scrollTo(newId);
                      }
                    );
                  }
                });
              },
              onClick: function (id) {
                datasetsList.select(id);
                datasetForm.link(currentDocument.datasets.current[id], documentView.color(id));
                documentView.views.scrollTo(id);
              },
              onDelete: function (id) {
                $('#datasets-confirm-modal-label').html('Delete Dataset');
                $('#datasets-confirm-modal-body').html('Did you really want to delete this dataset?');
                $('#datasets-confirm-modal-data').html(id);
                $('#datasets-confirm-modal-btn').click();
              },
              onLink: function (id) {
                let result = documentView.addCorresp(user, id);
                if (result.err) {
                  $('#datasets-error-modal-label').html('Link sentence to Dataset : ' + id);
                  $('#datasets-error-modal-body').html(
                    'Please select the sentence that will be linked to Dataset : ' + id
                  );
                  $('#datasets-error-modal-btn').click();
                } else {
                  hasChanged = true;
                  result.res.click();
                  return DataSeerAPI.createCorresp(
                    {
                      datasetsId: doc.datasets._id,
                      dataset: {
                        id: result.res.attr('corresp').substring(1), // Remove '#' of corresp attribute
                        sentenceId: result.res.attr('sentenceid')
                      }
                    },
                    function (err, res) {
                      console.log(err, res);
                      if (err) return err; // Need to define error behavior
                      hasChanged = false;
                      documentView.views.unselectCanvas();
                      // return location.reload();
                    }
                  );
                }
              }
            }), // List of datasets
            documentView = new DocumentView({
              // Interactive view od XML document
              datasets: {
                click: function (id, el) {
                  datasetsList.select(id);
                  datasetForm.link(currentDocument.datasets.current[id], documentView.color(id), jQuery(el));
                }
              },
              corresps: {
                click: function (id, el) {
                  datasetsList.select(id);
                  datasetForm.link(currentDocument.datasets.current[id], documentView.color(id), jQuery(el));
                }
              }
            }),
            keys = currentDocument.datasets.current ? Object.keys(currentDocument.datasets.current) : undefined,
            defaultKey = keys ? keys[0] : undefined;

          documentView.init('#document-view', currentDocument, function () {
            hideLoop();
            if (defaultKey) documentView.views.scrollTo(defaultKey);
            datasetForm.init('#dataset-form');
            datasetForm.loadData(data);
            if (defaultKey)
              datasetForm.link(currentDocument.datasets.current[defaultKey], documentView.color(defaultKey));
            datasetsList.init(
              '#datasets-list',
              documentView.colors(),
              getStatusOfDatasets(currentDocument.datasets.current)
            );
            if (defaultKey) {
              // Select default Key after Jquery build datasetLists
              setTimeout(function () {
                datasetsList.select(defaultKey);
                // If user is annotator
                if (user.role !== 'standard_user') {
                  let refreshDiv = $('<div/>').addClass('form-row'),
                    refreshBtn = $('<button/>')
                      .addClass('btn btn-primary btn-sm')
                      .text('Refresh Datatypes ')
                      .click(function () {
                        refreshIcon.addClass('fa-spin');
                        DataSeerAPI.resyncJsonDataTypes(function (err, data) {
                          refreshIcon.removeClass('fa-spin');
                          if (err) return console.log(err);
                          subTypes = data.subTypes;
                          dataTypes = data.dataTypes;
                          metadata = data.metadata;
                          datasetForm.loadData(data);
                        });
                      }),
                    refreshIcon = $('<i/>').addClass('fas fa-sync-alt');
                  $('#dataset-form-form').append(refreshDiv.append(refreshBtn.append(refreshIcon)));
                }
              }, 1000);
            }
          });

          // get selection
          $('#view-selection input[type=radio]').on('change', function () {
            documentView.views[this.value]();
          });

          // On datasets_validation click
          $('#datasets_validation').click(function () {
            if (hasChanged) return alert('You must save your changes before process datasets validation');
            return DataSeerAPI.validateDatasets(documentId, function (err, res) {
              console.log(err, res);
              if (err || res.err) {
                let list = getUnsavedDatasets(currentDocument.datasets.current).map(function (e) {
                  return '<li>' + e + '</li>';
                });
                $('#datasets-error-modal-label').html('Continue');
                $('#datasets-error-modal-body').html(
                  '<p>Please validate all following datasets to continue</p><ul>' + list.join('') + '</ul>'
                );
                $('#datasets-error-modal-btn').click();
              } else return (window.location.href = window.location.href.replace(/(\/?datasets\/?)$/, ''));
            });
          });

          // On confirm button click of modal
          $('#datasets-confirm-modal-valid').click(function () {
            let id = $('#datasets-confirm-modal-data').html();
            datasetsList.datasets.remove(id);
            deleteDataset(id);
          });

          $('#back_to_metadata').click(function () {
            return DataSeerAPI.backToMetadata(documentId, function (err, res) {
              console.log(err, res);
              if (err || res.err) return alert('Process has failed');
              else return (window.location.href = window.location.href.replace(/(\/?datasets\/?)$/, ''));
            });
          });

          window.onbeforeunload = function () {
            if (hasChanged)
              return confirm('Are you sure you want to navigate away from this page? Changes will not be saved !');
          };
        });
      });
    });
  });
})(jQuery);
