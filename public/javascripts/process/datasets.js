/*
 * @prettier
 */

(function($) {
  // Get the current Object
  return MongoDB.getCurrentDocument(function(currentDocument) {
    $.getJSON('../json/dataTypes.json', function(data) {
      let dataTypes = data.dataTypes,
        metadata = data.metadata,
        _status = {
          'modified': 'modified',
          'saved': 'saved',
          'valid': 'valid'
        },
        getStatusOfDatasets = function(datasets) {
          let result = {};
          for (let key in datasets) {
            result[key] = datasets[key].status;
          }
          return result;
        },
        nextDataset = function(status) {
          let result = IndexOfNextDataset(status);
          if (result.index > -1) return currentDocument.datasets[result.key];
          else return null;
        },
        IndexOfNextDataset = function(status) {
          let result = -1,
            keys = Object.keys(currentDocument.datasets);
          for (var i = 0; i < keys.length; i++) {
            let key = keys[i];
            if (currentDocument.datasets[key] && currentDocument.datasets[key].status === status)
              return {
                'index': i,
                'key': keys[i]
              };
          }
          return result;
        },
        saveDataset = function(dataset, status) {
          let keys = Object.keys(currentDocument.datasets[dataset['dataset.id']]);
          for (var i = 0; i < keys.length; i++) {
            if (typeof dataset['dataset.' + keys[i]] !== 'undefined')
              currentDocument.datasets[dataset['dataset.id']][keys[i]] = dataset['dataset.' + keys[i]];
          }
          if (currentDocument.datasets[dataset['dataset.id']].name === '')
            currentDocument.datasets[dataset['dataset.id']].name = dataset['dataset.id'];
          currentDocument.datasets[dataset['dataset.id']].status = status;
          datasetsList.datasets.statusOf(dataset['dataset.id'], currentDocument.datasets[dataset['dataset.id']].status);
          MongoDB.updateDocument(currentDocument, function(err, res) {
            console.log(err, res);
            if (err) return err; // Need to define error behavior
            // Update dataType in XML
            let fullDataType =
                currentDocument.datasets[dataset['dataset.id']].subType === ''
                  ? currentDocument.datasets[dataset['dataset.id']].dataType
                  : currentDocument.datasets[dataset['dataset.id']].dataType +
                    ' : ' +
                    currentDocument.datasets[dataset['dataset.id']].subType,
              nextStatus = status === _status.saved ? _status.modified : _status.saved;
            documentView.updateDataset(dataset['dataset.id'], fullDataType);
            hasChanged = false;
            let next = nextDataset(nextStatus);
            if (next !== null) {
              datasetsList.select(next.id);
              updateForm.link(next, documentView.color(next.id));
              documentView.views.scrollTo(next.id);
            } else {
              datasetsList.select(dataset['dataset.id']);
              updateForm.link(
                currentDocument.datasets[dataset['dataset.id']],
                documentView.color(dataset['dataset.id'])
              );
              documentView.views.scrollTo(dataset['dataset.id']);
            }
            // return location.reload();
          });
        },
        deleteDataset = function(id) {
          hasChanged = true;
          documentView.deleteDataset(id);
          documentView.deleteCorresps(id);
          currentDocument.datasets[id] = undefined;
          currentDocument.source = documentView.source();
          MongoDB.updateDocument(currentDocument, function(err, res) {
            console.log(err, res);
            if (err) return err; // Need to define error behavior
            hasChanged = false;
            let keys = Object.keys(currentDocument.datasets);
            if (id === updateForm.id() && keys.length > 0) {
              let key = keys.length > 1 ? keys[1] : keys[0];
              datasetsList.select(key);
              updateForm.link(currentDocument.datasets[key], documentView.color(key));
              documentView.views.scrollTo(key);
            }
          });
        },
        checkStatusOfDatasets = function() {
          let result = true;
          for (let key in currentDocument.datasets) {
            if (currentDocument.datasets[key] && currentDocument.datasets[key].status !== _status.valid) return false;
          }
          return result;
        };

      let hasChanged = false; // tell us if there is some change

      // Save of validation process because it will be insert into datasetList
      let validationBtn = $('<button/>')
          .attr('id', 'datasets_validation')
          .addClass('btn btn-primary')
          .text('This info is correct : Continue'),
        newDatasetBtn = $('#new_dataset').clone(true);

      // All components
      let updateForm = new DatasetForm({
          // On final validation
          'onValidation': function(dataset) {
            console.log(dataset);
            if (dataset['dataset.DOI'] === '' && dataset['dataset.comments'] === '') {
              $('#datasets-error-modal-label').html('Final validation');
              $('#datasets-error-modal-body').html(
                'Please, provide the DOI before validate (or enter any comments to explain why this dataset cannot be shared)'
              );
              $('#datasets-error-modal-btn').click();
            } else {
              datasetsList.datasets.statusOf(updateForm.id(), _status.valid);
              saveDataset(dataset, _status.valid);
            }
          },
          // On save
          'onSave': function(dataset) {
            datasetsList.datasets.statusOf(updateForm.id(), _status.saved);
            saveDataset(dataset, _status.saved);
          },
          'onIdClick': function(id) {
            documentView.views.scrollTo(id);
          },
          'onChange': function(element) {
            datasetsList.datasets.statusOf(updateForm.id(), _status.modified);
            hasChanged = true;
          }
        }),
        datasetsList = new DatasetsList(currentDocument.datasets, {
          'onNewDataset': function() {
            let index = Object.keys(currentDocument.datasets).length + 1,
              newId = 'dataset-' + index,
              defaultDataType = Object.keys(dataTypes)[0];
            while (typeof currentDocument.datasets[newId] !== 'undefined') {
              index += 1;
              newId = 'dataset-' + index;
            }
            return documentView.addDataset(newId, defaultDataType, function(err, res) {
              if (err) {
                $('#datasets-error-modal-label').html('Add Dataset');
                $('#datasets-error-modal-body').html(res);
                $('#datasets-error-modal-btn').click();
              } else {
                currentDocument.source = documentView.source();
                currentDocument.datasets[newId] = {
                  'status': _status.saved,
                  'id': newId,
                  'confidence': '0',
                  'dataType': defaultDataType,
                  'subType': '',
                  'description':
                    typeof metadata[defaultDataType] !== 'undefined' ? metadata[defaultDataType].description : '',
                  'bestDataFormatForSharing':
                    typeof metadata[defaultDataType] !== 'undefined'
                      ? metadata[defaultDataType].bestDataFormatForSharing
                      : '',
                  'mostSuitableRepositories':
                    typeof metadata[defaultDataType] !== 'undefined'
                      ? metadata[defaultDataType].mostSuitableRepositories
                      : '',
                  'name': '',
                  'DOI': '',
                  'comments': ''
                };
                datasetsList.add(newId, documentView.color(newId), currentDocument.datasets[newId].status);
                datasetsList.select(newId);
                updateForm.link(currentDocument.datasets[newId], documentView.color(newId));
                documentView.views.scrollTo(newId);
                MongoDB.updateDocument(currentDocument, function(err, res) {
                  console.log(err, res);
                  if (err) return err; // Need to define error behavior
                  hasChanged = false;
                  // return location.reload();
                });
              }
            });
          },
          'onClick': function(id) {
            datasetsList.select(id);
            updateForm.link(currentDocument.datasets[id], documentView.color(id));
            documentView.views.scrollTo(id);
          },
          'onDelete': function(id) {
            $('#datasets-confirm-modal-label').html('Delete Dataset');
            $('#datasets-confirm-modal-body').html('Did you really want to delete this dataset?');
            $('#datasets-confirm-modal-data').html(id);
            $('#datasets-confirm-modal-btn').click();
          },
          'onAdd': function(id) {
            let result = documentView.addCorresp(id);
            if (result.err) {
              $('#datasets-error-modal-label').html('Add Dataset');
              $('#datasets-error-modal-body').html(result.msg);
              $('#datasets-error-modal-btn').click();
            } else {
              hasChanged = true;
              currentDocument.source = documentView.source();
              MongoDB.updateDocument(currentDocument, function(err, res) {
                console.log(err, res);
                if (err) return err; // Need to define error behavior
                hasChanged = false;
                // return location.reload();
              });
            }
          }
        }), // List of datasets
        documentView = new DocumentView({
          // Interactive view od XML document
          datasets: {
            'click': function(id) {
              datasetsList.select(id);
              updateForm.link(currentDocument.datasets[id], documentView.color(id));
            }
          },
          corresps: {
            'click': function(id) {
              datasetsList.select(id);
              updateForm.link(currentDocument.datasets[id], documentView.color(id));
            }
          }
        }),
        defaultKey = Object.keys(currentDocument.datasets)[0];

      documentView.init('#document-view', currentDocument.source);
      documentView.views.scrollTo(defaultKey);

      updateForm.init('#dataset-form');
      updateForm.loadData(data);
      updateForm.link(currentDocument.datasets[defaultKey], documentView.color(defaultKey));

      datasetsList.init('#datasets-list', documentView.colors(), getStatusOfDatasets(currentDocument.datasets));
      datasetsList.select(defaultKey);

      $('#new_dataset > button').click();

      // get selection
      $('#view-selection input[type=radio]').on('change', function() {
        documentView.views[this.value]();
      });

      // On datasets_validation click
      $('#datasets_validation').click(function() {
        if (checkStatusOfDatasets()) {
          currentDocument.status = MongoDB.getNextStatus(currentDocument);
          MongoDB.updateDocument(currentDocument, function(err, res) {
            console.log(err, res);
            if (err) return err; // Need to define error behavior
            hasChanged = false;
            return location.reload();
          });
        } else {
          $('#datasets-error-modal-label').html('Continue');
          $('#datasets-error-modal-body').html('Please, save all datasets before continue');
          $('#datasets-error-modal-btn').click();
        }
      });

      // On confirm button click od modal
      $('#datasets-confirm-modal-valid').click(function() {
        let id = $('#datasets-confirm-modal-data').html();
        datasetsList.datasets.remove(id);
        deleteDataset(id);
      });

      window.onbeforeunload = function() {
        if (hasChanged)
          return confirm('Are you sure you want to navigate away from this page? Changes will not be saved !');
      };
    });
  });
})(jQuery);
