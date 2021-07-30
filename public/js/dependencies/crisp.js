/*
 * @prettier
 */

'use strict';

(function () {
  return API.getCrispId(function (err, query) {
    if (err) return console.log(err);
    if (query.err) return console.log(query);
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = query.res.id;
    let s = document.createElement(`script`);
    s.src = `https://client.crisp.chat/l.js`;
    s.async = 1;
    document.getElementsByTagName(`head`)[0].appendChild(s);
  });
})();
