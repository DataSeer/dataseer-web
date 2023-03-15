/*
 * @prettier
 */

'use strict';

const express = require(`express`);
const router = express.Router();
const path = require(`path`);

const AccountsManager = require(`../../lib/accounts.js`);
const Mailer = require(`../../lib/mailer.js`);
const Params = require(`../../lib/params.js`);
const DocX = require(`../../lib/docx.js`);
const Url = require(`../../lib/url.js`);
const Charts = require(`../../lib/charts.js`);

const DocumentsFilesController = require(`../../controllers/api/documents.files.js`);
const DocumentsController = require(`../../controllers/api/documents.js`);

const conf = require(`../../conf/conf.json`);

/* GET Documents */
router.get(`/`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isStandardUser) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: {
      filter: Params.convertToString(req.query.filter),
      filterFields: Params.convertToArray(req.query.filterFields, `string`),
      count: Params.convertToBoolean(req.query.count),
      ids: Params.convertToArray(req.query.ids, `string`),
      limit: Params.convertToInteger(req.query.limit),
      skip: Params.convertToInteger(req.query.skip),
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
    return res.json({ err: false, res: result.data, params: result.params, count: result.count });
  });
});

/* GET Documents */
router.get(`/csv`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isModerator) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    data: {
      filter: Params.convertToString(req.query.filter),
      filterFields: Params.convertToArray(req.query.filterFields, `string`),
      limit: Params.convertToInteger(req.query.limit),
      ids: Params.convertToArray(req.query.ids, `string`),
      skip: Params.convertToInteger(req.query.skip),
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
      datasets: true
    },
    user: req.user
  };
  return DocumentsController.all(opts, function (err, result) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    res.writeHead(200, [
      [`Content-Type`, `text/csv`],
      [`Content-Disposition`, `attachment; filename=datasets.csv`]
    ]);
    res.end(DocumentsController.buildDatasetsCSV(result.data));
  });
});

