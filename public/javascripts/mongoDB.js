// API Interface Object
const MongoDB = {
  // Get the current object
  'getCurrentDocument': function(done) {
    let currentId = $(document.getElementById('document.id')).attr('value');
    $.get('../api/documents/' + currentId, function(data) {
      done(data);
    });
  },
  // Update a gicen document
  'updateDocument': function(doc, done) {
    $.ajax({
      type: 'PUT',
      contentType: 'application/json; charset=utf-8',
      headers: {
        'X-HTTP-Method-Override': 'PUT'
      },
      url: '../api/documents/' + doc._id,
      data: JSON.stringify(doc),
      complete: function(data) { 'updateDocument complete' },
      success: function(data) { done(null, data); },
      error: function(data) { done(true, data); },
      dataType: 'json'
    });
  },
  // Get the previous status of current document object
  getPreviousStatus: function(doc) {
    let result = doc.status;
    if (doc.status === "finish") result = "datasets";
    else if (doc.status === "datasets") result = "metadata";
    return result;
  },
  // Get the next status of current document object
  getNextStatus: function(doc) {
    let result = doc.status;
    if (doc.status === "metadata") result = "datasets";
    else if (doc.status === "datasets") result = "finish";
    return result;
  }
};