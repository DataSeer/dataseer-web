/*
 * @prettier
 */

'use strict';

// Disabled for the moment

const COOKIES = {
  storeCurrentUser: function (data) {
    let users = COOKIES.get(`users`);
    if (users.length > 0) users = JSON.parse(users);
    else users = {};
    users[data.token] = data;
    document.cookie = `users=${JSON.stringify(users)};path=/`;
  },
  getCurrentUser: function (token) {
    token = token ? token : URLMANAGER.getParamsOfCurrentURL().token;
    if (typeof token === `undefined`) return;
    let users = COOKIES.get(`users`);
    if (users.length <= 0) return;
    users = JSON.parse(users);
    return users[token];
  },
  get: function (cname) {
    let name = cname + `=`;
    let ca = document.cookie.split(`;`);
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ` `) {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return ``;
  }
};
