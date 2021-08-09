/*
 * @prettier
 */

'use strict';

(function ($, _, async) {
  // Routes used in this view
  const ROUTES = {
    main: `roles`,
    dependencies: {
      roles: `roles`
    }
  };
  let app = new Vue({
    el: `#app`,
    data: {
      user: {}, // Will be initialized with API
      notifications: [],
      search: {
        schema: {
          limit: {},
          skip: {},
          ids: { typeof: `string`, optionnal: true }, // optionnal must be used to ignore this params when emtpy
          sort: {}
        },
        default: {
          limit: CONF.default.params.search.roles.limit,
          skip: CONF.default.params.search.roles.skip,
          sort: CONF.default.params.search.roles.sort
        },
        properties: {
          limit: undefined,
          skip: undefined,
          ids: [],
          sort: undefined
        }
      },
      filter: {
        value: ``,
        caseSensitive: false,
        strict: false
      },
      loading: false,
      collection: {
        schema: {
          _id: {},
          label: {},
          key: {},
          weight: {}
        },
        items: [], // Will be initialized with API
        selectedItemsCount: 0,
        dependencies: {
          roles: []
        }
      },
      newItem: {
        showed: false,
        schema: {
          label: {},
          key: {},
          weight: {}
        },
        default: {},
        properties: {
          label: ``,
          key: ``,
          weight: ``
        }
      },
      multipleSelections: {
        schema: {
          label: {},
          key: {},
          weight: {}
        },
        default: {},
        properties: {
          label: ``,
          key: ``,
          weight: ``
        }
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
    watch: {
      // Count selected items count (used to fade In/Out form)
      'collection.selectedItemsCount'() {
        let multipleSelectionsTitle = $(this.$refs.multipleSelectionsTitle);
        let multipleSelectionsRow = $(this.$refs.multipleSelectionsRow);
        let multipleSelectionsCheckbox = $(this.$refs.multipleSelectionsCheckbox);
        if (this.collection.selectedItemsCount === 0) {
          multipleSelectionsTitle.fadeOut();
          multipleSelectionsRow.fadeOut();
          multipleSelectionsCheckbox.prop(`checked`, false);
        } else {
          multipleSelectionsTitle.fadeIn();
          multipleSelectionsRow.fadeIn();
          multipleSelectionsCheckbox.prop(`checked`, true);
        }
      },
      // Count selected items count (used to fade In/Out form)
      'newItem.showed'() {
        let newItemTitle = $(this.$refs.newItemTitle);
        let newItemRow = $(this.$refs.newItemRow);
        if (!this.newItem.showed) {
          newItemTitle.fadeOut();
          newItemRow.fadeOut();
        } else {
          newItemTitle.fadeIn();
          newItemRow.fadeIn();
        }
      }
    },
    methods: {
      // Update an item of app.collections.items
      updateItem: function (event) {
        const self = this;
        // Get the button Jquery element
        let button = $(event.currentTarget);
        // Get the row element of the item
        let row = button.parent().parent();
        // Get the loader of the button
        let loader = row.find(`.loader-sm[value="update"]`);
        // Get the item id
        let id = event.currentTarget.value;
        // Get the item (reference to the app.collections.items item variable)
        let item = this.collection.items.filter(function (item) {
          return item.properties._id === id;
        })[0];
        // Build the opts data that will be sent to the API
        let opts = {
          data: this.getItemParams(item) // Get item params
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
          if (query.err) {
            // Case there is an error
            item.status.error = true; // Add the modified state
            // Push an error notification
            return self.notifications.push(
              NOTIFICATIONS.create(self.notifications, {
                kind: NOTIFICATIONS.kinds.error,
                message: query.res,
                autoclose: false
              })
            );
          }
          // Case this is a success
          // Refresh item with data coming from API
          self.refreshItem(query.res);
          item.status.modified = false; // Remove the modified state
          item.status.error = false; // Remove the error state
          let url = URLMANAGER.buildURL(`/backoffice/${ROUTES.main}/${query.res._id.toString()}`);
          // Push a success notification
          return self.notifications.push(
            NOTIFICATIONS.create(self.notifications, {
              kind: NOTIFICATIONS.kinds.success,
              message: `<a href="${url}" target="_blank">${query.res.label}</a> has been updated!`,
              autoclose: true
            })
          );
        });
      },
      // Update multiples items of app.collections.items
      updateMultipleItems: function (event) {
        const self = this;
        // Get the button Jquery element
        let button = $(event.currentTarget);
        // Get the loader of the button
        let loader = $(self.$refs.multipleSelectionsUpdateLoader);
        // Build the opts data that will be sent to the API
        let opts = {
          data: this.getMultipleSelectionsParams()
        };
        // Display the loader
        loader.show();
        // Disable the button
        button.prop(`disabled`, true);
        // Call updateMany API route
        return API.updateMany(ROUTES.main, opts, function (err, query) {
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
          // Case there is a success
          // Case query result is not an Array (must not happend)
          if (!Array.isArray(query.res))
            // Push an error notification
            return self.notifications.push(
              NOTIFICATIONS.create(self.notifications, {
                kind: NOTIFICATIONS.kinds.error,
                message: `Server did not respond correctly (response format not handled)`,
                autoclose: false
              })
            );
          // Case query result is an Array (of queries results), so just process all of them
          query.res.map(function (subQuery) {
            // Get the item (reference to the app.collections.items item variable)
            let item = self.collection.items.filter(function (item) {
              return item.properties._id === subQuery.res._id;
            })[0];
            if (subQuery.err) {
              // Case there is an error
              item.status.error = true;
              // Push an error notification
              return self.notifications.push(
                NOTIFICATIONS.create(self.notifications, {
                  kind: NOTIFICATIONS.kinds.error,
                  message: subQuery.res,
                  autoclose: false
                })
              );
            }
            // Case this is a success
            // Refresh item with data coming from API
            self.refreshItem(subQuery.res);
            item.status.modified = false; // Remove the modified state
            item.status.error = false; // Remove the error state
            let url = URLMANAGER.buildURL(`/backoffice/${ROUTES.main}/${subQuery.res._id.toString()}`);
            // Push a success notification
            return self.notifications.push(
              NOTIFICATIONS.create(self.notifications, {
                kind: NOTIFICATIONS.kinds.success,
                message: `<a href="${url}" target="_blank">${subQuery.res.label}</a> has been updated!`,
                autoclose: true
              })
            );
          });
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
        let item = this.collection.items.filter(function (item) {
          return item.properties._id === id;
        })[0];
        // Build the opts data that will be sent to the API
        let opts = {
          data: {
            _id: id
          }
        };
        // Display the loader
        loader.show();
        // Disable the button
        button.prop(`disabled`, true);
        // Call delete API route
        return API.delete(ROUTES.main, opts, function (err, query) {
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
          // Remove item with data coming from API
          self.removeItem(query.res);
          item.status.modified = false; // Remove the modified state
          item.status.error = false; // Remove the error state
          let url = URLMANAGER.buildURL(`/backoffice/${ROUTES.main}/${query.res._id.toString()}`);
          // Push a success notification
          return self.notifications.push(
            NOTIFICATIONS.create(self.notifications, {
              kind: NOTIFICATIONS.kinds.success,
              message: `<a href="${url}" target="_blank">${query.res.label}</a> has been deleted!`,
              autoclose: true
            })
          );
        });
      },
      // Delete multiples items of app.collections.items
      deleteMultipleItems: function (event) {
        const self = this;
        // Get the button Jquery element
        let button = $(event.currentTarget);
        // Get the loader of the button
        let loader = $(self.$refs.multipleSelectionsDeleteLoader);
        // Build the opts data that will be sent to the API
        let opts = {
          data: {
            ids: self.collection.items
              .filter(function (item) {
                return item.selected;
              })
              .map(function (item) {
                return item.properties._id;
              })
          }
        };
        // Display the loader
        loader.show();
        // Disable the button
        button.prop(`disabled`, true);
        // Call deleteMany API route
        return API.deleteMany(ROUTES.main, opts, function (err, query) {
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
          // Case there is a success
          // Case query result is not an Array (must not happend)
          if (!Array.isArray(query.res))
            // Push an error notification
            return self.notifications.push(
              NOTIFICATIONS.create(self.notifications, {
                kind: NOTIFICATIONS.kinds.error,
                message: `Server did not respond correctly (response format not handled)`,
                autoclose: false
              })
            );
          // Case query result is an Array (of queries results), so just process all of them
          query.res.map(function (subQuery) {
            // Get the item (reference to the app.collections.items item variable)
            let item = self.collection.items.filter(function (item) {
              return item.properties._id === subQuery.res._id;
            })[0];
            if (subQuery.err) {
              // Case there is an error
              item.status.error = true;
              // Push an error notification
              return self.notifications.push(
                NOTIFICATIONS.create(self.notifications, {
                  kind: NOTIFICATIONS.kinds.error,
                  message: subQuery.res,
                  autoclose: false
                })
              );
            }
            /* TO DO : Handle case data is deleted in the mongoDB (for now it's just "disabled" & "anonymised")) */
            // Case this is a success
            // Refresh item with data coming from API
            self.refreshItem(subQuery.res);
            item.status.modified = false; // Remove the modified state
            item.status.error = false; // Remove the error state
            let url = URLMANAGER.buildURL(`/backoffice/${ROUTES.main}/${subQuery.res._id.toString()}`);
            // Push a success notification
            return self.notifications.push(
              NOTIFICATIONS.create(self.notifications, {
                kind: NOTIFICATIONS.kinds.success,
                message: `<a href="${url}" target="_blank">${subQuery.res.label}</a> has been deleted!`,
                autoclose: true
              })
            );
          });
        });
      },
      // Add an item in app.collections.items
      add: function (event) {
        const self = this;
        // Get the button Jquery element
        let button = $(event.currentTarget);
        // Get the row element of the item
        let row = button.parent().parent();
        // Get the loader of the button
        let loader = $(self.$refs.addLoader);
        // Build the opts data that will be sent to the API
        let opts = {
          data: this.getNewItemParams()
        };
        // Display the loader
        loader.show();
        // Disable the button
        button.prop(`disabled`, true);
        // Call add API route
        API.add(ROUTES.main, opts, function (err, query) {
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
          // Case there is an error
          if (query.err) {
            return self.notifications.push(
              NOTIFICATIONS.create(self.notifications, {
                kind: NOTIFICATIONS.kinds.error,
                message: query.res
              })
            );
          }
          // Case there is a success
          self.collection.items.push(self.createItem(query.res));
          // Reset fileds
          self.newItem.properties.key = ``;
          self.newItem.properties.label = ``;
          self.newItem.properties.weight = ``;
          let url = URLMANAGER.buildURL(`/backoffice/${ROUTES.main}/${query.res._id.toString()}`);
          return self.notifications.push(
            // Push a success notification
            NOTIFICATIONS.create(self.notifications, {
              kind: NOTIFICATIONS.kinds.success,
              message: `<a href="${url}" target="_blank">${query.res.label}</a> has been created!`,
              autoclose: true
            })
          );
        });
      },
      // Set selected state (true/false) for all items of this.collection.items
      setSelectedStateOfAllItems: function (event) {
        this.collection.selectedItemsCount = this.collection.items
          .map(function (item) {
            item.selected = event.currentTarget.checked;
            return item;
          })
          .filter(function (item) {
            return item.selected;
          }).length;
      },
      copyURL: function (event) {
        let self = this;
        let ids = this.filteredItems.map(function (item) {
          return item.properties._id.toString();
        });
        let url = URLMANAGER.buildURL(`backoffice/${ROUTES.main}`, { ids: ids }, { origin: true });
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
      // Get the next page of items
      nextPage: function (event) {
        const self = this;
        // Get the button Jquery element
        let button = $(event.currentTarget);
        // Get the loader of the button
        let loader = $(self.$refs.nextPageLoader);
        // Calculate the skip params, using inputs of form search
        let skip = parseInt(self.search.properties.skip) + parseInt(self.search.properties.limit);
        // Get Params from URL
        let currentParams = this.getCurrentURLParams();
        // Build the opts data that will be sent to the API
        let opts = self.getSearchParams(currentParams.token);
        // Set new skip value
        opts.skip = skip;
        // Display the loader
        loader.show();
        // Disable the button
        button.prop(`disabled`, true);
        // Call all API route
        return API.all(ROUTES.main, { params: opts }, function (err, query) {
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
          // Refresh search properties
          app.refreshSearchProperties(query.params);
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
          // Case there is a success
          // Case query result is not an Array (must not happend)
          if (!Array.isArray(query.res))
            // Push an error notification
            return self.notifications.push(
              NOTIFICATIONS.create(self.notifications, {
                kind: NOTIFICATIONS.kinds.error,
                message: `Server did not respond correctly (response format not handled)`,
                autoclose: false
              })
            );
          // Case query result is an Array (of items), so just process all of them
          // Refresh the collection of items
          self.refreshCollection(query.res);
          // Refresh the previous/next buttons
          self.refreshPreviousNext();
        });
      },
      // Get the previous page of items
      previousPage: function (event) {
        const self = this;
        // Get the button Jquery element
        let button = $(event.currentTarget);
        // Get the loader of the button
        let loader = $(self.$refs.previousPageLoader);
        // Calculate the skip params, using inputs of form search
        let skip = parseInt(self.search.properties.skip) - parseInt(self.search.properties.limit);
        // Get Params from URL
        let currentParams = this.getCurrentURLParams();
        // Build the opts data that will be sent to the API
        let opts = self.getSearchParams(currentParams.token);
        // Set new skip value
        opts.skip = skip;
        // Display the loader
        loader.show();
        // Disable the button
        button.prop(`disabled`, true);
        // Call all API route
        return API.all(ROUTES.main, { params: opts }, function (err, query) {
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
          // Refresh search properties
          app.refreshSearchProperties(query.params);
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
          // Case there is a success
          // Case query result is not an Array (must not happend)
          if (!Array.isArray(query.res))
            // Push an error notification
            return self.notifications.push(
              NOTIFICATIONS.create(self.notifications, {
                kind: NOTIFICATIONS.kinds.error,
                message: `Server did not respond correctly (response format not handled)`,
                autoclose: false
              })
            );
          // Case query result is an Array (of items), so just process all of them
          // Refresh the collection of items
          self.refreshCollection(query.res);
          // Refresh the previous/next buttons
          self.refreshPreviousNext();
        });
      },
      // Refresh the previous/next buttons visibility
      refreshPreviousNext: function () {
        // Make buttons visible
        let previous = $(this.$refs.previous);
        let next = $(this.$refs.next);
        // Make buttons available
        next.removeClass(`disabled`).prop(`disabled`, false);
        previous.removeClass(`disabled`).prop(`disabled`, false);
        // Check next button visibility
        if (this.collection.items.length < this.search.properties.limit)
          next.addClass(`disabled`).prop(`disabled`, true);
        else next.removeClass(`disabled`).prop(`disabled`, false);
        // Check previous button visibility
        if (this.search.properties.skip === 0) previous.addClass(`disabled`).prop(`disabled`, true);
        else previous.removeClass(`disabled`).prop(`disabled`, false);
      },
      // Search items (click on search button form)
      searchItems: function (event) {
        const self = this;
        // Get the loader of the button
        let loader = $(self.$refs.searchLoader);
        // Refresh search properties
        let params = self.getSearchParams(self.getCurrentURLParams().token);
        params.ids = []; // Reset list of ids
        self.refreshSearchProperties(params);
        // Display the loader
        loader.show();
        // Refresh interface (keep, search, multipleSelections, newItem)
        self.refresh(function (err) {
          // Hide the loader
          loader.hide();
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
        });
      },
      itemSelectedChange: function (event) {
        this.collection.selectedItemsCount += event.currentTarget.checked ? 1 : -1;
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
      // Set saved status (visual display)
      saved: function (_id) {
        let item = this.collection.items.filter(function (item) {
          return item.properties._id === _id;
        })[0];
        item.status.modified = false;
        item.status.error = false;
      },
      // Set modified status (visual display)
      modified: function (_id) {
        let item = this.collection.items.filter(function (item) {
          return item.properties._id === _id;
        })[0];
        item.status.modified = true;
      },
      // Set error status (visual display)
      hasError: function (_id) {
        let item = this.collection.items.filter(function (item) {
          return item.properties._id === _id;
        })[0];
        item.status.error = true;
      },
      // Change selected state of all item
      changeSelectedStateOf: function (collections, value) {
        collections.map(function (item) {
          item.selected = value;
          return item;
        });
      },
      // Build link to a single resource
      buildIdLink: function (id) {
        return URLMANAGER.buildURL(`backoffice/${ROUTES.main}/${id}/`);
      },
      // Change the "new item" visibility
      changeNewItemVisibility: function () {
        if (this.newItem.showed) this.newItem.showed = false;
        else this.newItem.showed = true;
      },
      getCurrentURLParams: function () {
        let urlParams = URLMANAGER.getParamsOfCurrentURL();
        return {
          ids: PARAMS.convertToArray(urlParams.ids, `string`),
          token: PARAMS.convertToString(urlParams.token),
          limit: PARAMS.convertToInteger(urlParams.limit),
          skip: PARAMS.convertToInteger(urlParams.skip),
          sort: PARAMS.convertToString(urlParams.sort)
        };
      },
      // Get "multiple selections" params representation ("well formated" representation of app.multipleSelections.properties used to request API or build an URL)
      getMultipleSelectionsParams: function () {
        let self = this;
        let result = {
          ids: this.collection.items
            .filter(function (item) {
              return item.selected;
            })
            .map(function (item) {
              return item.properties._id;
            })
        };
        // Build data properties
        for (let property in this.multipleSelections.schema) {
          // If it's an array so filter & map it
          if (Array.isArray(this.multipleSelections.properties[property]))
            result[property] = this.multipleSelections.properties[property]
              .filter(function (item) {
                return item.selected;
              })
              .map(function (item) {
                return _.get(item, self.multipleSelections.schema[property].key);
              });
          else if (
            typeof this.multipleSelections.properties[property] === `object` &&
            _.get(this.multipleSelections.properties[property], this.multipleSelections.schema[property].key)
          )
            result[property] = _.get(
              this.multipleSelections.properties[property],
              this.multipleSelections.schema[property].key
            );
          else result[property] = this.multipleSelections.properties[property];
        }
        return result;
      },
      // Get "new item" params representation ("well formated" representation of app.newItem.properties used to request API or build an URL)
      getNewItemParams: function () {
        let self = this;
        let result = {};
        // Build data properties
        for (let property in this.newItem.schema) {
          // If it's an array so filter & map it
          if (Array.isArray(this.newItem.properties[property]))
            result[property] = this.newItem.properties[property]
              .filter(function (item) {
                return item.selected;
              })
              .map(function (item) {
                return _.get(item, self.newItem.schema[property].key);
              });
          else if (
            typeof this.newItem.properties[property] === `object` &&
            _.get(this.newItem.properties[property], this.newItem.schema[property].key)
          )
            result[property] = _.get(this.newItem.properties[property], this.newItem.schema[property].key);
          else result[property] = this.newItem.properties[property];
        }
        return result;
      },
      // Get "search" params representation ("well formated" representation of app.search.properties used to request API or build an URL)
      getSearchParams: function (token) {
        let self = this;
        let result = { token: token };
        // Build data properties
        for (let property in this.search.schema) {
          // If it's an array so filter & map it
          if (Array.isArray(this.search.properties[property])) {
            // Case array contain objects
            if (this.search.schema[property].typeof === `object`)
              result[property] = this.search.properties[property]
                .filter(function (item) {
                  return item.selected;
                })
                .map(function (item) {
                  return _.get(item, self.search.schema[property].key);
                });
            // Case array do not contain objects
            else result[property] = this.search.properties[property];
            // Check if this is an optionnal property (empty or "full" array should be ignored)
            if (this.search.schema[property].optionnal) {
              // Try to get dependency, else get empty array
              let dependency = _.get(this.collection.dependencies, this.search.schema[property].dependency, []);
              if (result[property].length === 0 || result[property].length === dependency.length)
                delete result[property];
            }
          } else if (
            typeof this.search.properties[property] === `object` &&
            _.get(this.search.properties[property], this.search.schema[property].key)
          )
            result[property] = _.get(this.search.properties[property], this.search.schema[property].key);
          else result[property] = this.search.properties[property];
        }
        return result;
      },
      // Get "item" params representation ("well formated" representation of app.item.properties used to request API or build an URL)
      getItemParams: function (item = {}) {
        let self = this;
        let result = {};
        // Build data properties
        for (let property in this.collection.schema) {
          // If it's an array so filter & map it
          if (Array.isArray(item.properties[property]))
            result[property] = item.properties[property]
              .filter(function (item) {
                return item.selected;
              })
              .map(function (item) {
                return _.get(item, self.collection.schema[property].key);
              });
          else if (
            typeof item.properties[property] === `object` &&
            typeof this.collection.schema[property].key !== `undefined`
          )
            result[property] = _.get(item.properties[property], this.collection.schema[property].key);
          else result[property] = item.properties[property];
        }
        return result;
      },
      // Refresh "search" properties
      refreshSearchProperties: function (params = {}) {
        let self = this;
        for (let property in this.search.properties) {
          // Case this params value is in a list (case: "true AND false available", "select" or "select-scrollable")
          // It is stored in an Array
          if (
            Array.isArray(this.search.properties[property]) &&
            Array.isArray(params[property]) &&
            typeof this.search.schema[property].key !== `undefined`
          ) {
            this.search.properties[property].map(function (item) {
              item.selected =
                typeof params[property] !== `undefined`
                  ? params[property].indexOf(_.get(item, self.search.schema[property].key)) > -1
                  : item.selected;
            });
          }
          // Case this params value is unique (case: "input text", "true OR false only")
          // It is stored in an Integer, String, Boolean, etc
          else
            this.search.properties[property] =
              typeof params[property] !== `undefined`
                ? params[property]
                : typeof this.search.properties[property] !== `undefined`
                  ? this.search.properties[property]
                  : this.search.default[property];
        }
        // Replace URL params
        window.history.replaceState(
          null,
          null,
          URLMANAGER.buildParams(this.getSearchParams(self.getCurrentURLParams().token))
        );
      },
      // Refresh all items of app.collection.items
      refreshCollection: function (collection = []) {
        const self = this;
        this.collection.items = collection.map(function (item) {
          return self.createItem(item);
        });
      },
      // Remove an item of app.collection.items
      removeItem: function (data) {
        const self = this;
        let itemId = this.collection.items.reduce(function (acc, item, i) {
          if (item.properties._id.toString() === data._id.toString()) acc = i;
          return acc;
        }, -1);
        this.collection.items.splice(itemId, 1);
      },
      // Refresh an item of app.collection.items
      refreshItem: function (data) {
        const self = this;
        let newItem = this.createItem(data);
        let itemId = this.collection.items.reduce(function (acc, item, index) {
          if (data._id === item.properties._id) acc = index;
          return acc;
        }, -1);
        let item = this.collection.items.filter(function (item) {
          return item.properties._id === data._id;
        })[0];
        newItem.selected = item.selected;
        if (itemId > -1) this.collection.items.splice(itemId, 1, newItem);
      },
      // Create an item (use it to populate the app.collection.items property)
      createItem: function (data = {}) {
        let result = {
          status: { modified: false, error: false },
          selected: false,
          properties: {},
          raw: DATAHANDLER.object.getRaw(data)
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
          } else result.properties[property] = data[property];
        }
        return result;
      },
      // Refresh the app
      refresh: function (cb) {
        let self = this;
        this.loading = true;
        // Get Params from URL
        let currentParams = this.getCurrentURLParams();
        // Refresh search properties
        self.refreshSearchProperties(currentParams);
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
            // Get all roles
            function (next) {
              return API.all(ROUTES.dependencies.roles, {}, function (err, query) {
                if (err) return next(err);
                if (query.err) return next(query);
                self.collection.dependencies.roles = [];
                self.search.properties.roles = [];
                query.res.sort(DATAHANDLER.array.sortRoles).map(function (item) {
                  // Set roles dependencies
                  self.collection.dependencies.roles.push(Object.assign({}, item));
                  // Set roles of search params properties
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
            // Get all Accounts
            return API.all(ROUTES.main, { params: self.getSearchParams(currentParams.token) }, function (err, query) {
              self.loading = false;
              if (err) return cb(err);
              if (query.err) return cb(query);
              // Refresh search properties
              self.refreshSearchProperties(query.params);
              self.refreshCollection(query.res);
              // Refresh the previous/next buttons
              app.refreshPreviousNext();
              return cb(err);
            });
          }
        );
      }
    },
    mounted: function () {
      let self = this;
      this.$nextTick(function () {
        // Code that will run only after the
        // entire view has been rendered
        // Hide "multiple selection" section
        $(self.$refs.multipleSelectionsTitle).hide();
        $(self.$refs.multipleSelectionsRow).hide();
        // Hide "new item" section
        $(self.$refs.newItemTitle).hide();
        $(self.$refs.newItemRow).hide();
      });
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
