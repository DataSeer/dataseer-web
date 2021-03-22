/*
 * @prettier
 */

'use strict';

(function ($) {
  // On metadata_validation click
  $('#metadata_validation').click(function () {
    let documentId = $(document.getElementById('document.id')).attr('value');
    return DataSeerAPI.validateMetadata(documentId, function (err, res) {
      console.log(err, res);
      if (err) return err; // Need to define error behavior
      return location.reload();
    });
  });
})(jQuery);
