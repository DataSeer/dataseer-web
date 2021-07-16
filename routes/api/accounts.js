/*
 * @prettier
 */

'use strict';

const express = require(`express`);
const router = express.Router();

const AccountsController = require(`../../controllers/api/accounts.js`);

const AccountsManager = require(`../../lib/accounts.js`);
const Params = require(`../../lib/params.js`);

const conf = require(`../../conf/conf.json`);

/* GET ALL Accounts */
router.get(`/`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: {
      ids: Params.convertToArray(req.query.ids, `string`),
      limit: Params.convertToInteger(req.query.limit),
      skip: Params.convertToInteger(req.query.skip),
      roles: Params.convertToArray(req.query.roles, `string`),
      organizations: Params.convertToArray(req.query.organizations, `string`),
      visibleStates: Params.convertToArray(req.query.visibleStates, `boolean`),
      disabledStates: Params.convertToArray(req.query.disabledStates, `boolean`),
      sort: Params.convertToString(req.query.sort)
    },
    user: req.user
  };
  return AccountsController.all(opts, function (err, result) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    return res.json({ err: false, res: result.data, params: result.params });
  });
});

/* GET SINGLE Account BY ID */
router.get(`/:id`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: { id: req.params.id },
    user: req.user,
    logs: true
  };
  return AccountsController.get(opts, function (err, data) {
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

/* ADD new Account */
router.post(`/`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isModerator) return res.status(401).send(conf.errors.unauthorized);
  if (!Params.checkEmail(req.body.username))
    return res.json({
      err: true,
      res: `Email incorrect! (Incorrect pattern)`
    });
  if (!Params.checkString(req.body.fullname))
    return res.json({
      err: true,
      res: `Fullname is required! (At least one char)`
    });
  if (!Params.checkPassword(req.body.password))
    return res.json({
      err: true,
      res: `Password incorrect! (at least 6 chars required)`
    });
  if (!Params.checkArray(req.body.organizations))
    return res.json({
      err: true,
      res: `You must select at least one organization!`
    });
  if (!Params.checkString(req.body.role))
    return res.json({
      err: true,
      res: `You must select at least one role!`
    });
  let opts = {
    data: {
      username: Params.convertToString(req.body.username),
      fullname: Params.convertToString(req.body.fullname),
      password: Params.convertToString(req.body.password),
      role: Params.convertToString(req.body.role),
      organizations: Params.convertToArray(req.body.organizations),
      visible: Params.convertToBoolean(req.body.visible)
    },
    user: req.user
  };
  return AccountsController.add(opts, function (err, data) {
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

/* UPDATE Account BY ID */
router.put(`/:id`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isStandardUser) return res.status(401).send(conf.errors.unauthorized);
  if (!Params.checkString(req.body.fullname))
    return res.json({
      err: true,
      res: `Fullname is required!`
    });
  if (!Params.checkString(req.body.role))
    return res.json({
      err: true,
      res: `You must select at least one role!`
    });
  if (!Params.checkArray(req.body.organizations)) {
    return res.json({
      err: true,
      res: `You must select at least one organization!`
    });
  }
  let opts = {
    data: {
      id: req.params.id,
      fullname: Params.convertToString(req.body.fullname),
      role: Params.convertToString(req.body.role),
      organizations: Params.convertToArray(req.body.organizations, `string`),
      visible: Params.convertToBoolean(req.body.visible),
      disabled: Params.convertToBoolean(req.body.disabled)
    },
    user: req.user
  };
  return AccountsController.update(opts, function (err, data) {
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

/* UPDATE Accounts */
router.put(`/`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isModerator) return res.status(401).send(conf.errors.unauthorized);
  if (!Params.checkArray(req.body.accounts))
    return res.json({ err: true, res: `You must select at least one account!` });
  if (!Params.checkArray(req.body.organizations))
    return res.json({ err: true, res: `You must select at least one organization!` });
  let opts = {
    data: {
      role: Params.convertToString(req.body.role),
      fullname: Params.convertToString(req.body.fullname),
      accounts: Params.convertToArray(req.body.accounts),
      organizations: Params.convertToArray(req.body.organizations),
      visible: Params.convertToBoolean(req.body.visible),
      disabled: Params.convertToBoolean(req.body.disabled)
    },
    user: req.user
  };
  return AccountsController.updateMany(opts, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = data instanceof Error;
    let result = isError ? data.toString() : data;
    return res.json({ err: isError, res: result });
  });
});

/* DELETE Account BY ID */
router.delete(`/:id`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isStandardUser) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: {
      id: req.params.id
    },
    user: req.user
  };
  return AccountsController.delete(opts, function (err, data) {
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

/* DELETE Accounts */
router.delete(`/`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isModerator) return res.status(401).send(conf.errors.unauthorized);
  if (!Params.checkArray(req.body.accounts))
    return res.json({ err: true, res: `You must select at least one account!` });
  let opts = {
    data: {
      accounts: Params.convertToArray(req.body.accounts, `string`)
    },
    user: req.user
  };
  return AccountsController.deleteMany(opts, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = data instanceof Error;
    let result = isError ? data.toString() : data;
    return res.json({ err: isError, res: result });
  });
});

module.exports = router;
