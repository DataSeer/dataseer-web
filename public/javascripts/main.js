(function() {
  // Get the current object
  function getCurrentObject(done) {
    let currentId = $('#currentId').attr('value');
    $.get('/api/documents/' + currentId, function(data) {
      done(data);
    });
  }

  // Update a gicen document
  function updateDocument(doc, done) {
    $.ajax({
      type: 'PUT',
      contentType: 'application/json; charset=utf-8',
      headers: {
        'X-HTTP-Method-Override': 'PUT'
      },
      url: '/api/documents/' + doc._id,
      data: JSON.stringify(doc),
      complete: function(data) { 'updateDocument complete' },
      success: function(data) { done(null, data); },
      error: function(data) { done(true, data); },
      dataType: 'json'
    });
  }

  function colorDatasets(colorsCount) {
    var colors = randomColor({ luminosity: 'light', hue: 'random', count: colorsCount });
    for (var i = 1; i <= colorsCount; i++) {
      console.log(i, colors[i - 1]);
      colorDataset(i, colors[i - 1]);
    }
  }

  function colorDataset(index, color) {
    $('dataset[id*=' + index + ']').attr('style', 'background-color:' + color);
    $('.dataset-link[value*=' + index + ']').attr('style', 'background-color:' + color);
  }

  // Get the current Object
  return getCurrentObject(function(data) {

    var currentDocument = data;

    colorDatasets(currentDocument.datasets.length);

    // Fill dataset_validation Forms input with correct data
    function fillCurrentDatasetWithFormValues(index) {
      currentDocument.datasets[index].name = $('#name').val();
      currentDocument.datasets[index].DOI = $('#DOI').val();
      currentDocument.datasets[index].comments = $('#comments').val();
    }

    // Update dataset properties with inputs form
    function fillFormWithDatasetPropertiesOf(index) {
      console.log(currentDocument.datasets[index]);
      $('#dataset-update-form div.dataType').text(currentDocument.datasets[index].dataType);
      $('#descritpion').text(currentDocument.datasets[index].descritpion);
      $('#bestDataForSharing').text(currentDocument.datasets[index].bestDataForSharing);
      $('#mostSuitableRepositories').text(currentDocument.datasets[index].mostSuitableRepositories);
      $('#name').val(currentDocument.datasets[index].name);
      $('#DOI').val(currentDocument.datasets[index].DOI);
      $('#comments').val(currentDocument.datasets[index].comments);
    }

    // Refresh value of dataset index indocators
    function RefreshDatasetIndexLabelIndicators(index) {
      $('.datasetNumber').text((index + 1));
      $('#currentDatasetIndex').attr('value', (index));
    }

    function toggleDatasetListToForms(index) {
      $('#datasets-list').hide();
      $('#dataset-update-form').show();
      if (currentDocument.datasets[index].dataType) {
        $('#dataType-update-form').hide();
        $('#dataset-poperties-update-form').show();
      } else {
        $('#dataType-update-form').show();
        $('#dataset-poperties-update-form').hide();
      }
    }

    function toggleFormsToDatasetList() {
      $('#datasets-list').show();
      $('#dataset-update-form').hide();
    }

    // Check dataset properties
    function checkDataset(dataset) {
      var result = true;
      return result;
    }

    // Check Datasets of a given Document
    function checkDatasetsOf(doc) {
      var result = true;
      for (var i = 0; i < doc.datasets.length; i++) {
        var currentDataset = doc.datasets[i];
        result &= checkDataset(currentDataset);
      }
      return result;
    }

    // On metadata_validation click
    $('#metadata_validation').click(function() {
      console.log('metadata_validation');
      currentDocument.status = 'datasets';
      updateDocument(currentDocument, function(err, res) {
        console.log(err, res);
        if (err) return err; // Need to define error behavior
        return location.reload();
      });
    });

    // On dataset-link click
    $('.dataset-link').click(function() {
      var index = $(this).attr('value') - 1;
      RefreshDatasetIndexLabelIndicators(index);
      fillFormWithDatasetPropertiesOf(index)
      toggleDatasetListToForms(index);
    });

    // On dataset click
    $('dataset').click(function() {
      var index = $(this).attr('id') - 1;
      RefreshDatasetIndexLabelIndicators(index);
      fillFormWithDatasetPropertiesOf(index)
      toggleDatasetListToForms(index);
    });

    // On dataType_validation click
    $('#dataType_validation').click(function() {
      console.log('dataType_validation');
      var index = $('#currentDatasetIndex').attr('value'),
        value = $('#dataType option:selected').text();
      currentDocument.datasets[index].dataType = value;
      toggleDatasetListToForms(index);
    });

    // On dataset_validation click
    $('#dataset_validation').click(function() {
      console.log('dataset_validation');
      var index = $('#currentDatasetIndex').attr('value'),
        name = $('#name').val(),
        DOI = $('#DOI').val(),
        comments = $('#comments').val();
      currentDocument.datasets[index].name = name;
      currentDocument.datasets[index].DOI = DOI;
      currentDocument.datasets[index].comments = comments;
      toggleFormsToDatasetList()
    });

    // On datasets_validation click
    $('#datasets_validation').click(function() {
      console.log('datasets_validation');
      currentDocument.status = 'finish';
      updateDocument(currentDocument, function(err, res) {
        console.log(err, res);
        if (err) return err; // Need to define error behavior
        return location.reload();
      });
    });

  });

})();