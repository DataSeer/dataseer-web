/*
 * @prettier
 */

'use strict';
(function ($, _, async) {
  let app = new Vue({
    el: `#app`,
    data: {
      notifications: [],
      username: ``
    },
    methods: {
      forgotPassword: function (event) {
        const self = this;
        // Get the button Jquery element
        let button = $(event.currentTarget);
        // Get the loader
        let loader = $(self.$refs.forgotPassword);
        // Display the loader
        loader.show();
        // Disable the button
        button.prop(`disabled`, true);
        let opts = {
          data: {
            username: this.username
          }
        };
        return API.forgotPassword(opts, function (err, query) {
          loader.hide();
          button.prop(`disabled`, false);
          if (err)
            return self.notifications.push(
              NOTIFICATIONS.create(self.notifications, {
                kind: NOTIFICATIONS.kinds.error,
                message: err,
                autoclose: false
              })
            );
          if (query.err)
            return self.notifications.push(
              NOTIFICATIONS.create(self.notifications, {
                kind: NOTIFICATIONS.kinds.error,
                message: query.err,
                autoclose: false
              })
            );
          return self.notifications.push(
            NOTIFICATIONS.create(self.notifications, {
              kind: NOTIFICATIONS.kinds.success,
              message: `An email (allowing you to redefine your password) has been sent at the following address: ${self.username} `,
              autoclose: false
            })
          );
        });
      }
    }
  });
})($, _, async);
