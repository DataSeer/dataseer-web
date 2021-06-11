/*
 * @prettier
 */

'use strict';

(function ($) {
  // Get current document Id

  const PDF_METADATA_VERSION = 3;
  const XML_METADATA_VERSION = 3;
  const documentId = $(document.getElementById('document.id')).attr('value'),
    save = function () {},
    user = {
      id: $('#user_id').attr('value'),
      username: $('#user_username').attr('value'),
      isCurator: $('#user_role').attr('value') === 'curator',
      isAnnotator: $('#user_role').attr('value') === 'annotator',
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
    if (err) return alert('Error : Document unavailable');
    setTextLoop('Downloading PDF...');
    // Get PDF file
    return DataSeerAPI.getPDF(documentId, function (err, pdf) {
      console.log(err, pdf);
      if (err || pdf.err) alert('Error : PDF unavailable');
      setTextLoop('Downloading TEI...');
      // Get TEI file
      return DataSeerAPI.getTEI(documentId, function (err, tei) {
        console.log(err, tei);
        if (err || tei.err) return alert('Error : TEI unavailable');
        setTextLoop('Downloading TEI content...');
        return DataSeerAPI.getTEIContent(documentId, function (err, xmlString) {
          if (err) return alert('Error : TEI content unavailable');
          setTextLoop('Downloading datatypes...');
          // Get datatypes
          return DataSeerAPI.jsonDataTypes(function (err, datatypes) {
            if (err) return alert('Error : Datatypes unavailable');
            setTextLoop('PDF initialization...');
            return async.reduce(
              [
                // update TEI file
                function (acc, next) {
                  console.log(acc);
                  if (!tei.res.metadata || tei.res.metadata.version > XML_METADATA_VERSION)
                    return next(new Error('Bad version of TEI metadata'));
                  acc.needUpdate =
                    acc.needUpdate || !tei.res.metadata || tei.res.metadata.version < XML_METADATA_VERSION;
                  if (!acc.needUpdate) return next(null, acc);
                  return DataSeerAPI.updateTEI(doc._id, function (err, res) {
                    console.log(err, res);
                    if (err) return next(err, acc);
                    acc.tei = { updated: true, res: res };
                    return next(null, acc);
                  });
                },
                // update datasets
                function (acc, next) {
                  acc.needUpdate = acc.needUpdate || (acc.tei && acc.tei.updated);
                  if (!acc.needUpdate) return next(null, acc);
                  return DataSeerAPI.refreshDatasets(doc._id, function (err, res) {
                    console.log(err, res);
                    if (err) return next(err, acc);
                    acc.datasets = { updated: true, res: res };
                    return next(null, acc);
                  });
                },
                // update PDF file
                function (acc, next) {
                  if (!pdf.res) return next();
                  if (!pdf.res.metadata || pdf.res.metadata.version > PDF_METADATA_VERSION)
                    return next(new Error('Bad version of PDF metadata'));
                  acc.needUpdate =
                    acc.needUpdate || !pdf.res.metadata || pdf.res.metadata.version < PDF_METADATA_VERSION;
                  if (!acc.needUpdate) return next(null, acc);
                  return DataSeerAPI.updatePDF(doc._id, function (err, res) {
                    console.log(err, res);
                    if (err) return next(err, acc);
                    acc.pdf = { updated: true, res: res };
                    return next(null, acc);
                  });
                }
              ],
              { needUpdate: false },
              function (acc, action, next) {
                return action(acc, function (err) {
                  return next(err, acc);
                });
              },
              function (err, res) {
                console.log(err, res);
                let pdfURL = DataSeerAPI.buildURL(
                  DataSeerAPI.rootURL() + 'api/documents/' + documentId + '/pdf/content'
                );
                if (res.needUpdate) {
                  if (user.isCurator || user.isAnnotator) {
                    setTextLoop('Updating PDF metadata...');
                    $('.loader').hide();
                    if (!err) {
                      return setTextLoop(
                        `This document has been updated.<br/>If the document is still not "usable" after this update, please re-upload this document.<br/><a href="${pdfURL}" target="_blank">PDF link of this document</a><br/>You must reload this page to work on this document.`
                      );
                    } else
                      return setTextLoop(
                        `This document cannot be updated, please re-upload it. (<a href ="${pdfURL}" target="_blank">PDF link of this document</a>)`
                      );
                  } else return setTextLoop('This document must be updated by a curator or an annotator');
                }

                if (err)
                  return setTextLoop(
                    `This document cannot be updated, please re-upload it. (<a href ="${pdfURL}" target="_blank">PDF link of this document</a>)`
                  );
                const currentDocument = new DocumentHandler(
                  {
                    ids: { document: doc._id, datasets: doc.datasets._id },
                    user: user,
                    datatypes: datatypes,
                    datasets: doc.datasets,
                    metadata: doc.metadata,
                    tei: { data: xmlString, metadata: tei.res.metadata },
                    pdf: pdf.res
                      ? {
                          url: pdfURL,
                          metadata: pdf.res.metadata
                        }
                      : undefined
                  },
                  {
                    onReady: function () {
                      console.log('ready');
                      hideLoop();
                    }
                  }
                );

                currentDocument.link({
                  documentView: documentView,
                  datasetsList: datasetsList,
                  datasetForm: datasetForm
                });

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
                    return confirm(
                      'Are you sure you want to navigate away from this page? Changes will not be saved !'
                    );
                };
              }
            );
          });
        });
      });
    });
  });
})(jQuery);
