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
                self.publicUrl = URLMANAGER.buildURL(`documents/${self.document._id.toString()}`, {
                  token: self.document.token
                });
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
                  console.log(iframe);
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
