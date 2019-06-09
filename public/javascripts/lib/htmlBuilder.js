const HtmlBuilder = {
  'div': function(options = {}) {
    let result = jQuery('<div/>')
      .addClass(options.class)
      .text(options.text);
    if (options.id) result.attr('id', options.id);
    if (options.value) result.attr('value', options.value);
    return result;
  },
  'input': function(options = {}) {
    return jQuery('<input/>')
      .attr('type', options.type)
      .attr('placeholder', options.placeholder)
      .attr('value', options.value)
      .addClass('form-control');
  },
  'textarea': function(options = {}) {
    return jQuery('<textarea/>')
      .attr('placeholder', options.placeholder)
      .attr('value', options.value)
      .addClass('form-control');
  },
  'option': function(options = {}) {
    return jQuery('<option/>')
      .attr('value', options.value)
      .text(options.text)
      .prop('selected', options.selected);
  },
  'select': function(options = {}) {
    let select = jQuery('<select/>').addClass('form-control');
    for (let i = 0; i < options.length; i++) {
      select.append(HtmlBuilder.option(options[i]));
    }
    return select;
  },
  'button': function(options = {}) {
    return jQuery('<button/>')
      .addClass(options.class);
  },
  'icon': function(options = {}) {
    return jQuery('<i/>')
      .addClass(options.class);
  }
};