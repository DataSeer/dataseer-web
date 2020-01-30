/*
 * @prettier
 */

// API Interface Object
const dataseerML = {
  'jsonDataTypes': function(done) {
    return $.ajax({
      'cache': false,
      'type': 'GET',
      'contentType': 'application/json',
      'url': '../api/dataseer-ml/jsonDataTypes',
      'success': function(data) {
        if (typeof data === 'string') data = JSON.parse(data);
        return done(null, data);
      },
      'error': function(data) {
        return done(true, data);
      }
    });
  },
  'resyncJsonDataTypes': function(done) {
    return $.ajax({
      'cache': false,
      'type': 'GET',
      'contentType': 'application/json',
      'url': '../api/dataseer-ml/resyncJsonDataTypes',
      'success': function(data) {
        if (typeof data === 'string') data = JSON.parse(data);
        return done(null, data);
      },
      'error': function(data) {
        return done(true, data);
      }
    });
  },
  'extractDatatypeFrom': function(data) {
    let classifications =
        data['classifications'].length > 0 &&
        typeof data['classifications'][0] === 'object' &&
        data['classifications'][0].has_dataset > data['classifications'][0].no_dataset
          ? data['classifications'][0]
          : {},
      result = {};
    delete classifications.text;
    delete classifications.has_dataset;
    delete classifications.no_dataset;
    let keys = Object.keys(classifications);
    if (keys.length > 0) {
      let datatype = keys[0],
        max = classifications[keys[0]];
      for (let i = 1; i < keys.length; i++) {
        if (max < classifications[keys[i]]) {
          max = classifications[keys[i]];
          datatype = keys[i];
        }
      }
      result.datatype = datatype;
      result.cert = max;
    }
    return result;
  },
  // Get the dataType of a given sentence
  'getdataType': function(sentence, done) {
    return $.ajax({
      'cache': false,
      'type': 'POST',
      'url': '../api/dataseer-ml/processDataseerSentence',
      'data': 'text=' + encodeURIComponent(sentence.text()),
      'success': function(data) {
        let result = dataseerML.extractDatatypeFrom(JSON.parse(data));
        return done(null, result);
      },
      'error': function(data) {
        return done(true, data);
      }
    });
  }
};
