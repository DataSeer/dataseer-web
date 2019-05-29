(function() {
  // Html Interface Object
  const HtmlInterface = {
    'dataset-form': {
      // Dataset Form Getters
      'getSelectedDataType': function() { // select
        return $(document.getElementById('dataset.selectedDataType')).children('option:selected').val();
      },
      'getIndex': function() { // div
        return $(document.getElementById('dataset.id')).text();
      },
      'getName': function() { // input
        return $(document.getElementById('dataset.name')).val();
      },
      'getComments': function() { // input
        return $(document.getElementById('dataset.comments')).val();
      },
      'getDOI': function() { // input
        return $(document.getElementById('dataset.DOI')).val();
      },
      'getConfidence': function() { // div
        return $(document.getElementById('dataset.confidence')).text();
      },
      'getDataType': function() { // div
        return $(document.getElementById('dataset.dataType')).text();
      },
      'getDescritpion': function() { // div
        return $(document.getElementById('dataset.descritpion')).text();
      },
      'getBestDataForSharing': function() { // div
        return $(document.getElementById('dataset.bestDataForSharing')).text();
      },
      'getMostSuitableRepositories': function() { // div
        return $(document.getElementById('dataset.mostSuitableRepositories')).text();
      },
      // Dataset Form Setters
      'setIndex': function(value) { // div
        return $(document.getElementById('dataset.id')).text(value);
      },
      'setName': function(value) { // input
        return $(document.getElementById('dataset.name')).val(value);
      },
      'setComments': function(value) { // input
        return $(document.getElementById('dataset.comments')).val(value);
      },
      'setDOI': function(value) { // input
        return $(document.getElementById('dataset.DOI')).val(value);
      },
      'setConfidence': function(value) { // div
        return $(document.getElementById('dataset.confidence')).text(value);
      },
      'setDataType': function(value) { // div
        return $(document.getElementById('dataset.dataType')).text(value);
      },
      'setDescritpion': function(value) { // div
        return $(document.getElementById('dataset.descritpion')).text(value);
      },
      'setBestDataForSharing': function(value) { // div
        return $(document.getElementById('dataset.bestDataForSharing')).text(value);
      },
      'setMostSuitableRepositories': function(value) { // div
        return $(document.getElementById('dataset.mostSuitableRepositories')).text(value);
      },
      // Fill dataset with values of currentDataset, its confidence & index
      'fill': function(currentDataset, confidence, index) {
        HtmlInterface['dataset-form'].setConfidence(confidence);
        HtmlInterface['dataset-form'].setIndex(index);
        HtmlInterface['dataset-form'].setDataType(currentDataset.dataType);
        HtmlInterface['dataset-form'].setDescritpion(currentDataset.descritpion);
        HtmlInterface['dataset-form'].setBestDataForSharing(currentDataset.bestDataForSharing);
        HtmlInterface['dataset-form'].setMostSuitableRepositories(currentDataset.mostSuitableRepositories);
        HtmlInterface['dataset-form'].setName(currentDataset.name);
        HtmlInterface['dataset-form'].setDOI(currentDataset.DOI);
        HtmlInterface['dataset-form'].setComments(currentDataset.comments);
      },
      'setStyle': function(style) { // div
        return $(document.getElementById('dataset.id')).attr('style', style);
      },
      'show': function(dataType) { // Show dataset-form
        if (dataType) {
          HtmlInterface['dataset-dataType-form'].hide();
          HtmlInterface['dataset-poperties-form'].show();
        } else {
          HtmlInterface['dataset-dataType-form'].show();
          HtmlInterface['dataset-poperties-form'].hide();
        }
        return $('#dataset-form').show();
      },
      'hide': function() { // Hide dataset-form
        return $('#dataset-form').hide();
      }
    },
    'dataset-poperties-form': {
      'show': function() { // Show dataset-poperties-form
        return $('#dataset-poperties-form').show();
      },
      'hide': function() { // Hide dataset-poperties-form
        return $('#dataset-poperties-form').hide();
      }
    },
    'dataset-dataType-form': {
      'show': function() { // Show dataset-dataType-form
        return $('#dataset-dataType-form').show();
      },
      'hide': function() { // Hide dataset-dataType-form
        return $('#dataset-dataType-form').hide();
      }
    },
    'datasets-list': {
      // Get dataset with given id
      'getDatasetLink': function(id) {
        return $('.dataset-link[value*=' + id + ']');
      },
      // Get dataset with given id
      'getDatasetLinkRow': function(id) {
        return $('.dataset-link[value*=' + id + ']').parents('.row.dataset-item');
      },
      'show': function() { // Show datasets-list
        return $('#datasets-list').show();
      },
      'hide': function() { // Hide datasets-list
        return $('#datasets-list').hide();
      }
    },
    'document-view': {
      // Get Source of document
      'getSource': function() {
        return $(document.getElementById('dataset.source')).html();
      },
      // Get Source of document
      'getDocumentView': function() {
        return $(document.getElementById('document-view'));
      },
      // Get dataset with given id
      'getDataset': function(id) {
        return $('tei text div[subtype="dataseer"] s[id=' + id + ']');
      },
      // Get dataset with given id
      'getStyleOfDataset': function(id) {
        return HtmlInterface['document-view'].getDataset(id).attr('style');
      },
      // Get dataset confidence with given id
      'getDatasetConfidence': function(id) {
        let confidence = parseFloat($('tei text div[subtype="dataseer"] s[id=' + id + ']').attr('confidence'));
        if (!confidence || confidence <= 0.5) confidence = 0.5;
        return confidence;
      },
      // Remove class of tei .document
      'setAllVisible': function() {
        return HtmlInterface['document-view'].getDocumentView().removeClass();
      },
      // Set class of tei .document
      'setOnlyDataseer': function() {
        HtmlInterface['document-view'].setAllVisible();
        return HtmlInterface['document-view'].getDocumentView().addClass('tei-only-dataseer');
      },
      // Set class of tei .document
      'setOnlyDataets': function() {
        HtmlInterface['document-view'].setAllVisible();
        return HtmlInterface['document-view'].getDocumentView().addClass('tei-only-datasets');
      },
      'scrollToDataset': function(id) {
        let position = HtmlInterface['document-view'].getDataset(id).position().top + HtmlInterface['document-view'].getDocumentView().scrollTop() - 14;
        return HtmlInterface['document-view'].getDocumentView().animate({scrollTop: position});
      },
      // Create a new Text Element
      'newTextElement': function() {
        return $('<text>');
      }
    },
    // Set color of each datasets
    'setColorOfDatasets': function(ids) {
      for (let i = 0; i < ids.length; i++) {
        HtmlInterface.setColorOfDataset(ids[i]);
      }
    },
    // Color dataset (span & "link")
    'setColorOfDataset': function(id) {
      let confidence = HtmlInterface['document-view'].getDatasetConfidence(id),
        color = randomColor({ luminosity: 'light', hue: 'blue', format: 'rgba', alpha: confidence }),
        dataset = HtmlInterface['document-view'].getDataset(id),
        datasetLink = HtmlInterface['datasets-list'].getDatasetLink(id);
      dataset.attr('title', 'confidence : ' + confidence);
      dataset.attr('style', 'background-color:' + color);
      datasetLink.attr('style', 'background-color:' + color);
    },
    // Remove dataset with given id
    'removeDataset': function(id) {
      let dataset = HtmlInterface['document-view'].getDataset(id),
        datasetLinkRow = HtmlInterface['datasets-list'].getDatasetLinkRow(id),
        text = HtmlInterface['document-view'].newTextElement().text(dataset.text());
      dataset.replaceWith(text); // Replace dataset in XHTML data
      datasetLinkRow.remove(); // Remove dataset-link
    }
  };

  // Get the current Object
  return MongoDB.getCurrentDocument(function(currentDocument) {

    // Set dataset colors
    HtmlInterface.setColorOfDatasets(Object.keys(currentDocument.datasets));
    toggleFormsToDatasetList();

    // Fill dataset Forms input with correct data
    function fillCurrentDatasetWithFormValues(id) {
      currentDocument.datasets[id].name = HtmlInterface['dataset-form'].getName();
      currentDocument.datasets[id].DOI = HtmlInterface['dataset-form'].getDOI();
      currentDocument.datasets[id].comments = HtmlInterface['dataset-form'].getComments();
    }

    // Update dataset properties with inputs form
    function fillFormWithDatasetPropertiesOf(id) {
      let confidence = HtmlInterface['document-view'].getDatasetConfidence(id),
        style = HtmlInterface['document-view'].getStyleOfDataset(id);
      HtmlInterface['dataset-form'].setStyle(style);
      HtmlInterface['dataset-form'].fill(currentDocument.datasets[id], confidence, id);
    }

    // Refresh value of dataset id indocators
    function refreshDatasetIndexLabelIndicators(id) {
      HtmlInterface['dataset-form'].setIndex(id);
    }

    function toggleDatasetListToForms(id) {
      HtmlInterface['datasets-list'].hide();
      HtmlInterface['dataset-form'].show(currentDocument.datasets[id].dataType);
      HtmlInterface['document-view'].scrollToDataset(id);
    }

    function toggleFormsToDatasetList() {
      HtmlInterface['datasets-list'].show();
      HtmlInterface['dataset-form'].hide();
    }

    // Check dataset properties
    function checkDataset(dataset) {
      let result = true;
      return result;
    }

    // Check Datasets of a given Document
    function checkDatasetsOf(doc) {
      let result = true;
      for (let key in doc.datasets) {
        let currentDataset = doc.datasets[key];
        result &= checkDataset(currentDataset);
      }
      return result;
    }

    // On dataset-link click
    $('.dataset-link').click(function() {
      let id = $(this).attr('value');
      refreshDatasetIndexLabelIndicators(id);
      fillFormWithDatasetPropertiesOf(id);
      toggleDatasetListToForms(id);
    });

    // On dataset click
    $('s[id]').click(function() {
      let id = $(this).attr('id');
      refreshDatasetIndexLabelIndicators(id);
      fillFormWithDatasetPropertiesOf(id);
      toggleDatasetListToForms(id);
    });

    // On dataType_validation click
    $('#dataType_validation').click(function() {
      let id = HtmlInterface['dataset-form'].getIndex(),
        value = HtmlInterface['dataset-form'].getSelectedDataType();
      currentDocument.datasets[id].dataType = value;
      fillFormWithDatasetPropertiesOf(id);
      toggleDatasetListToForms(id);
    });

    // On remove_current_datatype click
    $('#remove_current_datatype').click(function() {
      let id = HtmlInterface['dataset-form'].getIndex();
      currentDocument.datasets[id].dataType = '';
      fillFormWithDatasetPropertiesOf(id);
      toggleDatasetListToForms(id);
    });

    // On delete_dataset click
    $('.delete_dataset').click(function() {
      let id = $(this).attr('value');
      currentDocument.datasets[id] = undefined;
      HtmlInterface.removeDataset(id);
    });

    // On dataset_validation click
    $('#dataset_validation').click(function() {
      let id = HtmlInterface['dataset-form'].getIndex(),
        name = HtmlInterface['dataset-form'].getName(),
        DOI = HtmlInterface['dataset-form'].getDOI(),
        comments = HtmlInterface['dataset-form'].getComments();
      currentDocument.datasets[id].name = name;
      currentDocument.datasets[id].DOI = DOI;
      currentDocument.datasets[id].comments = comments;
      toggleFormsToDatasetList();
    });

    // On datasets_validation click
    $('#datasets_validation').click(function() {
      currentDocument.status = MongoDB.getNextStatus(currentDocument);
      currentDocument.source = HtmlInterface['document-view'].getSource();
      MongoDB.updateDocument(currentDocument, function(err, res) {
        console.log(err, res);
        if (err) return err; // Need to define error behavior
        return location.reload();
      });
    });

    // On tei_all_visible click
    $('#tei_all_visible').click(function() {
      HtmlInterface['document-view'].setAllVisible();
    });

    // On tei_only_dataseer click
    $('#tei_only_dataseer').click(function() {
      HtmlInterface['document-view'].setOnlyDataseer();
    });

    // On tei_only_datasets click
    $('#tei_only_datasets').click(function() {
      HtmlInterface['document-view'].setOnlyDataets();
    });
  });
})();