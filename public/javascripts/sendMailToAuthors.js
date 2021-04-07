/*
 * @prettier
 */

'use strict';

(function ($) {
  // Get current document Id
  const documentId = $(document.getElementById('document.id')).attr('value');
  $('#sendMailToAuthors').click(function (e) {
    e.preventDefault();
    let el = $(this);
    el.find('i.fas.fa-sync-alt').removeClass('hidden');
    return DataSeerAPI.sendMailToAuthors(documentId, function (err, res) {
      el.find('i.fas.fa-sync-alt').addClass('hidden');
      console.log(err, res);
      if (err) alert('An error has occured ! (no mails have been sent)');
      else if (res.err) alert(res.msg);
      else alert('The mails have been sent to the authors');
    });
  });
})(jQuery);
