/*
 * @prettier
 */

'use strict';

(function ($) {
  // On copy_token click
  $('button[name="copy_token"]').click(function (event) {
    event.preventDefault();
    /* Get the text field */
    let btn = $(this);

    var copyText = btn.siblings('input').get(0);
    /* Select the text field */
    copyText.select();
    copyText.setSelectionRange(0, 99999); /* For mobile devices */

    /* Copy the text inside the text field */
    navigator.clipboard.writeText(copyText.value);
    alert('Token copied');
  });
})(jQuery);
