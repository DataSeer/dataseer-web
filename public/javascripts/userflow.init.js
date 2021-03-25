/*
 * @prettier
 */

'use strict';

(function ($) {
  userflow.init($('#userflow-data').attr('token'));
  userflow.identify($('#userflow-data').attr('user-id'), {
    name: $('#userflow-data').attr('user-name'),
    email: $('#userflow-data').attr('user-email'),
    role: $('#userflow-data').attr('user-role'),
    signed_up_at: new Date().toISOString()
  });
})(jQuery);
