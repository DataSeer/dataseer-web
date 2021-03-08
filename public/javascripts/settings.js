/*
 * @prettier
 */

'use strict';

(function () {
  document.getElementById('copyApiToken').addEventListener('click', function () {
    /* Get the text field */
    var copyText = document.getElementById('apiToken');

    /* Select the text field */
    copyText.select();
    copyText.setSelectionRange(0, 99999); /* For mobile devices */

    /* Copy the text inside the text field */
    navigator.clipboard.writeText(copyText.value);
    alert('Token copied');
  });
})();
