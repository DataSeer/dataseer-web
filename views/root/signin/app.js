/*
 * @prettier
 */

'use strict';

(function ($, _, async) {
  const app = new Vue({
    el: `#app`,
    data: {
      isLoading: false,
      notifications: [],
      username: ``,
      password: ``
    },
    methods: {
      submit: function (event) {
        const self = this;
        // Get the button Jquery element
        let button = $(this.$refs.signin);
        // Get the loader
        let loader = $(this.$refs.signinLoader);
        // Display the loader
        loader.show();
        // Disable the button
        button.prop(`disabled`, true);
        let opts = {
          data: {
            username: username.value,
            password: password.value
          }
        };
        loader.show();
        button.prop(`disabled`, true);
        return API.signin(opts, function (err, query) {
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
          let currentParams = URLMANAGER.getParamsOfCurrentURL();
          if (typeof currentParams.redirect !== `undefined`)
            document.location.href = URLMANAGER.buildURL(currentParams.redirect);
          else document.location.reload();
        });
      }
    }
  });
  let currentParams = URLMANAGER.getParamsOfCurrentURL();
  // Case user come from signup
  if (typeof currentParams.signup !== `undefined`)
    app.notifications.push(
      NOTIFICATIONS.create(app.notifiactions, {
        kind: NOTIFICATIONS.kinds.success,
        message: currentParams.signup,
        autoclose: false
      })
    );
  // Case there is a username
  if (typeof currentParams.username !== `undefined`) app.username = currentParams.username;
  // Case there is a redirect
  if (typeof currentParams.unauthorized !== `undefined`)
    app.notifications.push(
      NOTIFICATIONS.create(app.notifiactions, {
        kind: NOTIFICATIONS.kinds.warning,
        message: `You must be logged to access to <a href="${currentParams.redirect}" target="_blank">this part of the website</a>`,
        autoclose: false
      })
    );
})(jQuery, _, async);
