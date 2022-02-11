/*
 * @prettier
 */

'use strict';

const express = require(`express`);
const router = express.Router();

const OrganizationsController = require(`../../controllers/api/organizations.js`);
const OrganizationsLogsController = require(`../../controllers/api/organizations.logs.js`);

const AccountsManager = require(`../../lib/accounts.js`);
const Params = require(`../../lib/params.js`);

const conf = require(`../../conf/conf.json`);

/* GET Organizations */
router.get(`/`, function (req, res, next) {
  // This route is public
  let opts = {
    data: {
      ids: Params.convertToArray(req.query.ids, `string`),
      limit: Params.convertToInteger(req.query.limit),
      skip: Params.convertToInteger(req.query.skip),
      visibleStates: Params.convertToArray(req.query.visibleStates, `boolean`),
      sort: Params.convertToString(req.query.sort)
    },
    user: req.user
  };
  return OrganizationsController.all(opts, function (err, result) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    return res.json({ err: false, res: result.data, params: result.params });
  });
});

/* ADD Organization */
router.post(`/`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  if (!Params.checkString(req.body.name))
    return res.json({
      err: true,
      res: `Organization name is required!`
    });
  let opts = {
    data: {
      name: Params.convertToString(req.body.name),
      color: Params.convertToString(req.body.color),
      visible: Params.convertToBoolean(req.body.visible)
    },
    user: req.user
  };
  return OrganizationsController.add(opts, function (err, data) {
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

/* UPDATE Organizations */
router.put(`/`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isModerator) return res.status(401).send(conf.errors.unauthorized);
  if (!Params.checkArray(req.body.ids))
    return res.json({
      err: true,
      res: `You must select at least one organization!`
    });
  let opts = {
    data: {
      ids: Params.convertToArray(req.body.ids, `string`),
      color: Params.convertToString(req.body.color),
      visible: Params.convertToBoolean(req.body.visible)
    },
    user: req.user
  };
  return OrganizationsController.updateMany(opts, function (err, data) {
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

/* DELETE Organizations */
router.delete(`/`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  if (!Params.checkArray(req.body.ids))
    return res.json({
      err: true,
      res: `You must select at least one organization!`
    });
  let opts = {
    data: {
      ids: Params.convertToArray(req.body.ids, `string`)
    },
    user: req.user
  };
  return OrganizationsController.deleteMany(opts, function (err, data) {
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

/* GET Organization BY ID */
router.get(`/:id`, function (req, res, next) {
  // This route is public
  let opts = {
    data: { id: req.params.id },
    user: req.user,
    logs: true
  };
  return OrganizationsController.get(opts, function (err, data) {
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

/* UPDATE Organization BY ID */
router.put(`/:id`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isModerator) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: {
      id: req.params.id,
      name: Params.convertToString(req.body.name),
      color: Params.convertToString(req.body.color),
      visible: Params.convertToBoolean(req.body.visible)
    },
    user: req.user
  };
  return OrganizationsController.update(opts, function (err, data) {
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

/* DELETE Organization BY ID */
router.delete(`/:id`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: {
      id: req.params.id
    },
    user: req.user
  };
  return OrganizationsController.delete(opts, function (err, data) {
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
