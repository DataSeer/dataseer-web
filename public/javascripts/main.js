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

  function colorDatasets(ids) {
    var colors = randomColor({ luminosity: 'light', hue: 'random', count: ids.length });
    for (var i = 0; i < ids.length; i++) {
      colorDataset(ids[i], colors[i]);
    }
  }

  function colorDataset(index, color) {
    $('.dataset[id*=' + index + ']').attr('style', 'background-color:' + color);
    $('.dataset-link[value*=' + index + ']').attr('style', 'background-color:' + color);
  }

  function removeDataset(index) {
    var dataset = $('.dataset[id*=' + index + ']'),
      text = $('<text>').text(dataset.text());
      console.log(text);
      dataset.replaceWith(text); // Replace dataset in XHTML data
      $('.dataset-link[value*=' + index + ']').parents('.row.dataset-item').remove(); // Remove dataset-link
  }

  // Get the current Object
  return getCurrentObject(function(data) {

    var currentDocument = data;

    colorDatasets(Object.keys(currentDocument.datasets));

    // Fill dataset_validation Forms input with correct data
    function fillCurrentDatasetWithFormValues(index) {
      currentDocument.datasets[index].name = $('#name').val();
      currentDocument.datasets[index].DOI = $('#DOI').val();
      currentDocument.datasets[index].comments = $('#comments').val();
    }

    // Update dataset properties with inputs form
    function fillFormWithDatasetPropertiesOf(index) {
      console.log(currentDocument.datasets[index]);
      $('#dataType').text(currentDocument.datasets[index].dataType);
      $('#descritpion').text(currentDocument.datasets[index].descritpion);
      $('#bestDataForSharing').text(currentDocument.datasets[index].bestDataForSharing);
      $('#mostSuitableRepositories').text(currentDocument.datasets[index].mostSuitableRepositories);
      $('#name').val(currentDocument.datasets[index].name);
      $('#DOI').val(currentDocument.datasets[index].DOI);
      $('#comments').val(currentDocument.datasets[index].comments);
    }

    // Refresh value of dataset index indocators
    function refreshDatasetIndexLabelIndicators(index) {
      $('.datasetNumber').text((index));
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
      for (var key in doc.datasets) {
        var currentDataset = doc.datasets[key];
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
      var index = $(this).attr('value');
      refreshDatasetIndexLabelIndicators(index);
      fillFormWithDatasetPropertiesOf(index);
      toggleDatasetListToForms(index);
    });

    // On dataset click
    $('span.dataset').click(function() {
      var index = $(this).attr('id');
      refreshDatasetIndexLabelIndicators(index);
      fillFormWithDatasetPropertiesOf(index);
      toggleDatasetListToForms(index);
    });

    // On dataType_validation click
    $('#dataType_validation').click(function() {
      console.log('dataType_validation');
      var index = $('#currentDatasetIndex').attr('value'),
        value = $('#selectedDataType option:selected').val();
      currentDocument.datasets[index].dataType = value;
      fillFormWithDatasetPropertiesOf(index);
      toggleDatasetListToForms(index);
    });

    // On remove_current_datatype click
    $('#remove_current_datatype').click(function() {
      console.log('remove_current_datatype');
      var index = $('#currentDatasetIndex').attr('value');
      currentDocument.datasets[index].dataType = '';
      fillFormWithDatasetPropertiesOf(index);
      toggleDatasetListToForms(index);
    });

    // On delete_dataset click
    $('.delete_dataset').click(function() {
      console.log('delete_dataset');
      var index = $(this).attr('value');
      currentDocument.datasets[index] = undefined;
      removeDataset(index);
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
      toggleFormsToDatasetList();
    });

    // On datasets_validation click
    $('#datasets_validation').click(function() {
      console.log('datasets_validation');
      currentDocument.status = 'finish';
      currentDocument.xhtml = $('#xhtml').html();
      updateDocument(currentDocument, function(err, res) {
        console.log(err, res);
        if (err) return err; // Need to define error behavior
        return location.reload();
      });
    });

    // Get the previous status of current document object
    function getPreviousStatus(status) {
      var result = status;
      if (status === "finish") result = "datasets";
      else if (status === "datasets") result = "metadata";
      return result;
    }

    // Get the next status of current document object
    function getNextStatus(status) {
      var result = status;
      if (status === "metadata") result = "datasets";
      else if (status === "datasets") result = "finish";
      return result;
    }

    // On metadata_validation click
    $('#demo_previous_step').click(function() {
      console.log('demo_previous_step');
      currentDocument.status = getPreviousStatus(currentDocument.status);
      updateDocument(currentDocument, function(err, res) {
        console.log(err, res);
        if (err) return err; // Need to define error behavior
        return location.reload();
      });
    });

    // On metadata_validation click
    $('#demo_switch_view').click(function() {
      console.log('demo_switch_view');
      currentDocument.isDataSeer = !currentDocument.isDataSeer;
      updateDocument(currentDocument, function(err, res) {
        console.log(err, res);
        if (err) return err; // Need to define error behavior
        return location.reload();
      });
    });

    // On metadata_validation click
    $('#demo_next_step').click(function() {
      console.log('demo_next_step');
      currentDocument.status = getNextStatus(currentDocument.status);
      updateDocument(currentDocument, function(err, res) {
        console.log(err, res);
        if (err) return err; // Need to define error behavior
        return location.reload();
      });
    });

  });

})();