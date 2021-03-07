/*
 * @prettier
 */

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

  // Get data of current document with datasets informations
  return DataSeerAPI.getDocument(documentId, { datasets: true }, function (err, doc) {
    return DataSeerAPI.getPDF(doc.pdf, function (err, pdf) {
      return DataSeerAPI.getTEI(doc.tei, function (err, tei) {
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

        window.addEventListener('unhandledrejection', function (event) {
          alert('An error has occured while processing this document... (' + currentDocument._id + ')');
          hideLoop();
        });

        showLoop();

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
            nextDataset = function (status) {
              let result = IndexOfNextDataset(status);
              if (result.index > -1) return currentDocument.datasets.current[result.key];
              else return null;
            },
            IndexOfNextDataset = function (status) {
              let result = -1,
                keys = Object.keys(currentDocument.datasets.current);
              for (var i = 0; i < keys.length; i++) {
                let key = keys[i];
                if (currentDocument.datasets.current[key] && currentDocument.datasets.current[key].status === status)
                  return {
                    index: i,
                    key: keys[i]
                  };
              }
              return result;
            },
            saveDataset = function (dataset, status) {
              let fullDataType =
                currentDocument.datasets.current[dataset['dataset.id']].subType === ''
                  ? currentDocument.datasets.current[dataset['dataset.id']].dataType
                  : currentDocument.datasets.current[dataset['dataset.id']].dataType +
                    ':' +
                    currentDocument.datasets.current[dataset['dataset.id']].subType;
              documentView.updateDataset(user, dataset['dataset.id'], fullDataType);
              let keys = Object.keys(currentDocument.datasets.current[dataset['dataset.id']]);
              for (var i = 0; i < keys.length; i++) {
                if (typeof dataset['dataset.' + keys[i]] !== 'undefined')
                  currentDocument.datasets.current[dataset['dataset.id']][keys[i]] = dataset['dataset.' + keys[i]];
              }
              if (currentDocument.datasets.current[dataset['dataset.id']].name === '')
                currentDocument.datasets.current[dataset['dataset.id']].name = dataset['dataset.id'];
              currentDocument.datasets.current[dataset['dataset.id']].status = status;
              datasetsList.datasets.statusOf(
                dataset['dataset.id'],
                currentDocument.datasets.current[dataset['dataset.id']].status
              );
              currentDocument.source = documentView.source();
              return DataSeerAPI.updateDataset(
                {
                  datasetsId: doc.datasets._id,
                  dataset: currentDocument.datasets.current[dataset['dataset.id']]
                },
                function (err, res) {
                  console.log(err, res);
                  if (err) return err; // Need to define error behavior
                  // Update dataType in XML
                  let nextStatus = status === _status.saved ? _status.modified : _status.saved;
                  hasChanged = false;
                  let next = nextDataset(nextStatus);
                  if (next !== null) {
                    datasetsList.select(next.id);
                    datasetForm.link(next, documentView.color(next.id));
                    documentView.views.scrollTo(next.id);
                  } else {
                    datasetsList.select(dataset['dataset.id']);
                    datasetForm.link(
                      currentDocument.datasets.current[dataset['dataset.id']],
                      documentView.color(dataset['dataset.id'])
                    );
                    documentView.views.scrollTo(dataset['dataset.id']);
                  }
                  // return location.reload();
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
              currentDocument.source = documentView.source();
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

          let hasChanged = false; // tell us if there is some change

          // All components
          let datasetForm = new DatasetForm({
              // On final validation
              onValidation: function (dataset) {
                let currentId = datasetForm.id();
                if (user.role === 'curator') {
                  datasetsList.datasets.statusOf(currentId, _status.valid);
                  return saveDataset(dataset, _status.valid);
                }
                if (
                  currentId === '' ||
                  typeof currentDocument.datasets.current === 'undefined' ||
                  typeof currentDocument.datasets.current[currentId] === 'undefined'
                ) {
                  $('#datasets-error-modal-label').html('Final validation');
                  $('#datasets-error-modal-body').html('Please, add at least one dataset before validate');
                  $('#datasets-error-modal-btn').click();
                } else if (dataset['dataset.DOI'] === '' && dataset['dataset.comments'] === '') {
                  $('#datasets-error-modal-label').html('Final validation');
                  $('#datasets-error-modal-body').html(
                    'To validate, please provide a DOI or enter comments explaining why this dataset cannot be shared'
                  );
                  $('#datasets-error-modal-btn').click();
                } else if (dataset['dataset.dataType'] === '') {
                  $('#datasets-error-modal-label').html('Final validation');
                  $('#datasets-error-modal-body').html('To validate, please provide a datatype (predefined or custom)');
                  $('#datasets-error-modal-btn').click();
                } else {
                  datasetsList.datasets.statusOf(currentId, _status.valid);
                  saveDataset(dataset, _status.valid);
                }
              },
              // On save
              onSave: function (dataset) {
                let currentId = datasetForm.id();
                if (user.role === 'curator') {
                  datasetsList.datasets.statusOf(currentId, _status.saved);
                  return saveDataset(dataset, _status.saved);
                }
                if (
                  currentId === '' ||
                  typeof currentDocument.datasets.current === 'undefined' ||
                  typeof currentDocument.datasets.current[currentId] === 'undefined'
                ) {
                  $('#datasets-error-modal-label').html('Save dataset');
                  $('#datasets-error-modal-body').html('Please, add at least one dataset before saving');
                  $('#datasets-error-modal-btn').click();
                } else {
                  datasetsList.datasets.statusOf(currentId, _status.saved);
                  saveDataset(dataset, _status.saved);
                }
              },
              onIdClick: function (id) {
                datasetsList.select(id);
                datasetForm.link(currentDocument.datasets.current[id], documentView.color(id));
                documentView.views.scrollTo(id);
              },
              onChange: function (element) {
                datasetsList.datasets.statusOf(datasetForm.id(), _status.modified);
                hasChanged = true;
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
            }),
            datasetsList = new DatasetsList(currentDocument.datasets.current, {
              onNewDataset: function () {
                if (typeof currentDocument.datasets.current === 'undefined') currentDocument.datasets.current = {};
                let index = Object.keys(currentDocument.datasets.current).length + 1,
                  newId = 'dataset-' + index;
                while (typeof currentDocument.datasets.current[newId] !== 'undefined') {
                  index += 1;
                  newId = 'dataset-' + index;
                }
                return documentView.addDataset(user, newId, defaultDataType, function (err, res) {
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
                    currentDocument.datasets.current[newId].sentenceId = res.sentenceId;
                    currentDocument.datasets.current[newId].cert = res.cert;
                    currentDocument.datasets.current[newId].dataType = getDataType(res.datatype);
                    currentDocument.datasets.current[newId].subType = getSubType(res.datatype);
                    currentDocument.datasets.current[newId].text = documentView.getTextOfDataset(newId);
                    currentDocument.datasets.current[newId].status = _status.saved;
                    currentDocument.source = documentView.source();
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
                          newId,
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
                  currentDocument.source = documentView.source();
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
            keys = currentDocument.datasets.current ? Object.keys(currentDocument.datasets.current) : undefined;
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
