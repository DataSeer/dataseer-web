/*
 * @prettier
 */

'use strict';

(function ($, _, async) {
  // Routes used in this view
  const ROUTES = {
    main: `documents`,
    dependencies: {}
  };
  let app = new Vue({
    el: `#app`,
    data: {
      user: {}, // Will be initialized with API
      notifications: [],
      item: {
        schema: {
          _id: {},
          name: {},
          metadata: {},
          owner: {},
          organizations: {},
          token: {},
          visible: {},
          locked: {}
        },
        dependencies: {},
        properties: {
          _id: ``,
          name: ``,
          metadata: {},
          role: {},
          owner: {},
          organizations: [],
          tokens: {},
          visible: undefined,
          locked: undefined
        }
      }
    },
    methods: {
      // Refresh an item of app.collection.items
      refreshItem: function (data) {
        const self = this;
        let newItem = this.createItem(data);
        newItem.selected = this.item.selected;
        this.item.properties = newItem;
      },
      // Create an item (use it to populate the app.collection.items property)
      createItem: function (data = {}) {
        let result = { selected: false, status: { modified: false, error: false } };
        for (let property in data) {
          // case property is a list linked to a dependency
          let dependency = _.get(this.item.schema, `${property}.dependency`);
          if (typeof dependency !== `undefined`) {
            if (Array.isArray(data[property])) {
              // Case this is an Array
              // Build the list ids (values that must be selected in the list)
              let ids = data[property].map(function (item) {
                if (typeof item._id !== `undefined`) return item._id; // Case the data come from mongoDB (Array of objects with ids)
                if (typeof item !== `object` && typeof item !== `function`) return item; // Case the data come from the URL (Array of ids)
              });
              // Build all available values (selected state will be defined depending on the ids list)
              result[property] = this.item.dependencies[this.item.schema[property].dependency].map(function (item) {
                return Object.assign({ selected: ids.indexOf(item._id) > -1 }, item);
              });
            } else {
              // Case this is a data "linked" to a dependency
              // Case data is already well formated (come from mongoDB)
              if (typeof data[property] === this.item.schema[property].typeof) result[property] = data[property];
              else {
                // Case data is not well formated (need to be extracted from dependencies)
                let filter = this.item.dependencies[this.item.schema[property].dependency].filter(function (item) {
                  if (item._id === data[property]) return Object.assign({}, item);
                });
                if (filter.length === 1) result[property] = Object.assign({}, filter[0]);
              }
            }
          } else result[property] = data[property];
        }
        return result;
      },
      // Reload metadata
      reloadMetadata: function () {
        let self = this;
        // Get the button Jquery element
        let button = $(this.$refs.reloadMetadata);
        // Get the loader of the button
        let loader = $(this.$refs.reloadMetadataLoader);
        // Display the loader
        loader.show();
        // Disable the button
        button.prop(`disabled`, true);
        return API.documents.reloadMetadata(
          { id: this.item.properties._id, data: self.item.properties.metadata },
          function (err, res) {
            // Hide the loader
            loader.hide();
            // Enable the button
            button.prop(`disabled`, false);
            if (err)
              // Push an error notification
              return self.notifications.push(
                NOTIFICATIONS.create(self.notifications, {
                  kind: NOTIFICATIONS.kinds.error,
                  message: `${err.toString()}`,
                  autoclose: false
                })
              );
            return refresh();
          }
        );
      },
      // Validate metadata
      validateMetadata: function () {
        let self = this;
        // Get the button Jquery element
        let button = $(this.$refs.validateMetadata);
        // Get the loader of the button
        let loader = $(this.$refs.validateMetadataLoader);
        // Display the loader
        loader.show();
        // Disable the button
        button.prop(`disabled`, true);
        return API.documents.validateMetadata({ id: this.item.properties._id }, function (err, res) {
          // Hide the loader
          loader.hide();
          // Enable the button
          button.prop(`disabled`, false);
          if (err)
            // Push an error notification
            return self.notifications.push(
              NOTIFICATIONS.create(self.notifications, {
                kind: NOTIFICATIONS.kinds.error,
                message: `${err.toString()}`,
                autoclose: false
              })
            );
          let currentParams = URLMANAGER.getParamsOfCurrentURL();
          let hasToken = typeof currentParams.token !== `undefined`;
          return (window.location = URLMANAGER.buildURL(
            `documents/${self.item.properties._id}`,
            {},
            { setToken: hasToken }
          ));
        });
      },
      // Build URL of document
      buildDocumentURL: function (params = {}) {
        return URLMANAGER.buildURL(`documents/${this.item.properties._id}`, params, { origin: true });
      },
      copy: function (text) {
        let self = this;
        return CLIPBOARD.copy(text, function (err) {
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
              message: `Token copied!`,
              autoclose: false
            })
          );
        });
      },
      // Refresh the app
      refresh: function (cb) {
        let self = this;
        return async.map(
          // list of all actions
          [
            // Get the current user
            function (next) {
              // Get current user
              return ACCOUNTS.getCurrentUser(function (err, currentUser) {
                if (err) return next(err);
                self.user = currentUser;
                return next();
              });
            }
          ],
          // Execute all actions
          function (action, next) {
            return action(next);
          },
          function (err) {
            let id = URLMANAGER.extractIdsFromCurrentURL()[ROUTES.main];
            // Get all Accounts
            return API.get(ROUTES.main, { id: id, params: { metadata: true } }, function (err, query) {
              if (err) return cb(err);
              if (query.err) return cb(err, query);
              // Refresh search properties
              self.refreshItem(query.res);
              return cb(err, query);
            });
          }
        );
      }
    }
  });

  // Refresh the app
  const refresh = function () {
    app.refresh(function (err, query) {
      if (err) {
        console.log(err);
        return app.notifications.push(
          NOTIFICATIONS.create(app.notifications, {
            kind: NOTIFICATIONS.kinds.error,
            message: `[${err.statusText}] ${err.responseText} (HTTP ${err.status})`,
            autoclose: false
          })
        );
      }
      if (query.err) {
        console.log(query);
        return app.notifications.push(
          NOTIFICATIONS.create(app.notifications, {
            kind: NOTIFICATIONS.kinds.error,
            message: query.res,
            autoclose: false
          })
        );
      }
    });
  };
  return refresh();
})(jQuery, _, async);
