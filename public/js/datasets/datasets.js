/*
 * @prettier
 */

'use strict';

(function ($) {
  // Get current document Id

  const PDF_METADATA_VERSION = 3;
  const XML_METADATA_VERSION = 3;
  const documentId = $(document.getElementById(`document.id`)).attr(`value`),
    save = function () {},
    user = {
      id: $(`#user_id`).attr(`value`),
      username: $(`#user_username`).attr(`value`),
      isCurator: $(`#user_role`).attr(`value`) === `administrator`,
      isAnnotator: $(`#user_role`).attr(`value`) === `moderator`,
      role: $(`#user_role`).attr(`value`)
    },
    showLoop = function () {
      $(`#loading-loop .infos`).show();
    },
    setTextLoop = function (text) {
      $(`#loading-loop .infos .sub`).html(text);
    },
    setHeaderLoop = function (text) {
      $(`#loading-loop .infos .top`).text(text);
    },
    hideLoop = function () {
      $(`#loading-loop`).hide();
    },
    hideLoader = function () {
      $(`#loading-loop .loader`).hide();
    };

  // window.addEventListener('unhandledrejection', function (event) {
  //   alert(`An error has occured while processing this document... (${documentId})`);
  //   hideLoop();
  // });

  if (!user.isCurator && !user.isAnnotator) $(`#datasetsList\\.container\\.bulkActions\\.importDatasets`).hide();

  showLoop();
  setHeaderLoop(`Initializing DataSeer UI`);
  const documentView = new DocumentView(`documentView`),
    datasetsList = new DatasetsList(`datasetsList`),
    datasetForm = new DatasetForm(`datasetForm`);

  setTextLoop(`Downloading datasets...`);
  // Get data of current document with datasets informations
  return API.get(`documents`, { id: documentId, params: { datasets: true, metadata: true } }, function (err, query) {
    if (err || query.err) {
      setHeaderLoop(`Document unavailable`);
      setTextLoop(`Please contact a curator`);
      hideLoader();
      return alert(`Error : Document unavailable`);
    }
    let doc = query.res;
    setTextLoop(`Downloading PDF...`);
    // Get PDF file
    return API.documents.getPDF({ id: documentId }, function (err, pdf) {
      console.log(err, pdf);
      if (err || pdf.err) alert(`Error : PDF unavailable`);
      setTextLoop(`Downloading TEI...`);
      // Get TEI file
      return API.documents.getTEI({ id: documentId }, function (err, tei) {
        console.log(err, tei);
        if (err || tei.err) {
          setHeaderLoop(`TEI unavailable`);
          setTextLoop(`Please contact a curator`);
          hideLoader();
          return alert(`Error : TEI unavailable`);
        }
        setTextLoop(`Downloading TEI content...`);
        return API.documents.getTEIContent({ id: documentId }, function (err, xml) {
          if (err) {
            setHeaderLoop(`TEI content unavailable`);
            setTextLoop(`Please contact a curator`);
            hideLoader();
            return alert(`Error : TEI content unavailable`);
          }
          setTextLoop(`Downloading datatypes...`);
          // Get datatypes
          return API.dataseerML.jsonDataTypes(function (err, datatypes) {
            if (err) return alert(`Error : Datatypes unavailable`);
            let pdfUrl = URLMANAGER.buildURL(
              `api/documents/${documentId}/pdf/content`,
              { token: doc.token },
              { setToken: true }
            );
            if (doc.locked) alert(`This document is locked, You can't modify it`);
            const currentDocument = new DocumentHandler(
              {
                ids: { document: doc._id, datasets: doc.datasets._id },
                user: user,
                datatypes: datatypes,
                datasets: doc.datasets,
                metadata: doc.metadata,
                tei: { data: new XMLSerializer().serializeToString(xml), metadata: tei.res.metadata },
                pdf:
                  pdf && pdf.res
                    ? {
                      url: pdfUrl,
                      metadata: pdf.res.metadata
                    }
                    : undefined
              },
              {
                onReady: function () {
                  console.log(`ready`);
                  hideLoop();
                }
              }
            );
            let publicUrl = URLMANAGER.buildURL(`documents/${documentId}`, { token: doc.token }, { origin: true });
            let sciscoreArchiveUrl = URLMANAGER.buildURL(`api/sciscore/results/${documentId}`, { origin: true });
            let publicUrlBtn = $(
              `<button class="btn btn-primary btn-md" id="publicUrl" onclick="copyUrl('${publicUrl}')">Public URL</button>`
            );
            let pdfUrlBtn = $(`<a class="btn btn-primary btn-md" id="pdfUrl" href="${pdfUrl}" target="_blank">PDF</a>`);
            let sciscoreArchiveBtn = $(
              `<a class="btn btn-primary btn-md" id="sciscoreArchiveUrl" href="${sciscoreArchiveUrl}" target="_blank">Sciscore</a>`
            );
            $(`nav`).append(publicUrlBtn).append(pdfUrlBtn);
            if (user.isCurator) $(`nav`).append(sciscoreArchiveBtn);

            currentDocument.link({
              documentView: documentView,
              datasetsList: datasetsList,
              datasetForm: datasetForm
            });

            // On datasets_validation click
            $(`#datasets_validation`).click(function () {
              if (currentDocument.hasChanges())
                return alert(`You must save your changes before process datasets validation`);
              return API.documents.validateDatasets({ id: documentId }, function (err, res) {
                console.log(err, res);
                if (err || res.err) return alert(`Process has failed`);
                if (res.res) return (window.location.href = window.location.href.replace(/(\/?datasets\/?)$/, ``));
                return currentDocument.throwDatasetsNotValidError();
              });
            });

            // On back_to_metadata click
            $(`#back_to_metadata`).click(function () {
              return API.documents.backToMetadata({ id: documentId }, function (err, res) {
                console.log(err, res);
                if (err || res.err) return alert(`Process has failed`);
                else return (window.location.href = window.location.href.replace(/(\/?datasets\/?)$/, ``));
              });
            });

            window.onbeforeunload = function () {
              if (currentDocument.hasChanges())
                return confirm(`Are you sure you want to navigate away from this page? Changes will not be saved !`);
            };
          });
        });
      });
    });
  });
})(jQuery);

const copyUrl = function (url) {
  return CLIPBOARD.copy(url, function (err) {
    if (err) return alert(`An error has occured...`);
    return alert(`Public URL copied !`);
  });
};
