/*
 * @prettier
 */

'use strict';

const express = require(`express`);
const router = express.Router();
const fs = require(`fs`);
const path = require(`path`);

const AccountsManager = require(`../../lib/accounts.js`);
const Mailer = require(`../../lib/mailer.js`);
const Params = require(`../../lib/params.js`);
const DocX = require(`../../lib/docx.js`);
const Url = require(`../../lib/url.js`);

const DocumentsFilesController = require(`../../controllers/api/documents.files.js`);
const DocumentsController = require(`../../controllers/api/documents.js`);

const conf = require(`../../conf/conf.json`);

/* GET Documents */
router.get(`/`, function (req, res, next) {
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
      pdf: Params.convertToBoolean(req.query.pdf),
      tei: Params.convertToBoolean(req.query.tei),
      files: Params.convertToBoolean(req.query.files),
      metadata: Params.convertToBoolean(req.query.metadata),
      datasets: Params.convertToBoolean(req.query.datasets)
    },
    user: req.user
  };
  return DocumentsController.all(opts, function (err, result) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    return res.json({ err: false, res: result.data, params: result.params });
  });
});

/* ADD Document */
router.post(`/`, function (req, res, next) {
  return DocumentsController.upload(
    {
      data: Object.assign({ files: req.files }, req.body),
      user: req.user,
      privateKey: req.app.get(`private.key`),
      dataTypes: req.app.get(`dataTypes`),
      mute: Params.convertToBoolean(req.body.mute),
      dataseerML: Params.convertToBoolean(req.body.dataseerML)
    },
    function (err, data) {
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
    }
  );
});

