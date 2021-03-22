/*
 * @prettier
 */

'use strict';

(function ($) {
  // On public URL click
  $('#getPublicURL').click(function () {
    /* Get the text field */
    var copyText = document.getElementById('public_url');

    /* Select the text field */
    copyText.select();
    copyText.setSelectionRange(0, 99999); /* For mobile devices */

    /* Copy the text inside the text field */
    navigator.clipboard.writeText(copyText.value);
    alert('Public URL copied');
  });
})(jQuery);
