(function() {
  // Html Interface Object
  const HtmlInterface = {
    'dataset-form': {
      // Dataset Form Getters
      'getSelectedDataType': function() {
        return $(document.getElementById('dataset.selectedDataType')).children('option:selected').text();
      },
      'getSelectedDataTypeValue': function() {
        return $(document.getElementById('dataset.selectedDataType')).children('option:selected').val();
      },
      'getSelectedDataTypeFirstOptionValue': function() {
        return $(document.getElementById('dataset.selectedDataType')).children('option:first').val();
      },
      'getSelectedDescritpion': function() {
        return $(document.getElementById('dataset.selectedDescritpion')).children('option:selected').text();
      },
      'getSelectedBestDataFormatForSharing': function() {
        return $(document.getElementById('dataset.selectedBestDataFormatForSharing')).children('option:selected').text();
      },
      'getSelectedMostSuitableRepositories': function() {
        return $(document.getElementById('dataset.selectedMostSuitableRepositories')).children('option:selected').text();
      },
      'getIndex': function() {
        return $(document.getElementById('dataset.id')).text();
      },
      'getName': function() {
        return $(document.getElementById('dataset.name')).val();
      },
      'getComments': function() {
        return $(document.getElementById('dataset.comments')).val();
      },
      'getDOI': function() {
        return $(document.getElementById('dataset.DOI')).val();
      },
      'getConfidence': function() {
        return $(document.getElementById('dataset.confidence')).text();
      },
      'getDataType': function() {
        return $(document.getElementById('dataset.dataType')).text();
      },
      'getDescritpion': function() {
        return $(document.getElementById('dataset.descritpion')).text();
      },
      'getBestDataFormatForSharing': function() {
        return $(document.getElementById('dataset.bestDataFormatForSharing')).text();
      },
      'getMostSuitableRepositories': function() {
        return $(document.getElementById('dataset.mostSuitableRepositories')).text();
      },
      // Dataset Element getters
      'getDataTypeElement': function() {
        return $(document.getElementById('dataset.dataType'));
      },
      'getSelectedDataTypeElement': function() {
        return $(document.getElementById('dataset.selectedDataType'));
      },
      'getSelectedDataTypeSelectedOptionElement': function() {
        return $(document.getElementById('dataset.selectedDataType')).children('option:selected');
      },
      'getSelectedDataTypeFirstOptionELement': function() {
        return $(document.getElementById('dataset.selectedDataType')).children('option:first');
      },
      'getSelectedDescritpionElement': function() {
        return $(document.getElementById('dataset.selectedDescritpion'));
      },
      'getSelectedDescritpionSelectedOptionElement': function() {
        return $(document.getElementById('dataset.selectedDescritpion')).children('option:selected');
      },
      'getSelectedBestDataFormatForSharingElement': function() {
        return $(document.getElementById('dataset.selectedBestDataFormatForSharing'));
      },
      'getSelectedBestDataFormatForSharingSelectedOptionElement': function() {
        return $(document.getElementById('dataset.selectedBestDataFormatForSharing')).children('option:selected');
      },
      'getSelectedMostSuitableRepositoriesElement': function() {
        return $(document.getElementById('dataset.selectedMostSuitableRepositories'));
      },
      'getSelectedMostSuitableRepositoriesSelectedOptionElement': function() {
        return $(document.getElementById('dataset.selectedMostSuitableRepositories')).children('option:selected');
      },
      'getIndexElement': function() {
        return $(document.getElementById('dataset.id'));
      },
      'getNameElement': function() {
        return $(document.getElementById('dataset.name'));
      },
      'getDOIElement': function() {
        return $(document.getElementById('dataset.DOI'));
      },
      'getCommentsElement': function() {
        return $(document.getElementById('dataset.comments'));
      },
      'getStatusElement': function() {
        return $(document.getElementById('dataset.status'));
      },
      'getStatusSuccessElement': function() {
        return HtmlInterface['dataset-form'].getStatusElement().children('div.success');
      },
      'getStatusWarningElement': function() {
        return HtmlInterface['dataset-form'].getStatusElement().children('div.warning');
      },
      // Dataset Form Setters
      'setIndex': function(value) {
        return $(document.getElementById('dataset.id')).text(value);
      },
      'setName': function(value) {
        return $(document.getElementById('dataset.name')).val(value);
      },
      'setComments': function(value) {
        return $(document.getElementById('dataset.comments')).val(value);
      },
      'setDOI': function(value) {
        return $(document.getElementById('dataset.DOI')).val(value);
      },
      'setConfidence': function(value) {
        return $(document.getElementById('dataset.confidence')).text(value);
      },
      'setDataType': function(value) {
        return $(document.getElementById('dataset.dataType')).text(value);
      },
      'setDescritpion': function(value) {
        return $(document.getElementById('dataset.descritpion')).text(value);
      },
      'setBestDataFormatForSharing': function(value) {
        return $(document.getElementById('dataset.bestDataFormatForSharing')).text(value);
      },
      'setMostSuitableRepositories': function(value) {
        return $(document.getElementById('dataset.mostSuitableRepositories')).text(value);
      },
      'setStatus': function(value) {
        if (value === 'success') {
          HtmlInterface['dataset-form'].toggleStatus_WarningToSuccess();
        } else {
          HtmlInterface['dataset-form'].toggleStatus_SuccessToWarning();
        }
      },
      // Fill dataset with values of currentDataset, its confidence & index
      'fill': function(currentDataset, confidence, index) {
        HtmlInterface['dataset-form'].setStatus(currentDataset.status);
        HtmlInterface['dataset-form'].setConfidence(confidence);
        HtmlInterface['dataset-form'].setIndex(index);
        HtmlInterface['dataset-form'].setDataType(currentDataset.dataType);
        HtmlInterface['dataset-form'].setDescritpion(currentDataset.descritpion);
        HtmlInterface['dataset-form'].setBestDataFormatForSharing(currentDataset.bestDataFormatForSharing);
        HtmlInterface['dataset-form'].setMostSuitableRepositories(currentDataset.mostSuitableRepositories);
        HtmlInterface['dataset-form'].setName(currentDataset.name);
        HtmlInterface['dataset-form'].setDOI(currentDataset.DOI);
        HtmlInterface['dataset-form'].setComments(currentDataset.comments);
        HtmlInterface['dataset-form'].getNameElement().attr('placeholder', currentDataset.dataType);
        HtmlInterface['dataset-form'].getDOIElement().attr('placeholder', 'n/a');
        HtmlInterface['dataset-form'].getCommentsElement().attr('placeholder', 'n/a');
      },
      'setStyle': function(style) {
        return $(document.getElementById('dataset.id')).attr('style', style);
      },
      'toggleStatus_SuccessToWarning': function() {
        HtmlInterface['dataset-form'].displayWarning();
        HtmlInterface['dataset-form'].hideSuccess();
      },
      'toggleStatus_WarningToSuccess': function() {
        HtmlInterface['dataset-form'].hideWarning();
        HtmlInterface['dataset-form'].displaySuccess();
      },
      'displayWarning': function() {
        return HtmlInterface['dataset-form'].getStatusWarningElement().removeClass('hidden');
      },
      'hideWarning': function() {
        return HtmlInterface['dataset-form'].getStatusWarningElement().addClass('hidden');
      },
      'displaySuccess': function() {
        return HtmlInterface['dataset-form'].getStatusSuccessElement().removeClass('hidden');
      },
      'hideSuccess': function() {
        return HtmlInterface['dataset-form'].getStatusSuccessElement().addClass('hidden');
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
      // Get new dataset id
      'getNewDatasetId': function() {
        return $(document.getElementById('newDataset.id')).val();
      },
      // Get dataset with given id
      'getDatasetLink': function(id) {
        return $('.dataset-link[value*=' + id + ']');
      },
      'getDatasetLinkWarningStatus': function(id) {
        return $('.warning[value*=' + id + ']');
      },
      'getDatasetLinkSuccessStatus': function(id) {
        return $('.success[value*=' + id + ']');
      },
      // Get datasetLink with given id
      'getDatasetLinkRow': function(id) {
        return $('.dataset-link[value*=' + id + ']').parents('.row.dataset-item');
      },
      'show': function() { // Show datasets-list
        return $('#datasets-list').show();
      },
      'hide': function() { // Hide datasets-list
        return $('#datasets-list').hide();
      },
      'toggleDatasetStatus_SuccessToWarning': function(id) {
        HtmlInterface['datasets-list'].displayWarningOfDataset(id);
        HtmlInterface['datasets-list'].hideSuccessOfDataset(id);
      },
      'toggleDatasetStatus_WarningToSuccess': function(id) {
        HtmlInterface['datasets-list'].hideWarningOfDataset(id);
        HtmlInterface['datasets-list'].displaySuccessOfDataset(id);
      },
      'displayWarningOfDataset': function(id) {
        return HtmlInterface['datasets-list'].getDatasetLinkWarningStatus(id).removeClass('hidden');
      },
      'hideWarningOfDataset': function(id) {
        return HtmlInterface['datasets-list'].getDatasetLinkWarningStatus(id).addClass('hidden');
      },
      'displaySuccessOfDataset': function(id) {
        return HtmlInterface['datasets-list'].getDatasetLinkSuccessStatus(id).removeClass('hidden');
      },
      'hideSuccessOfDataset': function(id) {
        return HtmlInterface['datasets-list'].getDatasetLinkSuccessStatus(id).addClass('hidden');
      },
      'refreshDatasetsIndicators': function(datasets) {
        for (let key in datasets) {
          if (datasets[key].status === 'success') {
            HtmlInterface['datasets-list'].toggleDatasetStatus_WarningToSuccess(key);
          } else {
            HtmlInterface['datasets-list'].toggleDatasetStatus_SuccessToWarning(key);
          }
        }
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
      // Get dataset corresp list with given id
      'getDatasetCorrespList': function(id) {
        return $('tei text div[subtype="dataseer"] s[corresp="#' + id + '"]');
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
        HtmlInterface['document-view'].getParagraphsWithoutDatasets().removeClass();
        return HtmlInterface['document-view'].getDocumentView().removeClass();
      },
      // Set class of tei .document
      'setOnlyDataseer': function() {
        HtmlInterface['document-view'].setAllVisible();
        return HtmlInterface['document-view'].getDocumentView().addClass('tei-only-dataseer');
      },
      getParagraphsWithoutDatasets: function() {
        let paragraphs = $('#document-view div[subtype="dataseer"] > div > p');
        return paragraphs.map(function(i, el) {
          if ($(el).children('s').length === 0) return el;
        });
      },
      // Set class of tei .document
      'setOnlyDataets': function() {
        HtmlInterface['document-view'].setOnlyDataseer();
        return HtmlInterface['document-view'].getParagraphsWithoutDatasets().addClass('hidden');
      },
      'scrollToDataset': function(id) {
        let position = HtmlInterface['document-view'].getDataset(id).position().top + HtmlInterface['document-view'].getDocumentView().scrollTop() - 14;
        return HtmlInterface['document-view'].getDocumentView().animate({ scrollTop: position });
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
        datasetCorrespList = HtmlInterface['document-view'].getDatasetCorrespList(id),
        datasetLink = HtmlInterface['datasets-list'].getDatasetLink(id);
      dataset.attr('title', 'confidence : ' + confidence);
      dataset.attr('style', 'background-color:' + color);
      datasetCorrespList.attr('style', 'background-color:' + color);
      datasetLink.attr('style', 'background-color:' + color);
    },
    // Remove dataset with given id
    'removeDataset': function(id) {
      let dataset = HtmlInterface['document-view'].getDataset(id),
        datasetLinkRow = HtmlInterface['datasets-list'].getDatasetLinkRow(id),
        //   text = HtmlInterface['document-view'].newTextElement().text(dataset.text());
        // dataset.replaceWith(text); // Replace dataset in XHTML data
        datasetCorrespList = HtmlInterface['document-view'].getDatasetCorrespList(id),
        text = dataset.text();
      dataset.replaceWith(text); // Replace dataset in XHTML data
      datasetCorrespList.map(function(i, el) {
        $(el).replaceWith($(el).text());
      }); // Replace all dataset corresp in XHTML data
      datasetLinkRow.remove(); // Remove dataset-link
    },
    // get HTML of new dataset with given id
    'newDatasetHTML': function(id, html) {
      let result = $('<s>').attr('id', id).attr('type', '').html(html);
      return result.wrap('<p/>').parent().html();
    },
    // get HTML of new dataset with given id
    'newDataset': function(text) {
      return {
        'dataType': HtmlInterface['dataset-form'].getSelectedDataTypeFirstOptionValue(),
        'descritpion': '',
        'bestDataFormatForSharing': '',
        'mostSuitableRepositories': '',
        'DOI': '',
        'name': '',
        'comments': '',
        'text': text,
        'status': 'warning',
      };
    }
  };

  // Get the current Object
  return MongoDB.getCurrentDocument(function(currentDocument) {

    // this object will store unsaved data from forms
    let unSavedDocument = JSON.parse(JSON.stringify(currentDocument));

    // Set dataset colors
    HtmlInterface.setColorOfDatasets(Object.keys(currentDocument.datasets));
    refreshDatasetsIndicators();
    fillFormWithDatasetPropertiesOf(Object.keys(currentDocument.datasets)[0]);

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
      HtmlInterface['document-view'].scrollToDataset(id);
      hideDatatypesSelection();
    }

    // Refresh value of dataset id indocators
    function refreshDatasetIndexLabelIndicators(id) {
      HtmlInterface['dataset-form'].setIndex(id);
    }

    function toggleDatasetListToForms(id) {
      HtmlInterface['datasets-list'].hide();
      HtmlInterface['dataset-form'].show(currentDocument.datasets[id].dataType);
    }

    function displayDatatypesSelection(id) {
      HtmlInterface['dataset-dataType-form'].show();
      HtmlInterface['dataset-form'].getSelectedDataTypeElement().val(currentDocument.datasets[id].dataType).change();
    }

    function hideDatatypesSelection() {
      HtmlInterface['dataset-dataType-form'].hide();
    }

    function toggleSelectDatatypesToCurrentDatatype() {
      hideDatatypesSelection();
      displayCurrentDatatype();
    }

    function toggleCurrentDatatypeToSelectDatatypes(id) {
      displayDatatypesSelection(id);
      hideCurrentDatatype();
    }


    function displayCurrentDatatype() {
      $('#currentDataType').show();
    }

    function hideCurrentDatatype() {
      $('#currentDataType').hide();
    }

    function refreshDatasetsIndicators(id) {
      // HtmlInterface['datasets-list'].show();
      // HtmlInterface['dataset-form'].hide();
      if (id) HtmlInterface['dataset-form'].setStatus(currentDocument.datasets[id].status);
      HtmlInterface['datasets-list'].refreshDatasetsIndicators(currentDocument.datasets);
    }

    // Check dataset properties
    function checkDataset(dataset) {
      return (dataset.status === 'success');
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

    HtmlInterface['dataset-form'].getSelectedDataTypeElement().change(function() {
      HtmlInterface['dataset-form'].getSelectedDescritpionElement().val($(this).val());
      HtmlInterface['dataset-form'].getSelectedBestDataFormatForSharingElement().val($(this).val());
      HtmlInterface['dataset-form'].getSelectedMostSuitableRepositoriesElement().val($(this).val());
    });

    HtmlInterface['dataset-form'].getIndexElement().click(function() {
      let id = $(this).text();
      HtmlInterface['document-view'].scrollToDataset(id);
    });

    HtmlInterface['dataset-form'].getNameElement().change(function() {
      let id = HtmlInterface['dataset-form'].getIndex();
      currentDocument.datasets[id].status = 'warning';
      HtmlInterface['dataset-form'].setStatus(currentDocument.datasets[id].status);
      currentDocument.datasets[id].name = HtmlInterface['dataset-form'].getName();
    });

    HtmlInterface['dataset-form'].getDOIElement().change(function() {
      let id = HtmlInterface['dataset-form'].getIndex();
      currentDocument.datasets[id].status = 'warning';
      HtmlInterface['dataset-form'].setStatus(currentDocument.datasets[id].status);
      currentDocument.datasets[id].name = HtmlInterface['dataset-form'].getName();
    });

    HtmlInterface['dataset-form'].getCommentsElement().change(function() {
      let id = HtmlInterface['dataset-form'].getIndex();
      currentDocument.datasets[id].status = 'warning';
      HtmlInterface['dataset-form'].setStatus(currentDocument.datasets[id].status);
      currentDocument.datasets[id].comments = HtmlInterface['dataset-form'].getComments();
    });

    // On dataset-link click
    $('.dataset-link').click(function() {
      let id = $(this).attr('value');
      refreshDatasetIndexLabelIndicators(id);
      fillFormWithDatasetPropertiesOf(id);
      // toggleDatasetListToForms(id);
    });

    // On dataset click
    $('s[id]').click(function() {
      let id = $(this).attr('id');
      refreshDatasetIndexLabelIndicators(id);
      fillFormWithDatasetPropertiesOf(id);
      // toggleDatasetListToForms(id);
    });

    // On dataset click
    $('s[corresp]').click(function() {
      let id = $(this).attr('corresp').replace('#', '');
      refreshDatasetIndexLabelIndicators(id);
      fillFormWithDatasetPropertiesOf(id);
      // toggleDatasetListToForms(id);
    });

    // On dataType_validation click
    $('#dataType_validation').click(function() {
      let id = HtmlInterface['dataset-form'].getIndex(),
        selectedDataType = HtmlInterface['dataset-form'].getSelectedDataType(),
        selectedDataTypeValue = HtmlInterface['dataset-form'].getSelectedDataTypeValue(),
        selectedDescritpion = HtmlInterface['dataset-form'].getSelectedDescritpion(),
        selectedBestDataFormatForSharing = HtmlInterface['dataset-form'].getSelectedBestDataFormatForSharing(),
        selectedMostSuitableRepositories = HtmlInterface['dataset-form'].getSelectedMostSuitableRepositories();
      currentDocument.datasets[id].dataType = (selectedDataTypeValue === '-1') ? '' : selectedDataType;
      currentDocument.datasets[id].descritpion = selectedDescritpion;
      currentDocument.datasets[id].bestDataFormatForSharing = selectedBestDataFormatForSharing;
      currentDocument.datasets[id].mostSuitableRepositories = selectedMostSuitableRepositories;
      currentDocument.datasets[id].status = 'warning';
      refreshDatasetsIndicators(id);
      fillFormWithDatasetPropertiesOf(id);
      toggleSelectDatatypesToCurrentDatatype();
      // toggleDatasetListToForms(id);
    });

    // On remove_current_datatype click
    $('#remove_current_datatype').click(function() {
      let id = HtmlInterface['dataset-form'].getIndex();
      toggleCurrentDatatypeToSelectDatatypes(id);
      // toggleDatasetListToForms(id);
    });

    // On dataType_cancel click
    $('#dataType_cancel').click(function() {
      let id = HtmlInterface['dataset-form'].getIndex();
      refreshDatasetsIndicators();
      toggleSelectDatatypesToCurrentDatatype();
      fillFormWithDatasetPropertiesOf(id);
    });

    // On delete_dataset click
    $('.delete_dataset').click(function() {
      let id = $(this).attr('value');
      currentDocument.datasets[id] = undefined;
      HtmlInterface.removeDataset(id);
      currentDocument.source = HtmlInterface['document-view'].getSource();
      MongoDB.updateDocument(currentDocument, function(err, res) {
        console.log(err, res);
        if (err) return err; // Need to define error behavior
        return location.reload();
      });
    });

    // On dataset_validation click
    $('#dataset_validation').click(function() {
      $('#dataType_cancel').click();
      let id = HtmlInterface['dataset-form'].getIndex(),
        name = HtmlInterface['dataset-form'].getName(),
        DOI = HtmlInterface['dataset-form'].getDOI(),
        comments = HtmlInterface['dataset-form'].getComments();
      currentDocument.datasets[id].name = (name) ? name : HtmlInterface['dataset-form'].getNameElement().attr('placeholder');
      currentDocument.datasets[id].DOI = (DOI) ? DOI : '';
      currentDocument.datasets[id].comments = (comments) ? comments : '';
      currentDocument.datasets[id].status = 'success';
      currentDocument.source = HtmlInterface['document-view'].getSource();
      MongoDB.updateDocument(currentDocument, function(err, res) {
        console.log(err, res);
        if (err) return err; // Need to define error behavior
      });
      refreshDatasetsIndicators(id);
    });

    // On datasets_save click
    $('#datasets_save').click(function() {});

    // On add_dataset click
    $('#add_dataset').click(function() {
      let selection = window.getSelection(),
        focusNode = $(selection.focusNode),
        focusParent = focusNode.parent(),
        anchorNode = $(selection.anchorNode),
        anchorParent = anchorNode.parent(),
        newDatasetId = HtmlInterface['datasets-list'].getNewDatasetId();
      if (newDatasetId !== '') {
        if (typeof currentDocument.datasets[newDatasetId] === 'undefined') {
          if (!selection.isCollapsed && selection.anchorNode && selection.focusNode) {
            if (anchorParent.is(focusParent)) { // case selectioned elements had same parent
              let html = anchorParent.html(),
                nodes = selection.getRangeAt(0).cloneContents().childNodes,
                nodesHtml = '';
              for (let i = 0; i < nodes.length; i++) {
                if (nodes[i].outerHTML) nodesHtml += nodes[i].outerHTML;
                else if (nodes[i].wholeText) nodesHtml += nodes[i].wholeText;
              }
              nodesHtml = nodesHtml.replace(/(\r\n|\n|\r)/gm, '');
              html = html.replace(/(\r\n|\n|\r)/gm, '');
              anchorParent.html(html.replace(nodesHtml, HtmlInterface.newDatasetHTML(newDatasetId, nodesHtml)));
              currentDocument.datasets[newDatasetId] = HtmlInterface.newDataset(nodesHtml);
              currentDocument.source = HtmlInterface['document-view'].getSource();
              MongoDB.updateDocument(currentDocument, function(err, res) {
                console.log(err, res);
                if (err) return err; // Need to define error behavior
                return location.reload();
              });
            } else { // case selectioned elements had not same parent
              alert('case of selectioned elements had not same parent');
            }
          } else {
            alert('You need to select text of the document');
          }
        } else {
          alert('ID of new dataset already used');
        }
      } else {
        alert('ID of new dataset required');
      }
    });

    // On datasets_validation click
    $('#datasets_validation').click(function() {
      if (checkDatasetsOf(currentDocument)) {
        currentDocument.status = MongoDB.getNextStatus(currentDocument);
        currentDocument.source = HtmlInterface['document-view'].getSource();
        MongoDB.updateDocument(currentDocument, function(err, res) {
          console.log(err, res);
          if (err) return err; // Need to define error behavior
          return location.reload();
        });
      } else {
        alert('You need to verify all datasets before continue');
      }
    });

    // On tei_all_visible click
    $('#tei_all_visible').click(function() {
      HtmlInterface['document-view'].setAllVisible();
      $('#tei_only_dataseer').parent('label').removeClass('active');
      $('#tei_all_visible').parent('label').removeClass('active');
      $(this).parent('label').addClass('active');
    });

    // On tei_only_dataseer click
    $('#tei_only_dataseer').click(function() {
      HtmlInterface['document-view'].setOnlyDataseer();
      $('#tei_all_visible').parent('label').removeClass('active');
      $('#tei_only_datasets').parent('label').removeClass('active');
      $(this).parent('label').addClass('active');
    });

    // On tei_only_datasets click
    $('#tei_only_datasets').click(function() {
      HtmlInterface['document-view'].setOnlyDataets();
      $('#tei_all_visible').parent('label').removeClass('active');
      $('#tei_only_dataseer').parent('label').removeClass('active');
      $(this).parent('label').addClass('active');
    });
  });
})();