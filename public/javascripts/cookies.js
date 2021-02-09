/*
 * @prettier
 */

(function ($) {
  window.cookieconsent.initialise({
    'palette': {
      'popup': {
        'background': '#237afc'
      },
      'button': {
        'background': '#fff',
        'text': '#237afc'
      }
    },
    'theme': 'classic',
    'content': {
      'message': 'By using this app, you consent to our cookie policy',
      'dismiss': 'Got it!',
      'allow': 'Allow cookies',
      'deny': 'Decline',
      'link': 'Learn more',
      'href': 'privacy'
    }
  });
})(jQuery);