/* UPDATE  */
router.put(`/`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isStandardUser) return res.status(401).send(conf.errors.unauthorized);
  if (!Params.checkString(req.body.owner))
    return res.json({
      err: true,
      res: `You must select an owner!`
    });
  if (!Params.checkArray(req.body.organizations))
    return res.json({ err: true, res: `You must select at least one organization!` });
  if (!Params.checkArray(req.body.ids)) return res.json({ err: true, res: `You must select at least on document!` });
  let opts = {
    data: {
      ids: Params.convertToArray(req.body.ids, `string`),
      owner: Params.convertToString(req.body.owner),
      organizations: Params.convertToArray(req.body.organizations, `string`),
      name: Params.convertToString(req.body.name),
      visible: Params.convertToBoolean(req.body.visible),
      locked: Params.convertToBoolean(req.body.locked)
    },
    user: req.user
  };
  return DocumentsController.updateMany(opts, function (err, data) {
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

/* DELETE Documents */
router.delete(`/`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  if (!Params.checkArray(req.body.ids))
    return res.json({
      err: true,
      res: `You must select at least one document!`
    });
  let opts = {
    data: {
      ids: Params.convertToArray(req.body.ids, `string`)
    },
    user: req.user
  };
  return DocumentsController.deleteMany(opts, function (err, data) {
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

/* GET SINGLE Document BY ID */
router.get(`/:id`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  // Init transaction
  let opts = {
    data: {
      id: req.params.id,
      pdf: Params.convertToBoolean(req.query.pdf),
      tei: Params.convertToBoolean(req.query.tei),
      files: Params.convertToBoolean(req.query.files),
      metadata: Params.convertToBoolean(req.query.metadata),
      datasets: Params.convertToBoolean(req.query.datasets)
    },
    user: req.user,
    logs: true
  };
  return DocumentsController.get(opts, function (err, data) {
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

/* UPDATE Document BY ID */
router.put(`/:id`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isStandardUser) return res.status(401).send(conf.errors.unauthorized);
  if (!Params.checkString(req.body.owner))
    return res.json({
      err: true,
      res: `You must select at least one owner!`
    });
  if (!Params.checkArray(req.body.organizations))
    return res.json({
      err: true,
      res: `You must select at least one organization!`
    });
  let opts = {
    data: {
      id: req.params.id,
      name: Params.convertToString(req.body.name),
      owner: Params.convertToString(req.body.owner),
      organizations: Params.convertToArray(req.body.organizations, `string`),
      visible: Params.convertToBoolean(req.body.visible),
      locked: Params.convertToBoolean(req.body.locked),
      metadata: Params.convertToBoolean(req.body.metadata),
      datasets: Params.convertToBoolean(req.body.datasets),
      pdf: Params.convertToBoolean(req.body.pdf),
      tei: Params.convertToBoolean(req.body.tei),
      files: Params.convertToBoolean(req.body.files)
    },
    user: req.user
  };
  return DocumentsController.update(opts, function (err, data) {
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

/* DELETE SINGLE Document BY ID */
router.delete(`/:id`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isStandardUser) return res.status(401).send(conf.errors.unauthorized);
  if (accessRights.isAdministrator)
    return DocumentsController.delete({ data: { id: req.params.id }, user: req.user }, function (err, data) {
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
  else
    return DocumentsController.update(
      { data: { id: req.params.id, visible: false, locked: true }, user: req.user },
      function (err, data) {
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
      }
    );
});

/* PUT datasets */
router.put(`/:id/datasets`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  // Init transaction
  let opts = {
    data: { id: req.params.id, datasets: req.body.datasets },
    user: req.user
  };
  return DocumentsController.updateDatasets(opts, function (err, data) {
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

/* GET SINGLE Document logs BY ID */
router.get(`/:id/logs`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  // Init transaction
  let opts = {
    data: { id: req.params.id },
    user: req.user
  };
  return DocumentsController.getLogs(opts, function (err, data) {
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

/* GET files of document */
router.get(`/:id/files`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  // Init transaction
  let opts = {
    data: {
      id: req.params.id,
      files: true
    },
    user: req.user
  };
  return DocumentsController.get(opts, function (err, doc) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    if (!doc) return res.json({ err: true, res: null, msg: `document not found` });
    return res.json({ err: false, res: doc.files });
  });
});

/* GET Software file of document */
router.get(`/:id/software`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: {
      id: req.params.id
    },
    user: req.user
  };
  return DocumentsController.get(opts, function (err, doc) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    if (!doc) return res.json({ err: true, res: null, msg: `document not found` });
    return DocumentsFilesController.get({ data: { id: doc.software.toString() } }, function (err, file) {
      if (err) {
        console.log(err);
        return res.status(500).send(conf.errors.internalServerError);
      }
      if (!file) return res.json({ err: true, res: null, msg: `file not found` });
      return res.json({ err: false, res: file });
    });
  });
});

/* GET Software file content of document */
router.get(`/:id/software/content`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: {
      id: req.params.id
    },
    user: req.user
  };
  return DocumentsController.get(opts, function (err, doc) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    if (!doc) return res.json({ err: true, res: null, msg: `document not found` });
    return DocumentsFilesController.readFile(
      { data: { id: doc.software ? doc.software.toString() : undefined } },
      function (err, file) {
        if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
        if (!file) return res.json({ 'err': true, 'res': null, 'msg': `file not found` });
        res.setHeader(`Content-Type`, file.mimetype);
        return res.send(file.data);
      }
    );
  });
});

/* GET PDF of document */
router.get(`/:id/pdf`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: {
      id: req.params.id
    },
    user: req.user
  };
  return DocumentsController.get(opts, function (err, doc) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    if (!doc) return res.json({ err: true, res: null, msg: `document not found` });
    return DocumentsFilesController.get(
      { data: { id: doc.pdf ? doc.pdf.toString() : undefined } },
      function (err, file) {
        if (err) {
          console.log(err);
          return res.status(500).send(conf.errors.internalServerError);
        }
        if (!file) return res.json({ err: true, res: null, msg: `file not found` });
        return res.json({ err: false, res: file });
      }
    );
  });
});

/* GET PDF of document */
router.get(`/:id/pdf/content`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: {
      id: req.params.id
    },
    user: req.user
  };
  return DocumentsController.get(opts, function (err, doc) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    if (!doc) return res.json({ err: true, res: null, msg: `document not found` });
    return DocumentsFilesController.readFile(
      { data: { id: doc.pdf ? doc.pdf.toString() : undefined } },
      function (err, file) {
        if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
        if (!file) return res.json({ 'err': true, 'res': null, 'msg': `file not found` });
        res.setHeader(`Content-Type`, file.mimetype);
        return res.send(file.data);
      }
    );
  });
});

/* GET TEI of document */
router.get(`/:id/tei/`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: {
      id: req.params.id
    },
    user: req.user
  };
  return DocumentsController.get(opts, function (err, doc) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    if (!doc) return res.json({ err: true, res: null, msg: `document not found` });
    return DocumentsFilesController.get(
      { data: { id: doc.tei ? doc.tei.toString() : undefined } },
      function (err, file) {
        if (err) {
          console.log(err);
          return res.status(500).send(conf.errors.internalServerError);
        }
        if (!file) return res.json({ err: true, res: null, msg: `file not found` });
        return res.json({ err: false, res: file });
      }
    );
  });
});

/* GET TEI of document */
router.get(`/:id/tei/content`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: {
      id: req.params.id
    },
    user: req.user
  };
  return DocumentsController.get(opts, function (err, doc) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    if (!doc) return res.json({ err: true, res: null, msg: `document not found` });
    return DocumentsFilesController.readFile(
      { data: { id: doc.tei ? doc.tei.toString() : undefined } },
      function (err, file) {
        if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
        if (!file) return res.json({ 'err': true, 'res': null, 'msg': `file not found` });
        res.setHeader(`Content-Type`, file.mimetype);
        return res.send(file.data);
      }
    );
  });
});

