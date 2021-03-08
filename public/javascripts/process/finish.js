/*
 * @prettier
 */

'use strict';

(function ($) {
  // On reopen_document click
  $('#reopen_document').click(function () {
    let documentId = $(document.getElementById('document.id')).attr('value');
    return DataSeerAPI.reopenDocument(documentId, function (err, res) {
      console.log(err, res);
      if (err) return err; // Need to define error behavior
      return (window.location.href = window.location.href.replace(/(\/?finish\/?)$/, ''));
    });
  });
})(jQuery);
