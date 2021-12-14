/*
 * @prettier
 */

'use strict';

(function ($, _, async) {
  let documentId = URLMANAGER.extractIdsFromCurrentURL().documents;
  let app = new Vue({
    el: `#app`,
    data: {
      user: {},
      notifications: [],
      documentId: documentId,
      document: {},
      docxDefaultReportLink: ``,
      htmlDefaultReportLink: ``,
      htmlBioRxivReportLink: ``,
      asapGraphicLink: ``,
      gSpreadSheetReportLinks: {
        ASAP: ``,
        AmNat: ``
      },
      publicUrl: ``,
      loading: true
    },
    methods: {
      resizeReport: function () {
        let iframe = $(this.$refs.report);
        let doc = iframe.get(0).contentWindow.document;
        iframe.height(doc.documentElement.scrollHeight);
      },
      reopen: function (event) {
        const self = this;
        return API.documents.reopen({ id: documentId }, function (err, res) {
          if (err || res.err)
            return self.notifications.push(
              NOTIFICATIONS.create(self.notifications, {
                kind: NOTIFICATIONS.kinds.error,
                message: `[${err.statusText}] ${err.responseText} (HTTP ${err.status})`,
                autoclose: false
              })
            );
          else return (window.location.href = window.location.href.replace(/(\/?finish\/?)$/, ``));
        });
      },
      updateOrCreateAnnotation: function (event) {
        let self = this;
        let input = $(this.$refs.annotationUrl);
        // Get the button Jquery element
        let button = $(this.$refs.updateOrCreateAnnotation);
        // Get the loader of the button
        let loader = $(this.$refs.updateOrCreateAnnotationLoader);
        // Display the loader
        loader.show();
        // Disable the button
        button.prop(`disabled`, true);
        let url = input.val();
        if (!url || url.length <= 0) {
          // Hide the loader
          loader.hide();
          // Enable the button
          button.prop(`disabled`, false);
          return alert(`Plese provide a valid URL`);
        }
        let opts = {
          data: {
            id: documentId,
            url: url
          }
        };
        return API.updateOrCreateAnnotation(opts, function (err, query) {
          // Hide the loader
          loader.hide();
          // Enable the button
          button.prop(`disabled`, false);
          // Case API did not respond
          if (err) {
            console.log(err);
            // Push an error notification
            return self.notifications.push(
              NOTIFICATIONS.create(self.notifications, {
                kind: NOTIFICATIONS.kinds.error,
                message: `[${err.statusText}] ${err.responseText} (HTTP ${err.status})`,
                autoclose: false
              })
            );
          }
          // Case API did respond
          if (query.err) {
            // Case there is an error
            // Push an error notification
            return self.notifications.push(
              NOTIFICATIONS.create(self.notifications, {
                kind: NOTIFICATIONS.kinds.error,
                message: query.res,
                autoclose: false
              })
            );
          }
          self.document.urls.hypothesis = url;
          return self.notifications.push(
            NOTIFICATIONS.create(self.notifications, {
              kind: NOTIFICATIONS.kinds.success,
              message: `<a href="${url}" target="_blank">Hypothes.is annotation</a> has been updated!`,
              autoclose: true
            })
          );
        });
      },
      buildGSpreadSheetReport: function (event, kind) {
        let self = this;
        // Get the button Jquery element
        let button = $(this.$refs[`buildGSpreadSheet${kind}Report`]);
        // Get the loader of the button
        let loader = $(this.$refs[`buildGSpreadSheet${kind}ReportLoader`]);
        // Display the loader
        loader.show();
        // Disable the button
        button.prop(`disabled`, true);
        let opts = {
          kind: kind,
          id: documentId
        };
        return API.documents.buildGSpreadSheetReport(opts, function (err, query) {
          // Hide the loader
          loader.hide();
          // Enable the button
          button.prop(`disabled`, false);
          // Case API did not respond
          if (err) {
            console.log(err);
            // Push an error notification
            return self.notifications.push(
              NOTIFICATIONS.create(self.notifications, {
                kind: NOTIFICATIONS.kinds.error,
                message: `[${err.statusText}] ${err.responseText} (HTTP ${err.status})`,
                autoclose: false
              })
            );
          }
          // Case API did respond
          if (query.err) {
            // Case there is an error
            // Push an error notification
            return self.notifications.push(
              NOTIFICATIONS.create(self.notifications, {
                kind: NOTIFICATIONS.kinds.error,
                message: query.res,
                autoclose: false
              })
            );
          }
          return self.notifications.push(
            NOTIFICATIONS.create(self.notifications, {
              kind: NOTIFICATIONS.kinds.success,
              message: `<a href="${self.gSpreadSheetReportLinks[kind]}" target="_blank">Report</a> has been generated!`,
              autoclose: true
            })
          );
        });
      },
      buildPublicUrl: function (event) {
        const self = this;
        let opts = {
          id: documentId
        };
        return CLIPBOARD.copy(this.publicUrl, function (err) {
          if (err)
            // Push an error notification
            return self.notifications.push(
              NOTIFICATIONS.create(self.notifications, {
                kind: NOTIFICATIONS.kinds.error,
                message: `${err.toString()}`,
                autoclose: false
              })
            );
          return self.notifications.push(
            // Push a success notification
            NOTIFICATIONS.create(self.notifications, {
              kind: NOTIFICATIONS.kinds.success,
              message: `Url copied!`,
              autoclose: false
            })
          );
        });
      },
      refresh: function (cb) {
        const self = this;
        this.loading = true;
        return async.map(
          [
            // Get the current user
            function (next) {
              // Get current user
              return ACCOUNTS.getCurrentUser(function (err, currentUser) {
                if (err) return next(err);
                self.user = currentUser;
                return next();
              });
            },
            function (next) {
              // Get document
              return API.get(`documents`, { id: self.documentId }, function (err, query) {
                if (err) {
                  self.notifications.push(
                    NOTIFICATIONS.create(self.notifications, {
                      kind: NOTIFICATIONS.kinds.error,
                      message: `${err.toString()}`,
                      autoclose: false
                    })
                  );
                  return next();
                }
                if (query.err) {
                  self.notifications.push(
                    NOTIFICATIONS.create(self.notifications, {
                      kind: NOTIFICATIONS.kinds.error,
                      message: `[${err.statusText}] ${err.responseText} (HTTP ${err.status})`,
                      autoclose: false
                    })
                  );
                  return next();
                }
                self.document = query.res;
                self.docxDefaultReportLink = URLMANAGER.buildURL(
                  `api/documents/${self.document._id.toString()}/reports/docx/default`,
                  {}
                );
                self.htmlDefaultReportLink = URLMANAGER.buildURL(
                  `api/documents/${self.document._id.toString()}/reports/html/default`,
                  {}
                );
                self.htmlBioRxivReportLink = URLMANAGER.buildURL(
                  `api/documents/${self.document._id.toString()}/reports/html/bioRxiv`,
                  {}
                );
                self.asapGraphicLink = URLMANAGER.buildURL(
                  `api/documents/${self.document._id.toString()}/charts/asap`,
                  {}
                );
                self.gSpreadSheetReportLinks.ASAP = URLMANAGER.buildURL(
                  `documents/${self.document._id.toString()}/reports/gSpreadsheets/ASAP`,
                  {
                    token: self.document.token
                  },
                  { origin: true }
                );
                self.gSpreadSheetReportLinks.AmNat = URLMANAGER.buildURL(
                  `documents/${self.document._id.toString()}/reports/gSpreadsheets/AmNat`,
                  {
                    token: self.document.token
                  },
                  { origin: true }
                );
                self.publicUrl = URLMANAGER.buildURL(
                  `documents/${self.document._id.toString()}`,
                  {
                    token: self.document.token
                  },
                  { origin: true }
                );
                return next();
              });
            },
            // Get report
            function (next) {
              return API.documents.getReport(
                { id: self.documentId, kind: `html`, organization: `default` },
                function (err, query) {
                  if (err) {
                    self.notifications.push(
                      NOTIFICATIONS.create(self.notifications, {
                        kind: NOTIFICATIONS.kinds.error,
                        message: `${err.toString()}`,
                        autoclose: false
                      })
                    );
                    return next();
                  }
                  let iframe = $(self.$refs.report);
                  let doc = iframe.get(0).contentWindow.document;
                  doc.open();
                  doc.write(query);
                  doc.close();
                  return next();
                }
              );
            }
          ],
          function (action, next) {
            return action(next);
          },
          function (err) {
            self.loading = false;
            return cb();
          }
        );
      }
    }
  });
  app.refresh(function () {});
})(jQuery, _, async);
