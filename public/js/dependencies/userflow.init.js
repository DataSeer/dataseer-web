/*
 * @prettier
 */

'use strict';

(function () {
  return ACCOUNTS.getCurrentUser(function (err, currentUser) {
    if (err || !currentUser) return;
    return API.getUserflowToken(function (err, query) {
      if (err) return console.log(err);
      if (query.err) return console.log(query);
      userflow.init(query.res.token);
      userflow.identify(currentUser._id, {
        name: currentUser.fullname,
        email: currentUser.username,
        role: currentUser.role.key,
        signed_up_at: new Date().toISOString()
      });
    });
  });
})();
