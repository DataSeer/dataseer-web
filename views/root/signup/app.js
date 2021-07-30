/*
 * @prettier
 */

'use strict';

(function ($, _, async) {
  const app = new Vue({
    el: `#app`,
    data: {
      organizations: [],
      notifications: [],
      username: null,
      password: null,
      fullname: null,
      confirm_password: null
    },
    methods: {
      // Change selected state of all item
      changeSelectedStateOf: function (collections, value) {
        collections.map(function (item) {
          item.selected = value;
          return item;
        });
      },
      submit: function (e) {
        const self = this;
        // Get the button
        let button = $(this.$refs.signup);
        // Get the loader of the button
        let loader = $(this.$refs.signupLoader);
        // Display the loader
        loader.show();
        // Disable the button
        button.prop(`disabled`, true);
        let opts = {
          data: {
            username: username.value,
            fullname: fullname.value,
            password: password.value,
            confirm_password: confirm_password.value
          }
        };
        loader.show();
        button.prop(`disabled`, true);
        grecaptcha.ready(function () {
          grecaptcha.execute(CONF.reCAPTCHA_site_key, { action: `submit` }).then(function (token) {
            opts.data[`g-recaptcha-response`] = token;
            // Add your logic to submit to your backend server here.
            return API.signup(opts, function (err, query) {
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
              document.location.href = URLMANAGER.buildURL(`/signin`, {
                username: query.res.username,
                signup: `Sign up has been completed! You can signin with username ${query.res.username} !`
              });
            });
          });
        });
      }
    }
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
      app.organizations.push(
        Object.assign({ selected: CONF.default.organizations.indexOf(organization._id) > -1 }, organization)
      );
    });
  });
})(jQuery, _, async);
