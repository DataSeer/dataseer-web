/*
 * @prettier
 */

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
  'type': 'opt-in',
  'content': {
    'message': 'Custom message',
    'dismiss': 'Dismiss',
    'allow': 'Accept',
    'deny': 'Deny',
    'link': 'Learn more',
    'href': 'privacy'
  },
  'onInitialise': function(status) {
    var type = this.options.type;
    var didConsent = this.hasConsented();
    if (type == 'opt-in' && didConsent) {
      // enable cookies
    }
    if (type == 'opt-out' && !didConsent) {
      // disable cookies
    }
  },
  'onStatusChange': function(status, chosenBefore) {
    var type = this.options.type;
    var didConsent = this.hasConsented();
    if (type == 'opt-in' && didConsent) {
      // enable cookies
    }
    if (type == 'opt-out' && !didConsent) {
      // disable cookies
    }
  },
  'onRevokeChoice': function() {
    var type = this.options.type;
    if (type == 'opt-in') {
      // disable cookies
    }
    if (type == 'opt-out') {
      // enable cookies
    }
  }
});