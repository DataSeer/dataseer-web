/*
 * @prettier
 */

'use strict';

const NOTIFICATIONS = {
  count: 0,
  kinds: {
    error: 1,
    success: 2,
    warning: 3
  },
  create: function (notifications, opts = {}) {
    let notification;
    let msg = `(${new Date(Date.now()).toLocaleTimeString()}) ${opts.message}`;
    if (typeof opts.kind === `undefined` || opts.kind === NOTIFICATIONS.kinds.error)
      notification = {
        class: `alert alert-danger alert-dismissible fade show`,
        html: msg,
        index: NOTIFICATIONS.getId()
      };
    else if (opts.kind === NOTIFICATIONS.kinds.success)
      notification = {
        class: `alert alert-success alert-dismissible fade show`,
        html: msg,
        index: NOTIFICATIONS.getId()
      };
    else if (opts.kind === NOTIFICATIONS.kinds.warning)
      notification = {
        class: `alert alert-warning alert-dismissible fade show`,
        html: msg,
        index: NOTIFICATIONS.getId()
      };
    // Handle autoclose if necessary
    if (typeof notification !== `undefined` && opts.autoclose)
      setTimeout(function () {
        NOTIFICATIONS.close(notifications, notification);
      }, 3000);
    return notification;
  },
  getId: function () {
    return NOTIFICATIONS.count++;
  },
  close: function (notifications, notification) {
    for (let i = 0; i < notifications.length; i++) {
      if (notifications[i].index === notification.index) notifications.splice(i, 1);
    }
  }
};
