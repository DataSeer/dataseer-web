/*
 * @prettier
 */
'use strict';

const PdfManager = {
  linkDatasetToSentence: function (doc, sentenceid, id) {
    let ids = doc.pdf.metadata.sentences.mapping[sentenceid];
    for (let i = 0; i < ids.length; i++) {
      doc.pdf.metadata.sentences.chunks[ids[i]].datasetid = id;
    }
  },
  unlinkDatasetToSentence: function (doc, sentenceid) {
    let ids = doc.pdf.metadata.sentences.mapping[sentenceid];
    for (let i = 0; i < ids.length; i++) {
      doc.pdf.metadata.sentences.chunks[ids[i]].datasetid = undefined;
    }
  }
};
