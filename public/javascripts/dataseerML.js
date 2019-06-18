// API Interface Object
const dataseerML = {
  // Get the dataType of a given sentence
  'getdataType': function(sentence, done) {
    return $.ajax({
      cache: false,
      type: 'POST',
      url: '../api/dataseer-ml/processDataseerSentence',
      data: 'text=' + encodeURIComponent(sentence.text()),
      'complete': function(data) {
        'getdataType complete';
      },
      'success': function(data) {
        done(null, data);
      },
      'error': function(data) {
        done(true, data);
      }
    });
  }
};
