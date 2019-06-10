(function($) {

  // Get the current Object
  return MongoDB.getCurrentDocument(function(currentDocument) {


    $.getJSON('../json/dataTypes.json', function(dataTypes) {

      function getStatusOfDatasets(datasets) {
        let result = {};
        for (let key in datasets) {
          result[key] = datasets[key].status;
        }
        return result;
      }

      function nextUnsavedDataset() {
        let result = IndexOfNextUnsavedDataset()
        if (result.index > -1) return currentDocument.datasets[result.key];
        else return null;
      }

      function IndexOfNextUnsavedDataset() {
        let result = -1,
          keys = Object.keys(currentDocument.datasets);
        for (var i = 0; i < keys.length; i++) {
          let key = keys[i];
          if (currentDocument.datasets[key] && currentDocument.datasets[key].status === 'warning') return { 'index': i, 'key': keys[i] };
        }
        return result;
      }

      function checkStatusOfDatasets() {
        let result = true;
        for (let key in currentDocument.datasets) {
          if (currentDocument.datasets[key] && currentDocument.datasets[key].status === 'warning') return false;
        }
        return result;
      }

      let hasChanged = false; // tell us if there is some change

      // Save of validation process because it will be insert into datasetList
      let validationBtn = $('<button/>').attr('id', 'datasets_validation').addClass('btn btn-primary').text('This info is correct : Continue'),
        newDatasetBtn = $('#new_dataset').clone(true);

      // All components
      let updateForm = new DatasetForm({ // Form to update datasets properties
          'onValid': function(dataset) {
            let keys = Object.keys(currentDocument.datasets[dataset['dataset.id']]);
            for (var i = 0; i < keys.length; i++) {
              if (typeof dataset['dataset.' + keys[i]] !== 'undefined') currentDocument.datasets[dataset['dataset.id']][keys[i]] = dataset['dataset.' + keys[i]];
            }
            if (currentDocument.datasets[dataset['dataset.id']].name === '') currentDocument.datasets[dataset['dataset.id']].name = dataset['dataset.id'];
            currentDocument.datasets[dataset['dataset.id']].status = 'success';
            datasetsList.datasets.statusOf(dataset['dataset.id'], currentDocument.datasets[dataset['dataset.id']].status);
            MongoDB.updateDocument(currentDocument, function(err, res) {
              console.log(err, res);
              if (err) return err; // Need to define error behavior
              let next = nextUnsavedDataset();
              if (next !== null) {
                updateForm.link(next, documentView.color(next.id));
                documentView.views.scrollTo(next.id);
              } else {
                updateForm.link(currentDocument.datasets[dataset['dataset.id']], documentView.color(dataset['dataset.id']));
                documentView.views.scrollTo(dataset['dataset.id']);
              }
              // return location.reload();
            });
          },
          'onIdClick': function(id) {
            documentView.views.scrollTo(id);
          },
          'onChange': function(element) {
            datasetsList.datasets.statusOf(updateForm.id(), 'warning');
            hasChanged = true;
          }
        }),
        datasetsList = new DatasetsList(currentDocument.datasets, {
          'onClick': function(id) {
            updateForm.link(currentDocument.datasets[id], documentView.color(id));
            documentView.views.scrollTo(id);
          },
          'onDelete': function(id) {
            hasChanged = true;
            documentView.deleteDataset(id);
            documentView.deleteCorresps(id);
            currentDocument.datasets[id] = undefined;
            currentDocument.source = documentView.source();
            MongoDB.updateDocument(currentDocument, function(err, res) {
              console.log(err, res);
              if (err) return err; // Need to define error behavior
              let keys = Object.keys(currentDocument.datasets);
              if (id === updateForm.id() && keys.length > 0) {
                let key = (keys.length > 1) ? keys[1] : keys[0];
                updateForm.link(currentDocument.datasets[key], documentView.color(key));
                documentView.views.scrollTo(key);
              }
            });
          },
          'onAdd': function(id) {
            hasChanged = true;
            documentView.addCorresp(id);
            currentDocument.source = documentView.source();
            MongoDB.updateDocument(currentDocument, function(err, res) {
              console.log(err, res);
              if (err) return err; // Need to define error behavior
              // return location.reload();
            });
          }
        }), // List of datasets
        documentView = new DocumentView({ // Interactive view od XML document
          'datasets': {
            'click': function(id) {
              updateForm.link(currentDocument.datasets[id], documentView.color(id));
            }
          },
          'corresps': {
            'click': function(id) {
              updateForm.link(currentDocument.datasets[id], documentView.color(id));
            }
          }
        }),
        defaultKey = Object.keys(currentDocument.datasets)[0];

      documentView.init('#document-view', currentDocument.source);

      updateForm.init('#dataset-form');
      updateForm.setDataTypes(dataTypes);
      updateForm.link(currentDocument.datasets[defaultKey], documentView.color(defaultKey));
      documentView.views.scrollTo(defaultKey);


      datasetsList.init('#datasets-list', documentView.colors(), getStatusOfDatasets(currentDocument.datasets));

      // Insert validation btn after datasetList
      $('#datasets-list').append(newDatasetBtn).append(validationBtn);

      $('#new_dataset > button').click(function() {
        let index = (Object.keys(currentDocument.datasets).length + 1),
          newId = 'dataset-' + index,
          defaultDataType = dataTypes[Object.keys(dataTypes)[0]];
        while (typeof currentDocument.datasets[newId] !== 'undefined') {
          index += 1;
          newId = 'dataset-' + index;
        }
        let result = documentView.addDataset(newId, defaultDataType.dataType);
        if (result.err) {
          $('#datasets-error-modal-body').html(result.msg);
          $('#datasets-error-modal-btn').click();
        } else {
          currentDocument.source = documentView.source();
          currentDocument.datasets[newId] = {
            'status': 'warning',
            'id': newId,
            'confidence': '0',
            'dataType': defaultDataType.dataType,
            'descritpion': defaultDataType.descritpion,
            'bestDataFormatForSharing': defaultDataType.bestDataFormatForSharing,
            'mostSuitableRepositories': defaultDataType.mostSuitableRepositories,
            'name': '',
            'DOI': '',
            'comments': ''
          };
          datasetsList.add(newId, documentView.color(newId), currentDocument.datasets[newId].status);
          updateForm.link(currentDocument.datasets[newId], documentView.color(newId));
          documentView.views.scrollTo(newId);
          MongoDB.updateDocument(currentDocument, function(err, res) {
            console.log(err, res);
            if (err) return err; // Need to define error behavior
            // return location.reload();
          });
        }
      });

      // get selection
      $('#view-selection input[type=radio]').on('change', function() {
        console.log();
        documentView.views[this.value]();
      });

      // On tei_segmented click
      $('#tei_segmented').click(function() {
        let el = $(this).parent('label'),
          value = el.hasClass('active');
        if (value) el.removeClass('active');
        else el.addClass('active');
        documentView.views.segmented(!value);
      });

      // On datasets_validation click
      $('#save-changes').click(function() {
        MongoDB.updateDocument(currentDocument, function(err, res) {
          console.log(err, res);
          if (err) return err; // Need to define error behavior
        });
      });

      // On datasets_validation click
      $('#datasets_validation').click(function() {
        if (checkStatusOfDatasets()) {
          currentDocument.status = MongoDB.getNextStatus(currentDocument);
          MongoDB.updateDocument(currentDocument, function(err, res) {
            console.log(err, res);
            if (err) return err; // Need to define error behavior
            return location.reload();
          });
        } else {
          $('#datasets-error-modal-body').html('Please, save all datasets before continue');
          $('#datasets-error-modal-btn').click();
        }
      });

      window.onbeforeunload = function() {
        if (hasChanged) return confirm('Are you sure you want to navigate away from this page? Changes will not be saved !');
      };
    });
  });
})(jQuery);