/*
 * @prettier
 */

'use strict';

const express = require(`express`);
const router = express.Router();
const fs = require(`fs`);
const path = require(`path`);

const AccountsManager = require(`../../lib/accounts.js`);
const Params = require(`../../lib/params.js`);
const DataTypes = require(`../../lib/dataTypes.js`);

const DocumentsController = require(`../../controllers/api/documents.js`);

const conf = require(`../../conf/conf.json`);

/* GET Documents */
router.get(`/documents`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isStandardUser) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: {
      ids: Params.convertToArray(req.query.ids, `string`),
      limit: Params.convertToInteger(req.query.limit),
      skip: Params.convertToInteger(req.query.skip),
      roles: Params.convertToArray(req.query.roles, `string`),
      owners: Params.convertToArray(req.query.owners, `string`),
      organizations: Params.convertToArray(req.query.organizations, `string`),
      visibleStates: Params.convertToArray(req.query.visibleStates, `boolean`),
      lockedStates: Params.convertToArray(req.query.lockedStates, `boolean`),
      uploadRange: Params.convertToInteger(req.query.uploadRange),
      updateRange: Params.convertToInteger(req.query.updateRange),
      updatedBefore: Params.convertToDate(req.query.updatedBefore),
      updatedAfter: Params.convertToDate(req.query.updatedAfter),
      uploadedBefore: Params.convertToDate(req.query.uploadedBefore),
      uploadedAfter: Params.convertToDate(req.query.uploadedAfter),
      sort: Params.convertToString(req.query.sort),
      metadata: true
    },
    user: req.user
  };
  return DocumentsController.all(opts, function (err, result) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    return res.json({
      err: false,
      res: result.data.map(function (item) {
        return {
          _id: item._id.toString(),
          doi: item.metadata.doi,
          title: item.metadata.article_title,
          uploaded_at: item.upload.date.toLocaleDateString(),
          updated_at: item.updatedAt.toLocaleDateString(),
          status: item.status === `finish` ? `processed` : `processing`
        };
      }),
      params: result.params
    });
  });
});

/* GET SINGLE Document BY ID */
router.get(`/documents/:id`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isStandardUser) return res.status(401).send(conf.errors.unauthorized);
  // Init transaction
  let opts = {
    data: {
      id: req.params.id,
      metadata: true,
      datasets: true
    },
    user: req.user,
    logs: false
  };
  return DocumentsController.get(opts, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = data instanceof Error;
    let result = isError ? data.toString() : data;
    if (typeof data.datasets === `undefined` || !Array.isArray(data.datasets.current))
      return res.json({
        err: true,
        res: `Datasets not found`
      });
    let datasets = data.datasets.current.map(function (dataset) {
      let infos = DataTypes.getDataTypeInfos(dataset, req.app.get(`dataTypes`));
      return {
        id: dataset.id,
        name: dataset.name,
        reuse: dataset.reuse,
        type: { name: infos.label, url: infos.url },
        validated: dataset.status === `valid`
      };
    });
    return res.json({
      err: isError,
      res: {
        _id: data._id.toString(),
        doi: data.metadata.doi,
        title: data.metadata.article_title,
        uploaded_at: data.upload.date.toLocaleDateString(),
        updated_at: data.updatedAt.toLocaleDateString(),
        datasets: datasets,
        status: data.status === `finish` ? `processed` : `processing`
      }
    });
  });
});

module.exports = router;
