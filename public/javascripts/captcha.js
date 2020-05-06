/*
 * @prettier
 */

grecaptcha.ready(function() {
  grecaptcha.execute($('#_reCAPTCHA_site_key_').text(), { action: 'login' }).then(function(token) {
    // add token value to form
    $('#g-recaptcha-response').val(token);
  });
});
