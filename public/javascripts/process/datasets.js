/*
 * @prettier
 */

'use strict';

(function ($) {
  // Get current document Id
  const documentId = $(document.getElementById('document.id')).attr('value'),
    save = function () {},
    user = {
      id: $('#user_id').attr('value'),
      username: $('#user_username').attr('value'),
      isCurator: $('#user_role').attr('value') === 'curator',
      role: $('#user_role').attr('value')
    },
    showLoop = function () {
      let loop = $('#loading-loop'),
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
      $('#loading-loop').hide();
    };

  // window.addEventListener('unhandledrejection', function (event) {
  //   alert(`An error has occured while processing this document... (${documentId})`);
  //   hideLoop();
  // });

  showLoop();

  const documentView = new DocumentView('documentView'),
    datasetsList = new DatasetsList('datasetsList'),
    datasetForm = new DatasetForm('datasetForm');

  // Get data of current document with datasets informations
  return DataSeerAPI.getDocument(documentId, { datasets: true }, function (err, doc) {
    // Get PDF content
    return DataSeerAPI.getPDF(doc.pdf, function (err, pdf) {
      // Get TEI content
      return DataSeerAPI.getTEI(doc.tei, function (err, tei) {
        // Get datatypes
        DataSeerAPI.jsonDataTypes(function (err, datatypes) {
          if (err) return alert('Error : Datatypes unavailable, dataseer-ml service does not respond');
          const currentDocument = new DocumentHandler({
            ids: { document: doc._id, datasets: doc.datasets._id },
            user: user,
            datatypes: datatypes,
            datasets: doc.datasets,
            metadata: doc.metadata,
            tei: tei.data,
            pdf: { buffer: pdf.data.data, metadata: pdf.metadata }
          });

          currentDocument.link({ documentView: documentView, datasetsList: datasetsList, datasetForm: datasetForm });

          // On datasets_validation click
          $('#datasets_validation').click(function () {
            if (currentDocument.hasChanges())
              return alert('You must save your changes before process datasets validation');
            return DataSeerAPI.validateDatasets(documentId, function (err, res) {
              console.log(err, res);
              if (err || res.err) {
              } else return (window.location.href = window.location.href.replace(/(\/?datasets\/?)$/, ''));
            });
          });

          // On confirm button click of modal
          $('#datasets-confirm-modal-valid').click(function () {
            let id = $('#datasets-confirm-modal-data').html();
            datasetsList.delete(id);
          });

          // On back_to_metadata click
          $('#back_to_metadata').click(function () {
            return DataSeerAPI.backToMetadata(documentId, function (err, res) {
              console.log(err, res);
              if (err || res.err) return alert('Process has failed');
              else return (window.location.href = window.location.href.replace(/(\/?datasets\/?)$/, ''));
            });
          });

          window.onbeforeunload = function () {
            if (currentDocument.hasChanges())
              return confirm('Are you sure you want to navigate away from this page? Changes will not be saved !');
          };
        });
      });
    });
  });
})(jQuery);
