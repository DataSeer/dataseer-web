/*
 * @prettier
 */

'use strict';

const createReport = require('docx-templates').default;

const fs = require('fs');
const path = require('path');

const Self = {};

const conf = require('../conf/conf.json');

const DocumentsDatasetsController = require('../controllers/documents.datasets.js');

Self.create = function (data, cb) {
  //Load the docx file as a binary
  return fs.readFile(path.resolve(__dirname, '../conf/reports/report.docx'), 'binary', function (err, content) {
    if (err) return cb(err);
    return createReport({
      template: content,
      data: data
    })
      .then(function (arrayBuffer) {
        return cb(null, Buffer.from(arrayBuffer));
      })
      .catch(function (err) {
        return cb(err);
      });
  });
};

Self.getData = function (doc, dataTypes) {
  let mapping =
    doc.pdf && doc.pdf.metadata && doc.pdf.metadata.mapping
      ? doc.pdf.metadata.mapping.object
      : doc.tei && doc.tei.metadata && doc.tei.metadata.mapping
      ? doc.tei.metadata.mapping.object
      : {};
  let sortSentences = function (a, b) {
    let c = mapping[a.id] ? mapping[a.id] : null,
      d = mapping[b.id] ? mapping[b.id] : null;
    if (c === null && d === null) return 0;
    if (c === null) return 1;
    if (d === null) return -1;
    return c - d;
  };
  let orderedDatasets = doc.datasets.current
    .map(function (item) {
      // sort sentences
      item.sentences = item.sentences.sort(sortSentences);
      return item;
    })
    .sort(function (a, b) {
      let c = a.sentences && a.sentences[0] && a.sentences[0].id ? mapping[a.sentences[0].id] : Infinity;
      let d = b.sentences && b.sentences[0] && b.sentences[0].id ? mapping[b.sentences[0].id] : Infinity;
      return c === d ? 0 : c < d ? -1 : 1;
    })
    .map(function (item, i) {
      let infos = DocumentsDatasetsController.getDataTypeInfos(item, dataTypes, { convertHTML: true });
      return {
        reuse: item.reuse,
        dataType: item.dataType,
        subType: item.subType,
        number: i + 1,
        name: item.name ? item.name : item.id,
        type: `${infos.label}${infos.isCustom ? ' (custom)' : ''}${item.reuse ? ' (reuse)' : ''}`,
        text: item.sentences
          .sort(sortSentences)
          .map(function (item) {
            return item.text;
          })
          .join(' '),
        stableIdentifier: item.DOI
          ? { isLink: 'false', url: item.DOI, label: item.DOI }
          : { isLink: 'false', url: '', label: 'N/A' },
        comments: item.comments ? item.comments : 'N/A',
        suggestedDataAvailabilityStatement: item.DOI
          ? { isLink: 'false', url: item.DOI, label: item.DOI }
          : item.comments
          ? { isLink: 'false', url: '', label: item.comments }
          : { isLink: 'false', url: '', label: 'N/A' },
        description: infos.description,
        bestDataFormatForSharing: infos.bestDataFormatForSharing,
        bestPracticeForIndicatingReUseOfExistingData: infos.bestPracticeForIndicatingReUseOfExistingData,
        mostSuitableRepositories: infos.mostSuitableRepositories
      };
    });
  let protocols = orderedDatasets.filter(function (item) {
    return item.dataType === 'other' && item.subType === 'protocol';
  });
  let codes = orderedDatasets.filter(function (item) {
    return item.dataType === 'other' && item.subType === 'code';
  });
  let reagents = orderedDatasets.filter(function (item) {
    return item.dataType === 'other' && item.subType === 'reagent';
  });
  let datasets = orderedDatasets.filter(function (item) {
    return item.dataType !== 'other';
  });
  return {
    article_title: doc.metadata.article_title,
    DOI: doc.metadata.doi
      ? { isLink: 'true', url: `https://www.doi.org/${doc.metadata.doi}`, label: doc.metadata.doi }
      : { isLink: 'false', url: '', label: 'N/A' },
    submitting_author: doc.metadata.submitting_author ? doc.metadata.submitting_author : 'N/A',
    submitting_author_email: doc.metadata.submitting_author_email ? doc.metadata.submitting_author_email : 'N/A',
    authors: doc.metadata.authors
      .map(function (item) {
        return item.name;
      })
      .join(', '),
    link: {
      isLink: 'true',
      url: `${conf.root}documents/${doc._id}${doc.token ? `?documentToken=${doc.token}` : ''}`,
      label: `URL of this document`
    },
    suggestedDataAvailabilityStatements: protocols.concat(codes, reagents, datasets),
    bestPractices: DocumentsDatasetsController.getBestPractices(
      protocols.concat(codes, reagents, datasets),
      dataTypes,
      { convertHTML: true }
    ).data,
    protocols: protocols,
    codes: codes,
    reagents: reagents,
    datasets: datasets
  };
};

module.exports = Self;
