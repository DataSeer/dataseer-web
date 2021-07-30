/*
 * @prettier
 */

'use strict';

(function ($, _, async) {
  // Routes used in this view
  const ROUTES = {
    main: `accounts`,
    dependencies: {
      organizations: `organizations`,
      roles: `roles`
    }
  };
  let app = new Vue({
    el: `#app`,
    data: {
      user: {}, // Will be initialized with API
      notifications: [],
      item: {
        schema: {
          _id: {},
          username: {},
          fullname: {},
          role: { dependency: `roles`, typeof: `object`, key: `_id` },
          organizations: { dependency: `organizations`, typeof: `object`, key: `_id` },
          tokens: {},
          visible: {},
          disabled: {}
        },
        dependencies: {
          roles: [], // Will be initialized with API (raw data from API)
          organizations: [] // Will be initialized with API (raw data from API)
        },
        properties: {
          _id: ``,
          username: ``,
          fullname: ``,
          role: {},
          organizations: [],
          tokens: {},
          visible: true,
          disabled: true
        }
      }
    },
    methods: {
      // Update an item of app.collections.items
      updateItem: function (event) {
        const self = this;
        // Get the button Jquery element
        let button = $(this.$refs.save);
        // Get the row element of the item
        let row = button.parent().parent();
        // Get the loader of the button
        let loader = $(this.$refs.saveLoader);
        // Get the item id
        let id = event.currentTarget.value;
        // Build the opts data that will be sent to the API
        let opts = {
          data: this.getItemParams() // Get item params
        };
        // Display the loader
        loader.show();
        // Disable the button
        button.prop(`disabled`, true);
        // Call update API route
        return API.update(ROUTES.main, opts, function (err, query) {
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
          if (query.err)
            // Push an error notification
            return self.notifications.push(
              NOTIFICATIONS.create(self.notifications, {
                kind: NOTIFICATIONS.kinds.error,
                message: query.res,
                autoclose: false
              })
            );
          // Case this is a success
          // Refresh item with data coming from API
          self.refreshItem(query.res);
          let url = URLMANAGER.buildURL(`/backoffice/${ROUTES.main}/${query.res._id.toString()}`);
          // Push a success notification
          return self.notifications.push(
            NOTIFICATIONS.create(self.notifications, {
              kind: NOTIFICATIONS.kinds.success,
              message: `<a href="${url}" target="_blank">${query.res.username}</a> has been updated!`,
              autoclose: true
            })
          );
        });
      },
      // Delete an item of app.collections.items
      deleteItem: function (event) {
        const self = this;
        // Get the button Jquery element
        let button = $(event.currentTarget);
        // Get the row element of the item
        let row = button.parent().parent();
        // Get the loader of the button
        let loader = row.find(`.loader-sm[value="delete"]`);
        // Get the item id
        let id = row.attr(`value`);
        // Get the item (reference to the app.collections.items item variable)
        // Build the opts data that will be sent to the API
        let opts = {
          data: {
            _id: this.item.properties._id.toString()
          }
        };
        // Display the loader
        loader.show();
        return API.delete(ROUTES.main, opts, function (err, query) {
          // Hide the loader
          loader.hide();
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
          // Case there is an error
          if (query.err) {
            // Push an error notification
            return self.notifications.push(
              NOTIFICATIONS.create(self.notifications, {
                kind: NOTIFICATIONS.kinds.error,
                message: query.res,
                autoclose: false
              })
            );
          }
          /* TO DO : Handle case data is deleted in the mongoDB (for now it's just "disabled" & "anonymised")) */
          // Case there is a success
          // Refresh item with data coming from API
          self.refreshItem(query.res);
          let url = URLMANAGER.buildURL(`/backoffice/${ROUTES.main}/${query.res._id.toString()}`);
          // Push a success notification
          return self.notifications.push(
            NOTIFICATIONS.create(self.notifications, {
              kind: NOTIFICATIONS.kinds.success,
              message: `<a href="${url}" target="_blank">${query.res.username}</a> has been deleted!`,
              autoclose: true
            })
          );
        });
      },
      copyToken: function (token) {
        let self = this;
        return CLIPBOARD.copy(token, function (err) {
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
      // Change selected state of all item
      changeSelectedStateOf: function (collections, value) {
        collections.map(function (item) {
          item.selected = value;
          return item;
        });
      },
      getItemParams: function () {
        let self = this;
        let result = {};
        // Build data properties
        for (let property in this.item.schema) {
          // If it's an array so filter & map it
          if (Array.isArray(this.item.properties[property]))
            result[property] = this.item.properties[property]
              .filter(function (item) {
                return item.selected;
              })
              .map(function (item) {
                return _.get(item, self.item.schema[property].key);
              });
          else if (
            typeof this.item.properties[property] === `object` &&
            typeof this.item.schema[property].key !== `undefined`
          )
            result[property] = _.get(this.item.properties[property], this.item.schema[property].key);
          else result[property] = this.item.properties[property];
        }
        return result;
      },
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
            },
            // Get all organizations
            function (next) {
              return API.all(ROUTES.dependencies.organizations, {}, function (err, query) {
                if (err) return next(err);
                if (query.err) return next(query);
                self.item.dependencies.organizations = [];
                query.res.sort(DATAHANDLER.array.sortOrganizations).map(function (item) {
                  // Set organizations dependencies
                  self.item.dependencies.organizations.push(Object.assign({}, item));
                });
                return next();
              });
            },
            // Get all roles
            function (next) {
              return API.all(ROUTES.dependencies.roles, {}, function (err, query) {
                if (err) return next(err);
                if (query.err) return next(query);
                self.item.dependencies.roles = [];
                query.res.sort(DATAHANDLER.array.sortRoles).map(function (item) {
                  // Set roles dependencies
                  self.item.dependencies.roles.push(Object.assign({}, item));
                });
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
            return API.get(ROUTES.main, { id: id }, function (err, query) {
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
  return app.refresh(function (err, query) {
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
})(jQuery, _, async);