/* GET SINGLE Document hypothesis/bioRxiv BY ID */
router.get(`/:id/hypothesis/bioRxiv`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  // Init transaction
  let opts = {
    data: { id: req.params.id, kind: `html`, organization: `bioRxiv`, dataTypes: req.app.get(`dataTypes`) },
    user: req.user
  };
  return DocumentsController.getReportData(opts, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = data instanceof Error;
    let result = isError ? data.toString() : data;
    if (isError) return res.status(404).send(conf.errors.notFound);
    return res.render(`hypothesis/bioRxiv.pug`, {
      publicURL: `${Url.build(`/documents/${req.params.id}`, { token: data.doc.token })}`,
      reportData: data,
      currentUser: req.user,
      conf: conf
    });
  });
});

/* GET SINGLE Document reports/ BY ID */
router.get(`/:id/reports/html/bioRxiv`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  // Init transaction
  let opts = {
    data: { id: req.params.id, kind: `html`, organization: `bioRxiv`, dataTypes: req.app.get(`dataTypes`) },
    user: req.user
  };
  return DocumentsController.getReportData(opts, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = data instanceof Error;
    let result = isError ? data.toString() : data;
    if (isError) return res.status(404).send(conf.errors.notFound);
    return res.render(`reports/html/bioRxiv.pug`, {
      reportData: data,
      currentUser: req.user,
      conf: conf
    });
  });
});

/* GET SINGLE Document reports/ BY ID */
router.get(`/:id/reports/html/default`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  // Init transaction
  let opts = {
    data: { id: req.params.id, kind: `html`, organization: `default`, dataTypes: req.app.get(`dataTypes`) },
    user: req.user
  };
  return DocumentsController.getReportData(opts, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = data instanceof Error;
    let result = isError ? data.toString() : data;
    if (isError) return res.status(404).send(conf.errors.notFound);
    return res.render(`reports/html/default.pug`, {
      links: {
        publicURL: `${Url.build(`/documents/${req.params.id}`, { token: data.doc.token })}`,
        TEI: `${Url.build(`/documents/${req.params.id}/tei/content`, { token: data.doc.token })}`,
        PDF: `${Url.build(`/documents/${req.params.id}/pdf/content`, { token: data.doc.token })}`
      },
      reportData: data,
      currentUser: req.user,
      conf: conf
    });
  });
});

/* GET SINGLE Document reports/ BY ID */
router.get(`/:id/reports/docx/default`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  // Init transaction
  let opts = {
    data: { id: req.params.id, kind: `docx`, organization: `default`, dataTypes: req.app.get(`dataTypes`) },
    user: req.user
  };
  return DocumentsController.getReportData(opts, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = data instanceof Error;
    let result = isError ? data.toString() : data;
    if (isError) return res.status(404).send(conf.errors.notFound);
    return DocX.create(
      {
        path: path.resolve(__dirname, `../../views/reports/docx/default.docx`),
        data: result
      },
      function (err, buffer) {
        if (err) return res.json({ 'err': true, 'res': null, 'msg': err instanceof Error ? err.toString() : err });
        res.writeHead(200, [
          [`Content-Type`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`],
          [`Content-Disposition`, `attachment; filename=` + `${req.params.id}-report.docx`]
        ]);
        res.end(buffer);
      }
    );
  });
});

/* Validate metadta of a given document */
router.post(`/:id/refreshToken`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user, AccountsManager.match.all);
  if (!accessRights.authenticated || accessRights.isVisitor || accessRights.isStandardUser)
    return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: {
      id: req.params.id
    },
    user: req.user,
    privateKey: req.app.get(`private.key`)
  };
  return DocumentsController.refreshToken(opts, function (err, data) {
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

/* Reload metadta of a given document */
router.post(`/:id/metadata/reload`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: {
      id: req.params.id
    },
    user: req.user
  };
  return DocumentsController.updateOrCreateMetadata(opts, function (err, data) {
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

/* Validate metadta of a given document */
router.post(`/:id/metadata/validate`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: {
      id: req.params.id
    },
    user: req.user
  };
  return DocumentsController.validateMetadata(opts, function (err, data) {
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

/* Validate datasets of a given document */
router.post(`/:id/datasets/validate`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: {
      id: req.params.id
    },
    user: req.user
  };
  return DocumentsController.validateDatasets(opts, function (err, data) {
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

/* Back to Metadata for a given document */
router.post(`/:id/datasets/backToMetadata`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: {
      id: req.params.id
    },
    user: req.user
  };
  return DocumentsController.backToMetadata(opts, function (err, data) {
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

/* Validate datasets of a given document */
router.post(`/:id/finish/reopen`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: {
      id: req.params.id
    },
    user: req.user
  };
  return DocumentsController.reopen(opts, function (err, data) {
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