/* ADD Document */
router.post(`/`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isModerator) return res.status(401).send(conf.errors.unauthorized);
  return DocumentsController.upload(
    {
      data: Object.assign({ files: req.files }, req.body),
      user: req.user,
      privateKey: req.app.get(`private.key`),
      dataTypes: req.app.get(`dataTypes`),
      mute: Params.convertToBoolean(req.body.mute),
      dataseerML: Params.convertToBoolean(req.body.dataseerML),
      mergePDFs: Params.convertToBoolean(req.body.mergePDFs),
      removeResponseToViewerSection: Params.convertToBoolean(req.body.removeResponseToViewerSection)
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

/* GET check documents token */
router.get(`/checkTokenValidity`, function (req, res, next) {
  let privateKey = req.app.get(`private.key`);
  if (!privateKey) return res.status(500).send(conf.errors.internalServerError);
  let token = Params.convertToString(req.query.token);
  if (!token)
    return res.json({
      err: true,
      res: `Missing required data : token`
    });
  return DocumentsController.checkTokenValidity(
    {
      token: token,
      key: `token`
    },
    { privateKey: privateKey },
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
      urls: typeof req.body.urls === `object` ? req.body.urls : undefined,
      organizations: Params.convertToArray(req.body.organizations, `string`),
      visible: Params.convertToBoolean(req.body.visible),
      locked: Params.convertToBoolean(req.body.locked)
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

/* POST datasets */
router.post(`/:id/refreshDatasets`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  // Init transaction
  let opts = {
    data: { id: req.params.id },
    user: req.user
  };
  return DocumentsController.refreshDatasets(opts, function (err, data) {
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

/* POST datasets */
router.post(`/refreshAllDataObjects`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  // Init transaction
  let opts = {
    user: req.user
  };
  return DocumentsController.refreshAllDataObjects(opts, function (err, data) {
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

/* POST datasets */
router.post(`/refreshAllDataObjectsIndexes`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  // Init transaction
  let opts = {
    user: req.user
  };
  return DocumentsController.refreshAllDataObjectsIndexes(opts, function (err, data) {
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

/* POST fixTEIContent */
router.post(`/:id/fixTEIContent`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isModerator) return res.status(401).send(conf.errors.unauthorized);
  // Init transaction
  let opts = {
    documentId: req.params.id,
    user: req.user
  };
  return DocumentsController.fixTEIContent(opts, function (err, data) {
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

/* POST importDatasets */
router.post(`/:target/importDatasets/:source`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  // Init transaction
  let opts = {
    data: {
      target: req.params.target,
      source: req.params.source
    },
    user: req.user
  };
  return DocumentsController.importDatasets(opts, function (err, data) {
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

/* POST checkSentencesBoundingBoxes */
router.post(`/:id/checkSentencesBoundingBoxes`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  // Init transaction
  let opts = {
    data: {
      id: req.params.id,
      xml: { source: req.body.source, content: req.files.xml.data.toString() }
    },
    user: req.user
  };
  return DocumentsController.checkSentencesBoundingBoxes(opts, function (err, data) {
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

/* Add file */
router.post(`/:id/files`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isStandardUser) return res.status(401).send(conf.errors.unauthorized);
  return DocumentsController.get(
    {
      data: {
        id: req.params.id
      },
      user: req.user
    },
    function (err, doc) {
      if (err) {
        console.log(err);
        return res.status(500).send(conf.errors.internalServerError);
      }
      if (!doc) return res.json({ err: true, res: null, msg: `document not found` });
      if (!Params.checkObject(req.files) || !Params.checkObject(req.files.file))
        return res.json({
          err: true,
          res: `You must select a file`
        });
      return DocumentsFilesController.upload(
        {
          data: {
            accountId: req.user._id.toString(),
            organizations: doc.organizations.map(function (item) {
              return item._id;
            }),
            documentId: Params.convertToString(req.params.id),
            file: req.files.file
          },
          user: req.user
        },
        function (err, file) {
          if (err) {
            console.log(err);
            return res.status(500).send(conf.errors.internalServerError);
          }
          let isError = file instanceof Error;
          let result = isError ? file.toString() : file;
          if (isError)
            return res.json({
              err: isError,
              res: result
            });
          doc.files.push(file._id.toString());
          return doc.save(function (err) {
            if (err)
              return res.json({
                err: true,
                res: `File uploaded but not linked to this document`
              });
            return res.json({
              err: false,
              res: result
            });
          });
        }
      );
    }
  );
});

/* Remove file */
router.delete(`/:id/files/:fileId`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isStandardUser) return res.status(401).send(conf.errors.unauthorized);
  let fileId = req.params.fileId;
  if (fileId.length <= 0) return res.json({ err: true, res: null, msg: `you must provide a fileId` });
  return DocumentsController.get(
    {
      data: {
        id: req.params.id
      },
      user: req.user
    },
    function (err, doc) {
      if (err) {
        console.log(err);
        return res.status(500).send(conf.errors.internalServerError);
      }
      if (!doc) return res.json({ err: true, res: null, msg: `document not found` });
      if (doc.files.indexOf(fileId) < 0)
        return res.json({ err: true, res: null, msg: `file not found in this document` });
      if (doc.pdf === fileId)
        return res.json({ err: true, res: null, msg: `this file is used as PDF and can't be deleted` });
      if (doc.tei === fileId)
        return res.json({ err: true, res: null, msg: `this file is used as TEI and can't be deleted` });
      return DocumentsFilesController.deleteFile(fileId, function (err) {
        if (err) {
          console.log(err);
          return res.status(500).send(conf.errors.internalServerError);
        }
        const index = doc.files.indexOf(fileId);
        if (index < 0)
          return res.json({
            err: true,
            res: `File not found in this document`
          });
        doc.files.splice(index, 1); // 2nd parameter means remove one item only
        return doc.save(function (err) {
          if (err)
            return res.json({
              err: true,
              res: `File deleted but not unlinked to this document`
            });
          return res.json({
            err: false,
            res: true
          });
        });
      });
    }
  );
});

/* GET Software file of document */
router.get(`/:id/softcite`, function (req, res, next) {
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
    if (!doc.softcite) return res.json({ err: true, res: null, msg: `softcite file not found` });
    return DocumentsFilesController.get(
      { data: { id: doc.softcite ? doc.softcite.toString() : undefined } },
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

/* GET Software file content of document */
router.get(`/:id/softcite/content`, function (req, res, next) {
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
    if (!doc.softcite) return res.json({ err: true, res: null, msg: `softcite file content not found` });
    return DocumentsFilesController.readFile(
      { data: { id: doc.softcite ? doc.softcite.toString() : undefined } },
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
    if (!doc.pdf) return res.json({ err: true, res: null, msg: `PDF file not found` });
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
    if (!doc.pdf) return res.json({ err: true, res: null, msg: `PDF file content not found` });
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
router.get(`/:id/tei`, function (req, res, next) {
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
    if (!doc.tei) return res.json({ err: true, res: null, msg: `TEI file not found` });
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
    if (!doc.tei) return res.json({ err: true, res: null, msg: `TEI file content not found` });
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

/* Update file content BY ID */
router.put(`/:id/tei/content`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator) return res.status(401).send(conf.errors.unauthorized);
  if (!Params.checkObject(req.files) || !Params.checkObject(req.files.file))
    return res.json({
      err: true,
      res: `You must select a file`
    });
  if (!Buffer.isBuffer(req.files.file.data))
    return res.json({
      err: true,
      res: `Bad file content`
    });
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
    let id = doc.tei ? doc.tei.toString() : undefined;
    if (typeof id === `undefined`)
      return res.json({
        err: true,
        res: `TEI file not found`
      });
    let data = req.files.file.data.toString(DocumentsFilesController.encoding); // Convert buffer to string (do not use Params.convertToString())
    return DocumentsFilesController.rewriteFile(id, data, function (err, file) {
      if (err) {
        console.log(err);
        return res.status(500).send(conf.errors.internalServerError);
      }
      if (file instanceof Error || !file)
        return res.json({
          err: true,
          res: `TEI file not updated`
        });
      return DocumentsController.updateOrCreateTEIMetadata(
        { data: { id: doc._id.toString() }, user: req.user },
        function (err, ok) {
          if (err || ok instanceof Error) {
            console.log(err);
            return res.status(500).send(conf.errors.internalServerError);
          }
          if (!doc.pdf) {
            let isError = file instanceof Error;
            let result = isError ? file.toString() : file;
            return res.json({
              err: isError,
              res: result
            });
          }
          return DocumentsController.updateOrCreatePDFMetadata(
            { data: { id: doc._id.toString() }, user: req.user },
            function (err, ok) {
              if (err || ok instanceof Error) {
                console.log(err);
                return res.status(500).send(conf.errors.internalServerError);
              }
              let isError = file instanceof Error;
              let result = isError ? file.toString() : file;
              return res.json({
                err: isError,
                res: result
              });
            }
          );
        }
      );
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

/* POST SINGLE Document reports/ BY ID */
router.post(`/:id/reports/gSpreadsheets/:kind`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isAdministrator && !accessRights.isModerator) return res.status(401).send(conf.errors.unauthorized);
  // Init transaction
  let opts = {
    data: { id: req.params.id, dataTypes: req.app.get(`dataTypes`) },
    kind: req.params.kind,
    user: req.user
  };
  return DocumentsController.buildGSpreadsheets(opts, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = data instanceof Error;
    let result = isError ? data.toString() : data;
    if (isError) return res.status(404).send(conf.errors.notFound);
    return res.json({
      err: isError,
      res: result
    });
  });
});

/* GET SINGLE Document reports/ BY ID */
router.get(`/:id/reports/gSpreadsheets/:kind`, function (req, res, next) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.authenticated) return res.status(401).send(conf.errors.unauthorized);
  // Init transaction
  let opts = {
    strict: false,
    data: { id: req.params.id },
    kind: req.params.kind,
    user: req.user
  };
  return DocumentsController.getGSpreadsheets(opts, function (err, data) {
    if (err) {
      console.log(err);
      return res.status(500).send(conf.errors.internalServerError);
    }
    let isError = data instanceof Error;
    let result = isError ? data.toString() : data;
    if (isError) return res.status(404).send(conf.errors.notFound);
    return res.json({
      err: isError,
      res: result
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
        TEI: `${Url.build(`api/documents/${req.params.id}/tei/content`, { token: data.doc.token })}`,
        PDF: `${Url.build(`api/documents/${req.params.id}/pdf/content`, { token: data.doc.token })}`
      },
      reportData: data,
      currentUser: req.user,
      conf: conf
    });
  });
});

/* GET SINGLE Document reports/ BY ID */
router.get(`/:id/reports/json/default`, function (req, res, next) {
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
    return DocumentsController.get(
      { data: { id: opts.data.id, metadata: true }, user: opts.user },
      function (err, doc) {
        let isError = doc instanceof Error;
        let result = isError ? doc.toString() : doc;
        if (isError) return res.status(404).send(conf.errors.notFound);
        return res.json(
          Object.assign(
            {},
            {
              sortedDatasetsInfos: data.sortedDatasetsInfos
            },
            { originalDocument: doc }
          )
        );
      }
    );
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
      id: req.params.id,
      refreshAuthors: Params.convertToBoolean(req.body.refreshAuthors),
      refreshORCIDsFromAPI: Params.convertToBoolean(req.body.refreshORCIDsFromAPI),
      refreshORCIDsFromASAPList: Params.convertToBoolean(req.body.refreshORCIDsFromASAPList),
      metadata: {
        readmeIncluded: req.body.readmeIncluded,
        describesFiles: req.body.describesFiles,
        describesVariables: req.body.describesVariables,
        authors: req.body.authors,
        article_title: Params.convertToString(req.body.article_title),
        journal: Params.convertToString(req.body.journal),
        publisher: Params.convertToString(req.body.publisher),
        manuscript_id: Params.convertToString(req.body.manuscript_id),
        doi: Params.convertToString(req.body.doi),
        pmid: Params.convertToString(req.body.pmid),
        license: Params.convertToString(req.body.license),
        acknowledgement: Params.convertToString(req.body.acknowledgement),
        affiliation: Params.convertToString(req.body.affiliation)
      }
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
  if (!accessRights.isModerator) return res.status(401).send(conf.errors.unauthorized);
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

/* Document charts for ASAP */
router.get(`/:id/charts/asap`, function (req, res) {
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
    if (!doc) return res.status(404).send(conf.errors.notFound);
    let render = Params.convertToString(req.query.render);
    let width = Params.convertToInteger(req.query.width);
    let height = Params.convertToInteger(req.query.height);
    let quality = Params.convertToInteger(req.query.quality);
    if (!render)
      return Charts.buildASAPPie(
        {
          data: {
            urls: {
              current: `${Url.build(`/documents/${req.params.id}/charts/asap?token=${doc.token}`)}`,
              bioRxiv: doc.urls.bioRxiv,
              document: `${Url.build(`/documents/${req.params.id}`)}`
            }
          }
        },
        function (err, data) {
          if (err) {
            console.log(err);
            return res.status(500).send(conf.errors.internalServerError);
          }
          return res.send(data);
        }
      );
    return Charts.buildRenderedASAPPie(
      {
        url: `${Url.build(
          `api/documents/${req.params.id}/charts/asap`,
          Object.assign({ token: doc.token }, req.query, { render: `` }) // disable render & add token if not in the URL
        )}`,
        render: { type: render, width: width, height: height, quality: quality }
      },
      function (err, data) {
        if (err) {
          console.log(err);
          return res.status(500).send(conf.errors.internalServerError);
        }
        return res.send(data);
      }
    );
  });
});

/* Process OCR */
router.post(`/:id/processOCR`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isModerator) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    documentId: req.params.id,
    pages: Array.isArray(req.body.pages) ? req.body.pages : Params.convertPages(req.body.pages),
    user: req.user
  };
  return DocumentsController.processOCR(opts, function (err, data) {
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

/* Detect new sentences */
router.post(`/:id/detectNewSentences`, function (req, res) {
  let accessRights = AccountsManager.getAccessRights(req.user);
  if (!accessRights.isModerator) return res.status(401).send(conf.errors.unauthorized);
  let opts = {
    documentId: req.params.id,
    pages: Array.isArray(req.body.pages) ? req.body.pages : Params.convertPages(req.body.pages),
    user: req.user
  };
  return DocumentsController.detectNewSentences(opts, function (err, data) {
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
