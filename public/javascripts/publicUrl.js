/*
 * @prettier
 */

'use strict';

(function ($) {
  // On public URL click
  $('#getPublicURL').click(function () {
    return fallbackCopyTextToClipboard(document.getElementById('public_url').value, function (err) {
      if (err) alert('An error has occurred, the public URL is not copied');
      else alert('Public URL copied');
    });
  });
  function fallbackCopyTextToClipboard(text, cb) {
    var textArea = document.createElement('textarea');
    textArea.value = text;
    // Avoid scrolling to bottom
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      var successful = document.execCommand('copy');
      var msg = successful ? 'successful' : 'unsuccessful';
      console.log('Fallback: Copying text command was ' + msg);
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
      return cb(err);
    }
    document.body.removeChild(textArea);
    return cb();
  }
  function copyTextToClipboard(text, cb) {
    if (!navigator.clipboard) {
      return fallbackCopyTextToClipboard(text, cb);
    }
    navigator.clipboard.writeText(text).then(
      function () {
        console.log('Async: Copying to clipboard was successful!');
        return cb();
      },
      function (err) {
        console.error('Async: Could not copy text: ', err);
        return cb(err);
      }
    );
  }
})(jQuery);
