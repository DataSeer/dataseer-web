(function() {

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
            currentDocument.datasets[dataset['dataset.id']].status = 'success';
            datasetsList.datasets.statusOf(dataset['dataset.id'], currentDocument.datasets[dataset['dataset.id']].status);
            MongoDB.updateDocument(currentDocument, function(err, res) {
              console.log(err, res);
              if (err) return err; // Need to define error behavior
              updateForm.link(currentDocument.datasets[dataset['dataset.id']], documentView.color(dataset['dataset.id']));
              // return location.reload();
            });
          },
          'onIdClick': function() {
            documentView.views.scrollTo(updateForm.id());
          },
          'onChange': function(element) {
            datasetsList.datasets.statusOf(updateForm.id(), 'warning');
          }
        }),
        datasetsList = new DatasetsList(currentDocument.datasets, {
          'onClick': function(id) {
            updateForm.link(currentDocument.datasets[id], documentView.color(id));
            documentView.views.scrollTo(id);
          },
          'onDelete': function(id) {
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
        let error = (documentView.addDataset(newId, defaultDataType.dataType) === null);
        if (!error) {
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

      // On tei_all_visible click
      $('#tei_all_visible').click(function() {
        documentView.views.allVisible();
        $('#tei_only_dataseer').parent('label').removeClass('active');
        $('#tei_all_visible').parent('label').removeClass('active');
        $(this).parent('label').addClass('active');
      });

      // On tei_only_dataseer click
      $('#tei_only_dataseer').click(function() {
        documentView.views.onlyDataseer();
        $('#tei_all_visible').parent('label').removeClass('active');
        $('#tei_only_datasets').parent('label').removeClass('active');
        $(this).parent('label').addClass('active');
      });

      // On tei_only_datasets click
      $('#tei_only_datasets').click(function() {
        documentView.views.onlyDatasets();
        $('#tei_all_visible').parent('label').removeClass('active');
        $('#tei_only_dataseer').parent('label').removeClass('active');
        $(this).parent('label').addClass('active');
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
      $('#datasets_validation').click(function() {
        currentDocument.status = MongoDB.getNextStatus(currentDocument);
        MongoDB.updateDocument(currentDocument, function(err, res) {
          console.log(err, res);
          if (err) return err; // Need to define error behavior
          return location.reload();
        });
      });
    });
  });
})();