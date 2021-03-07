/*
 * @prettier
 */

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
