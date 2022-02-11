/*
 * @prettier
 */

'use strict';

const express = require(`express`);
const router = express.Router();

const RolesController = require(`../../controllers/api/roles.js`);
const RolesControllerLogs = require(`../../controllers/api/roles.logs.js`);

const AccountsManager = require(`../../lib/accounts.js`);
const CrudManager = require(`../../lib/crud.js`);
const Params = require(`../../lib/params.js`);

const conf = require(`../../conf/conf.json`);

/* GET Roles */
router.get(`/`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user, AccountsManager.match.all);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: {
      ids: Params.convertToArray(req.query.ids, `string`),
      limit: Params.convertToInteger(req.query.limit),
      skip: Params.convertToInteger(req.query.skip),
      sort: Params.convertToString(req.query.sort)
    },
    user: req.user
  };
  return RolesController.all(opts, function (err, result) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    return res.json({ err: false, res: result.data, params: result.params });
  });
});

/* ADD Role */
router.post(`/`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user, AccountsManager.match.all);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  if (!Params.checkString(req.body.label))
    return res.json({
      err: true,
      res: `Label is required!`
    });
  if (!Params.checkString(req.body.key))
    return res.json({
      err: true,
      res: `Key is required!`
    });
  if (!Params.checkString(req.body.weight))
    return res.json({
      err: true,
      res: `Weight is required!`
    });
  let opts = {
    data: {
      label: Params.convertToString(req.body.label),
      key: Params.convertToString(req.body.key),
      color: Params.convertToString(req.body.color),
      weight: Params.convertToInteger(req.body.weight)
    },
    user: req.user
  };
  return RolesController.add(opts, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = data instanceof Error;
    let result = isError ? data.toString() : data;
    return res.json({
      err: isError,
      res: result
    });
  });
});

/* UPDATE Roles */
router.put(`/`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user, AccountsManager.match.all);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  if (!Params.checkArray(req.body.ids))
    return res.json({
      err: true,
      res: `You must select at least one role!`
    });
  let opts = {
    data: {
      ids: Params.convertToArray(req.body.ids, `string`),
      label: Params.convertToString(req.body.label),
      color: Params.convertToString(req.body.color),
      weight: Params.convertToInteger(req.body.weight)
    },
    user: req.user
  };
  return RolesController.updateMany(opts, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = data instanceof Error;
    let result = isError ? data.toString() : data;
    return res.json({
      err: isError,
      res: result
    });
  });
});

/* DELETE roles */
router.delete(`/`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user, AccountsManager.match.all);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  if (!Params.checkArray(req.body.ids))
    return res.json({
      err: true,
      res: `You must select at least one role!`
    });
  let opts = {
    data: {
      ids: req.body.ids
    },
    user: req.user
  };
  return RolesController.deleteMany(opts, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = data instanceof Error;
    let result = isError ? data.toString() : data;
    return res.json({
      err: isError,
      res: result
    });
  });
});

/* GET Role BY ID */
router.get(`/:id`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user, AccountsManager.match.all);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: { id: req.params.id },
    user: req.user,
    logs: true
  };
  return RolesController.get(opts, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = data instanceof Error;
    let result = isError ? data.toString() : data;
    return res.json({
      err: isError,
      res: result
    });
  });
});

/* UPDATE Role BY ID */
router.put(`/:id`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user, AccountsManager.match.all);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: {
      id: req.params.id,
      label: Params.convertToString(req.body.label),
      color: Params.convertToString(req.body.color),
      weight: Params.convertToInteger(req.body.weight)
    },
    user: req.user
  };
  return RolesController.update(opts, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = data instanceof Error;
    let result = isError ? data.toString() : data;
    return res.json({
      err: isError,
      res: result
    });
  });
});

/* DELETE role BY ID */
router.delete(`/:id`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user, AccountsManager.match.all);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: {
      id: req.params.id
    },
    user: req.user
  };
  return RolesController.delete(opts, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = data instanceof Error;
    let result = isError ? data.toString() : data;
    return res.json({
      err: isError,
      res: result
    });
  });
});

module.exports = router;
