/*
 * @prettier
 */

'use strict';

const ACCOUNTS = {
  getCurrentUser: function (done) {
    return API.currentUser({}, function (err, query) {
      if (err) return done(err);
      if (query.err) return done(true);
      // COOKIES.storeCurrentUser(query.res);
      return done(null, query.res);
    });
  }
};
