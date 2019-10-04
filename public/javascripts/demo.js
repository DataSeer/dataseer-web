/*
 * @prettier
 */

(function($) {
  // Get the current Object
  return MongoDB.getCurrentDocument(function(currentDocument) {
    // On metadata_validation click
    $('#demo_previous_step').click(function() {
      return MongoDB.getCurrentDocument(function(currentDocument) {
        currentDocument.status = MongoDB.getPreviousStatus(currentDocument);
        MongoDB.updateDocument(currentDocument, function(err, res) {
          console.log(err, res);
          if (err) return err; // Need to define error behavior
          return location.reload();
        });
      });
    });

    if (currentDocument.status === 'finish') {
      // On metadata_validation click
      $('#demo_switch_view').click(function() {
        return MongoDB.getCurrentDocument(function(currentDocument) {
          currentDocument.isDataSeer = !currentDocument.isDataSeer;
          MongoDB.updateDocument(currentDocument, function(err, res) {
            console.log(err, res);
            if (err) return err; // Need to define error behavior
            return location.reload();
          });
        });
      });
    }

    // On metadata_validation click
    $('#demo_next_step').click(function() {
      return MongoDB.getCurrentDocument(function(currentDocument) {
        currentDocument.status = MongoDB.getNextStatus(currentDocument);
        MongoDB.updateDocument(currentDocument, function(err, res) {
          console.log(err, res);
          if (err) return err; // Need to define error behavior
          return location.reload();
        });
      });
    });
  });
})(jQuery);
