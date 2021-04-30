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
      $('#loading-loop .infos').show();
    },
    setTextLoop = function (text) {
      $('#loading-loop .infos .sub').html(text);
    },
    setHeaderLoop = function (text) {
      $('#loading-loop .infos .top').text(text);
    },
    hideLoop = function () {
      $('#loading-loop').hide();
    };

  // window.addEventListener('unhandledrejection', function (event) {
  //   alert(`An error has occured while processing this document... (${documentId})`);
  //   hideLoop();
  // });

  showLoop();
  setHeaderLoop('Initializing DataSeer UI');
  const documentView = new DocumentView('documentView'),
    datasetsList = new DatasetsList('datasetsList'),
    datasetForm = new DatasetForm('datasetForm');

  setTextLoop('Downloading datasets...');
  // Get data of current document with datasets informations
  return DataSeerAPI.getDocument(documentId, { datasets: true }, function (err, doc) {
    setTextLoop('Downloading PDF...');
    // Get PDF content
    return DataSeerAPI.getPDF(doc.pdf, function (err, pdf) {
      setTextLoop('Downloading TEI...');
      // Get TEI content
      return DataSeerAPI.getTEI(doc.tei, function (err, tei) {
        setTextLoop('Downloading datatypes...');
        // Get datatypes
        return DataSeerAPI.jsonDataTypes(function (err, datatypes) {
          if (err) return alert('Error : Datatypes unavailable, dataseer-ml service does not respond');
          setTextLoop('PDF initialization...');
          if (!pdf.metadata || !pdf.metadata.pages) {
            if (user.isCurator) {
              setTextLoop('Updating PDF metadata...');
              return DataSeerAPI.extractPDFMetadata(doc._id, function (err, res) {
                $('.loader').hide();
                console.log(err, res);
                if (res.data.res && res.data.res.pages) {
                  setTextLoop(
                    `This document has been updated.<br/>If the document is still not "usable" after this update, please re-upload this document.<br/><a href="${res.url}" target="_blank">PDF link of this document</a><br/>You must reload this page to work on this document.`
                  );
                } else setTextLoop(`This document cannot be updated, please re-upload it. (<a href ="${res.url}" target="_blank">PDF link of this document</a>)`);
              });
            } else setTextLoop('This document must be updated by a curator');
          }
          const currentDocument = new DocumentHandler(
            {
              ids: { document: doc._id, datasets: doc.datasets._id },
              user: user,
              datatypes: datatypes,
              datasets: doc.datasets,
              metadata: doc.metadata,
              tei: tei.data,
              pdf: { buffer: pdf.data.data, metadata: pdf.metadata }
            },
            {
              onReady: function () {
                console.log('ready');
                hideLoop();
              }
            }
          );

          currentDocument.link({ documentView: documentView, datasetsList: datasetsList, datasetForm: datasetForm });

          // On datasets_validation click
          $('#datasets_validation').click(function () {
            if (currentDocument.hasChanges())
              return alert('You must save your changes before process datasets validation');
            return DataSeerAPI.validateDatasets(documentId, function (err, res) {
              console.log(err, res);
              if (err || res.err) {
                currentDocument.throwDatasetsNotValidError();
              } else return (window.location.href = window.location.href.replace(/(\/?datasets\/?)$/, ''));
            });
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
