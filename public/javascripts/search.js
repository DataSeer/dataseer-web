/*
 * @prettier
 */

(function($) {
  // On find_user keyup
  $('#search').keyup(function() {
    // Declare variables
    let input = $(this),
      filter = input.val();
    return $('.list .row[data]').map(function() {
      let row = $(this),
        txt = row.attr('data');
      if (txt.length) {
        if (txt.indexOf(filter) > -1) {
          row.removeClass('hidden');
        } else {
          row.addClass('hidden');
        }
      }
    });
  });
})(jQuery);
