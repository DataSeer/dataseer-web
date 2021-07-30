/*
 * @prettier
 */

'use strict';

(function ($, _, async) {
  // Routes used in this view
  const ROUTES = {
    main: `documents`,
    dependencies: {
      roles: `roles`,
      accounts: `accounts`,
      organizations: `organizations`
    }
  };
  let app = new Vue({
    el: `#app`,
    data: {
      user: {}, // Will be initialized with API
      notifications: [],
      filter: {
        value: ``,
        caseSensitive: false,
        strict: false
      },
      loading: false,
      collection: {
        schema: {
          _id: {},
          name: {},
          owner: {},
          organizations: {},
          token: {},
          upload: {},
          visible: {},
          protected: {},
          locked: {},
          logs: {}
        },
        items: [], // Will be initialized with API
        logs: [],
        selectedItemsCount: 0,
        dependencies: {}
      }
    },
    computed: {
      // Filtered items
      filteredItems: function () {
        let self = this;
        let filters = this.filter.value.trim();
        if (!this.filter.caseSensitive) filters = filters.toLowerCase();
        filters = filters.split(` `);
        let filteredItems = this.collection.items.filter(function (item) {
          return filters.reduce(function (acc, filter) {
            let raw = self.filter.caseSensitive ? item.raw : item.raw.toLowerCase();
            if (self.filter.strict) acc = acc && raw.indexOf(filter) !== -1;
            else acc = acc || raw.indexOf(filter) !== -1;
            return acc;
          }, !!self.filter.strict);
        });
        return filteredItems;
      }
    },
    methods: {
      showLogs: function (id) {
        const self = this;
        // Get logs from an document ID
        return API.getLogs(ROUTES.main, { id: id }, function (err, res) {
          if (err)
            // Push an error notification
            return self.notifications.push(
              NOTIFICATIONS.create(self.notifications, {
                kind: NOTIFICATIONS.kinds.error,
                message: `${err.toString()}`,
                autoclose: false
              })
            );
          // Map all log and reformat them and push them to collection.logs
          res.res.map(function (item) {
            // Reformat date
            item.dates.map(function (item) {
              return `${new Date(item).toLocaleDateString()} ${new Date(item).toLocaleTimeString()}`;
            });
            self.collection.logs.push({
              key: item.key !== `` ? `${item.kind.key} ${item.key}` : item.kind.key,
              dates: item.dates.map(function (item) {
                return `${new Date(item).toLocaleDateString()} ${new Date(item).toLocaleTimeString()}`;
              }),
              target: item.target,
              account: item.account
            });
          });
        });
      },
      hideLogs: function (event) {
        // Just clear the logs array
        this.collection.logs = [];
      },
      copyURL: function (event) {
        let self = this;
        let ids = this.filteredItems.map(function (item) {
          return item.properties._id.toString();
        });
        let url = URLMANAGER.buildURL(`${ROUTES.main}`, { ids: ids });
        return CLIPBOARD.copy(url, function (err) {
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
              message: `<a href="${url}">URL copied!</a> Use it to share your result(s)`,
              autoclose: false
            })
          );
        });
      },
      sort: function (event) {
        let el = $(event.currentTarget);
        let property = el.attr(`property`);
        let ascending = function (a, b) {
          let propertyA = _.get(a.properties, property);
          let propertyB = _.get(b.properties, property);
          return propertyA > propertyB ? 1 : propertyB > propertyA ? -1 : 0;
        };
        let descending = function (a, b) {
          let propertyA = _.get(a.properties, property);
          let propertyB = _.get(b.properties, property);
          return propertyA > propertyB ? -1 : propertyB > propertyA ? 1 : 0;
        };
        // if class sorting -> first sort
        if (el.hasClass(`sorting`)) {
          this.collection.items.sort(ascending);
          el.removeClass(`sorting`);
          el.addClass(`ascending`);
        } else {
          if (el.hasClass(`descending`)) {
            this.collection.items.sort(ascending);
            el.removeClass(`descending`);
            el.addClass(`ascending`);
          } else if (el.hasClass(`ascending`)) {
            this.collection.items.sort(descending);
            el.removeClass(`ascending`);
            el.addClass(`descending`);
          }
        }
      },
      // Build link to a single resource
      buildIdLink: function (id, params = {}) {
        return URLMANAGER.buildURL(`${ROUTES.main}/${id}/`, params);
      },
      // Build link to a single resource
      buildBackofficeIdLink: function (id, params = {}) {
        return URLMANAGER.buildURL(`backoffice/${ROUTES.main}/${id}/`, params);
      },
      // Refresh all items of app.collection.items
      refreshCollection: function (collection = []) {
        const self = this;
        this.collection.items = collection.map(function (item) {
          return self.createItem(item);
        });
      },
      // Create an item (use it to populate the app.collection.items property)
      createItem: function (data = {}) {
        let result = {
          status: { modified: false, error: false },
          selected: false,
          properties: {},
          raw: DATAHANDLER.object.getRaw(Object.assign({}, data, { files: null, pdf: null, tei: null, datasets: null }))
        };
        for (let property in data) {
          // case property is a list linked to a dependency
          let dependency = _.get(this.collection.schema, `${property}.dependency`);
          if (typeof dependency !== `undefined`) {
            if (Array.isArray(data[property])) {
              // Case this is an Array
              // Build the list ids (values that must be selected in the list)
              let ids = data[property].map(function (item) {
                if (typeof item._id !== `undefined`) return item._id; // Case the data come from mongoDB (Array of objects with ids)
                if (typeof item !== `object` && typeof item !== `function`) return item; // Case the data come from the URL (Array of ids)
              });
              // Build all available values (selected state will be defined depending on the ids list)
              result.properties[property] = this.collection.dependencies[
                this.collection.schema[property].dependency
              ].map(function (item) {
                return Object.assign({ selected: ids.indexOf(item._id) > -1 }, item);
              });
            } else {
              // Case this is a data "linked" to a dependency
              // Case data is already well formated (come from mongoDB)
              if (typeof data[property] === this.collection.schema[property].typeof)
                result.properties[property] = data[property];
              else {
                // Case data is not well formated (need to be extracted from dependencies)
                let filter = this.collection.dependencies[this.collection.schema[property].dependency].filter(function (
                  item
                ) {
                  if (item._id === data[property]) return Object.assign({}, item);
                });
                if (filter.length === 1) result.properties[property] = Object.assign({}, filter[0]);
              }
            }
          } else {
            if (property === `upload`)
              result.properties[property] = {
                date: new Date(data[property].date).toDateString(),
                account: data[property].account,
                organizations: data[property].organizations
              };
            else result.properties[property] = data[property];
          }
        }
        return result;
      },
      // Refresh the app
      refresh: function (cb) {
        let self = this;
        this.loading = true;
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
            // Get all documents
            return API.all(
              ROUTES.main,
              {
                params: {
                  owners: [self.user._id.toString()],
                  organizations: [
                    self.user.organizations.map(function (item) {
                      return item._id.toString();
                    })
                  ],
                  metadata: true,
                  datasets: true
                }
              },
              function (err, query) {
                self.loading = false;
                if (err) return cb(err);
                if (query.err) return cb(query);
                // Refresh search properties
                self.refreshCollection(query.res);
                return cb(err);
              }
            );
          }
        );
      }
    }
  });
  // Refresh the app
  return app.refresh(function (err) {
    if (err) {
      app.notifications.push(
        NOTIFICATIONS.create(app.notifications, {
          kind: NOTIFICATIONS.kinds.error,
          message: `[${err.statusText}] ${err.responseText} (HTTP ${err.status})`,
          autoclose: false
        })
      );
      return console.log(err);
    }
  });
})(jQuery, _, async);
