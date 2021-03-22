/*
 * @prettier
 */

'use strict';

(function ($) {
  const getIntValue = function (val) {
      let _val = parseInt(val);
      if (isNaN(_val) || _val < 0) return 0;
      else return _val;
    },
    getSkipValue = function (skip, limit, coeff) {
      let res = skip + coeff * limit;
      if (res < 0) return 0;
      else return res;
    };
  $('#previous_skip').click(function () {
    const url = new URL(window.location.href),
      params = url.searchParams,
      limit = params.get('limit'),
      skip = params.get('skip'),
      skip_int = getIntValue(skip),
      limit_int = getIntValue(limit),
      value = getSkipValue(skip_int, limit_int ? limit_int : 20, -1);
    if (skip) params.set('skip', value);
    window.location.href = url;
  });
  $('#next_skip').click(function () {
    const url = new URL(window.location.href),
      params = url.searchParams,
      limit = params.get('limit'),
      skip = params.get('skip'),
      skip_int = getIntValue(skip),
      limit_int = getIntValue(limit),
      value = getSkipValue(skip_int, limit_int ? limit_int : 20, 1);
    if (skip) params.set('skip', value);
    else params.append('skip', value);
    window.location.href = url;
  });
  // init attr data of each 'searchable' row
  $('.list .row[data]').map(function () {
    let row = $(this),
      txt = '';
    row.children().map(function () {
      txt += $(this).text() + ';';
    });
    row.attr('data', txt);
  });
  let filter = function () {
    // Declare variables
    let input = $(this),
      searchedValue = input.val().toLowerCase();
    $('.list .row[data]').map(function () {
      let row = $(this),
        txt = row.attr('data');
      if (txt.length) {
        if (txt.toLowerCase().indexOf(searchedValue) > -1) {
          row.removeClass('hidden');
        } else {
          row.addClass('hidden');
        }
      }
    });
    return $('.count-list').text($('.list .row[data]:not(.hidden)').length + ' Result(s)');
  };
  document.getElementById('search').addEventListener('input', filter);
})(jQuery);
