/*
 * @prettier
 */

'use strict';

(function ($) {
  // On selected checkbox click
  $('input[name="isSelected"]').click(function (event) {
    let el = $(this),
      documentIds = $('input[name="isSelected"]:checked')
        .map(function () {
          return $(this).attr('document-id');
        })
        .get(),
      nbDoc = documentIds.length;
    $('input[name="ids"]').val(documentIds.join(';'));
    $('.selected-documents-count').text(`${nbDoc} document(s) selected`);
  });
})(jQuery);
