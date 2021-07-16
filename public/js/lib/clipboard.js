/*
 * @prettier
 */

'use strict';

const CLIPBOARD = {
  fallbackCopyTextToClipboard: function (text, cb) {
    let textArea = document.createElement(`textarea`);
    textArea.value = text;
    // Avoid scrolling to bottom
    textArea.style.top = `0`;
    textArea.style.left = `0`;
    textArea.style.position = `fixed`;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      let successful = document.execCommand(`copy`);
      let msg = successful ? `successful` : `unsuccessful`;
      console.log(`Fallback: Copying text command was ` + msg);
    } catch (err) {
      console.error(`Fallback: Oops, unable to copy`, err);
      return cb(err);
    }
    document.body.removeChild(textArea);
    return cb();
  },
  copy: function (text, cb) {
    if (!navigator.clipboard) {
      return fallbackCopyTextToClipboard(text, cb);
    }
    navigator.clipboard.writeText(text).then(
      function () {
        console.log(`Async: Copying to clipboard was successful!`);
        return cb();
      },
      function (err) {
        console.error(`Async: Could not copy text: `, err);
        return cb(err);
      }
    );
  }
};
