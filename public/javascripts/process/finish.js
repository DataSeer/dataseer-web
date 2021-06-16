/*
 * @prettier
 */

'use strict';

(function ($) {
  // On reopen_document click
  $('#reopen_document').click(function () {
    let icon = $(this).find('i');
    icon.addClass('fa-spin');
    let documentId = $(document.getElementById('document.id')).attr('value');
    return DataSeerAPI.reopenDocument(documentId, function (err, res) {
      icon.removeClass('fa-spin');
      console.log(err, res);
      // Need to define error behavior
      if (err) return err;
      else if (res.err) return res;
      else return (window.location.href = window.location.href.replace(/(\/?finish\/?)$/, ''));
    });
  });
})(jQuery);
