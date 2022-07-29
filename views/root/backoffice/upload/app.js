/*
 * @prettier
 */

'use strict';

(function ($, _, async) {
  return ACCOUNTS.getCurrentUser(function (err, currentUser) {
    let app = new Vue({
      el: `#app`,
      data: {
        user: currentUser,
        notifications: [],
        accounts: [],
        organizations: [],
        owner: currentUser._id.toString(),
        organization: ``,
        visible: true,
        locked: false,
        dataseerML: true,
        removeResponseToViewerSection: true
      },
      methods: {
        organizationChanged: function (organization) {
          if (organization._id === UPLOAD_CONF.AmNat.organization.id) {
            this.removeResponseToViewerSection = organization.selected;
          }
        },
        // Change selected state of all item
        changeSelectedStateOf: function (collections, value) {
          collections.map(function (item) {
            item.selected = value;
            return item;
          });
        },
        uploadFiles: function (event) {
          const self = this;
          // Get the button
          let button = $(this.$refs.upload);
          // Get the loader of the button
          let loader = $(this.$refs.uploadLoader);
          let fd = new FormData();
          fd.append(`file`, self.$refs.file.files[0]);
          for (let i = 0; i < self.$refs.attachedFiles.files.length; i++) {
            fd.append(`attachedFiles`, self.$refs.attachedFiles.files[i]);
          }
          fd.append(`owner`, this.owner);
          fd.append(
            `organizations`,
            this.organizations
              .filter(function (item) {
                return item.selected;
              })
              .map(function (item) {
                return item._id;
              })
          );
          fd.append(`visible`, this.visible);
          fd.append(`locked`, this.locked);
          fd.append(`dataseerML`, this.dataseerML);
          fd.append(`removeResponseToViewerSection`, this.removeResponseToViewerSection);
          let opts = {
            data: fd
          };
          loader.show();
          button.prop(`disabled`, true);
          return API.upload(`documents`, opts, function (err, query) {
            loader.hide();
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
              console.log(err);
              return self.notifications.push(
                NOTIFICATIONS.create(self.notifiactions, {
                  kind: NOTIFICATIONS.kinds.error,
                  message: query.res,
                  autoclose: false
                })
              );
            }
            let url = URLMANAGER.buildURL(`/documents/${query.res._id.toString()}`);
            self.notifications.push(
              NOTIFICATIONS.create(self.notifications, {
                kind: NOTIFICATIONS.kinds.success,
                message: `<a href="${url}" target="_blank">${query.res.name}</a> has been uploaded!`,
                autoclose: false
              })
            );
          });
        },
        selectOrganizations: function () {
          let self = this;
          let filter = this.accounts.filter(function (item) {
            return item._id.toString() === self.owner.toString();
          });
          let account = filter.length === 1 ? filter[0] : undefined;
          if (account) {
            let organizations = account.organizations.map(function (item) {
              return item._id.toString();
            });
            this.organizations.map(function (item) {
              item.selected = organizations.indexOf(item._id.toString()) > -1;
              self.organizationChanged(item);
            });
          }
        }
      }
    });

    return API.all(`accounts`, {}, function (err, query) {
      // Case API did not respond
      if (err) {
        console.log(err);
        // Push an error notification
        return app.notifications.push(
          NOTIFICATIONS.create(app.notifications, {
            kind: NOTIFICATIONS.kinds.error,
            message: `[${err.statusText}] ${err.responseText} (HTTP ${err.status})`,
            autoclose: false
          })
        );
      }
      // Case API did respond
      if (query.err) {
        console.log(err);
        return app.notifications.push(
          NOTIFICATIONS.create(app.notifiactions, {
            kind: NOTIFICATIONS.kinds.error,
            message: query.res,
            autoclose: false
          })
        );
      }
      query.res.sort(DATAHANDLER.array.sortAccounts).map(function (account) {
        app.accounts.push(account);
      });
      return API.all(`organizations`, {}, function (err, query) {
        // Case API did not respond
        if (err) {
          console.log(err);
          // Push an error notification
          return app.notifications.push(
            NOTIFICATIONS.create(app.notifications, {
              kind: NOTIFICATIONS.kinds.error,
              message: `[${err.statusText}] ${err.responseText} (HTTP ${err.status})`,
              autoclose: false
            })
          );
        }
        // Case API did respond
        if (query.err) {
          console.log(err);
          return app.notifications.push(
            NOTIFICATIONS.create(app.notifiactions, {
              kind: NOTIFICATIONS.kinds.error,
              message: query.res,
              autoclose: false
            })
          );
        }
        query.res.sort(DATAHANDLER.array.sortOrganizations).map(function (organization) {
          let org = Object.assign(
            {
              selected:
                currentUser.organizations
                  .map(function (item) {
                    return item._id.toString();
                  })
                  .indexOf(organization._id) > -1
            },
            organization
          );
          app.organizations.push(org);
          app.organizationChanged(org);
        });
      });
    });
  });
})(jQuery, _, async);
