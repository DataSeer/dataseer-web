/*
 * @prettier
 */

'use strict';

(function ($) {
  let currentParams = URLMANAGER.getParamsOfCurrentURL();
  let app = new Vue({
    el: `#app`,
    data: {
      notifications: [],
      current_password: ``,
      new_password: ``,
      confirm_new_password: ``
    },
    methods: {
      resetPassword: function (event) {
        const self = this;
        // Get the button Jquery element
        let button = $(event.currentTarget);
        // Get the loader
        let loader = $(self.$refs.resetPassword);
        // Display the loader
        loader.show();
        // Disable the button
        button.prop(`disabled`, true);
        let opts = {
          data: {
            token: currentParams.token,
            current_password: this.current_password,
            new_password: this.new_password,
            confirm_new_password: this.confirm_new_password
          }
        };
        return API.resetPassword(opts, function (err, query) {
          loader.hide();
          button.prop(`disabled`, false);
          if (err) {
            return self.notifications.push(
              NOTIFICATIONS.create(self.notifications, {
                kind: NOTIFICATIONS.kinds.error,
                message: `${err.toString()}`,
                autoclose: false
              })
            );
          }
          if (query.err)
            return self.notifications.push(
              NOTIFICATIONS.create(self.notifications, {
                kind: NOTIFICATIONS.kinds.error,
                message: query.res,
                autoclose: false
              })
            );
          else
            return self.notifications.push(
              NOTIFICATIONS.create(self.notifications, {
                kind: NOTIFICATIONS.kinds.success,
                message: `Your password has been reset successfully! You can signin with your new password!`
              })
            );
        });
      },
      notificationClick: function (id) {
        this.notifications.splice(parseInt(id), 1);
      }
    }
  });
})(jQuery);
