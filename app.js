/*
 * @prettier
 */

'use strict';

const express = require(`express`);
const app = express();
const http = require(`http`).Server(app);
const path = require(`path`);
const url = require(`url`);
const fs = require(`fs`);
const fileUpload = require(`express-fileupload`);
const cookieParser = require(`cookie-parser`);
const favicon = require(`serve-favicon`);
const logger = require(`morgan`);
const methodOverride = require(`method-override`);
const bodyParser = require(`body-parser`);
const multer = require(`multer`);
const errorHandler = require(`errorhandler`);
const passport = require(`passport`);
const async = require(`async`);
const LocalStrategy = require(`passport-local`).Strategy;

const indexDocumentsRouter = require(`./routes/documents/index.js`);
const indexApiRouter = require(`./routes/api/index.js`);
const documentsApiRouter = require(`./routes/api/documents.js`);
const accountsApiRouter = require(`./routes/api/accounts.js`);
const organizationsApiRouter = require(`./routes/api/organizations.js`);
const rolesApiRouter = require(`./routes/api/roles.js`);
const documentsFilesApiRouter = require(`./routes/api/documents.files.js`);
const documentsDatasetsApiRouter = require(`./routes/api/documents.datasets.js`);
const documentsDataObjectsApiRouter = require(`./routes/api/documents.dataObjects.js`);
const dataseerMLRouter = require(`./routes/api/dataseer-ml.js`);
const repoRecommenderRouter = require(`./routes/api/repoRecommender.js`);
const bioNLPRouter = require(`./routes/api/bioNLP.js`);
const softciteRouter = require(`./routes/api/softcite.js`);
const statisticsRouter = require(`./routes/api/statistics.js`);
const hypothesisRouter = require(`./routes/api/hypothesis.js`);
const orcidRouter = require(`./routes/api/orcid.js`);
const softwareRouter = require(`./routes/api/software.js`);
const reagentsRouter = require(`./routes/api/reagents.js`);
const identifiersRouter = require(`./routes/api/identifiers.js`);
const sciscoreRouter = require(`./routes/api/sciscore.js`);
const scicrunchRouter = require(`./routes/api/scicrunch.js`);
const chartsRouter = require(`./routes/api/charts.js`);

const indexRouter = require(`./routes/index.js`);

const indexBackofficeRouter = require(`./routes/backoffice/index.js`);
const accountsBackofficeRouter = require(`./routes/backoffice/accounts.js`);
const organizationsBackofficeRouter = require(`./routes/backoffice/organizations.js`);
const rolesBackofficeRouter = require(`./routes/backoffice/roles.js`);
const documentsBackofficeRouter = require(`./routes/backoffice/documents.js`);

const conf = require(`./conf/conf.json`);
const domainsConf = require(`./conf/domains.json`);
const allowedDomains = domainsConf.domains || [];

const Accounts = require(`./models/accounts.js`);

const AccountsController = require(`./controllers/api/accounts.js`);
const DocumentsController = require(`./controllers/api/documents.js`);
const RolesController = require(`./controllers/api/roles.js`);
const CrudController = require(`./controllers/api/crud.js`);

const AccountsManager = require(`./lib/accounts.js`);
const CrudManager = require(`./lib/crud.js`);
const Wiki = require(`./lib/wiki.js`);
const OCR = require(`./lib/ocr.js`);
const ORCID = require(`./lib/orcid.js`);
const Software = require(`./lib/software.js`);
const Reagents = require(`./lib/reagents.js`);
const Identifiers = require(`./lib/identifiers.js`);
const DataObjects = require(`./lib/dataObjects.js`);
// mongoose object
const mongoose = require(`mongoose`);
mongoose.set(`useCreateIndex`, true);

// URL to mongoDB
const urlmongo = conf.mongodb.url;

const maxFileUploadSize = isNaN(conf.maxFileUploadSize) ? 50 * 1024 * 1024 : conf.maxFileUploadSize;

// API connection
mongoose.connect(urlmongo, {
  useNewUrlParser: true,
  useFindAndModify: false,
  useUnifiedTopology: true
});

let db = mongoose.connection;
db.on(`error`, function () {
  console.log(`Connection to MongoDB failed`);
  process.exit(0);
});
db.once(`open`, function () {
  console.log(`Connection to MongoDB succeeded`);
  return async.map(
    [
      function (next) {
        return OCR.init(function (err) {
          if (err) {
            console.log(`OCR not initalized`);
            return next(err);
          }
          console.log(`OCR initialized`);
          return next(err);
        });
      },
      function (next) {
        return Wiki.getDataTypes(function (err, dataTypes) {
          if (err) {
            console.log(`dataTypes not initalized`);
            return next(err);
          }
          app.set(`dataTypes`, dataTypes);
          DataObjects.refreshDataTypes(dataTypes);
          console.log(`dataTypes initialized`);
          return next(err);
        });
      },
      function (next) {
        return ORCID.refreshASAPAuthors(function (err, data) {
          if (err) return next(err);
          app.set(`ASAP.authors`, data);
          console.log(`ASAP authors list initialized`);
          return next(err);
        });
      },
      function (next) {
        return Software.refreshCustomList(function (err, data) {
          if (err) return next(err);
          app.set(`Software.customList`, data);
          console.log(`Custom software list initialized`);
          return next(err);
        });
      },
      function (next) {
        return Reagents.refreshCustomList(function (err, data) {
          if (err) return next(err);
          app.set(`Reagents.customList`, data);
          console.log(`Custom reagents list initialized`);
          return next(err);
        });
      },
      function (next) {
        return Identifiers.refreshCustomList(function (err, data) {
          if (err) return next(err);
          app.set(`Identifiers.customList`, data);
          console.log(`Custom identifiers list initialized`);
          return next(err);
        });
      },
      function (next) {
        return RolesController.all({}, function (err, query) {
          if (err) {
            console.log(`Roles not found`);
            return next(err);
          }
          return AccountsManager.addRoles(query.data, function (err) {
            if (err) console.log(`Roles not initalized`);
            console.log(`Roles initialized`);
            return next(err);
          });
        });
      },
      function (next) {
        return CrudController.all({}, function (err, actions) {
          if (err) {
            console.log(`Crud not found`);
            return next(err);
          }
          return CrudManager.addActions(actions, function (err) {
            if (err) console.log(`CRUD not initalized`);
            console.log(`CRUD initialized`);
            return next(err);
          });
        });
      },
      function (next) {
        return fs.readFile(`./conf/private.key`, `utf-8`, function (err, privateKey) {
          if (err) {
            console.log(`file conf/private.key not found`);
            process.exit(0);
          }
          app.set(`private.key`, privateKey);
          console.log(`file conf/private.key loaded`);
          return next(err);
        });
      }
    ],
    function (action, next) {
      return action(next);
    },
    function (err) {
      if (err) {
        console.log(err);
        return process.exit(0);
      }
      app.disable(`x-powered-by`);
      // all environments
      app.set(`port`, process.env.PORT || 3000);
      app.set(`views`, path.join(__dirname, `views`));
      app.set(`view engine`, `pug`);
      app.use(logger(`dev`));
      app.use(methodOverride());
      app.use(
        fileUpload({
          limits: { fileSize: maxFileUploadSize },
          abortOnLimit: true,
          responseOnLimit: conf.maxFileUploadErrorMessage
        })
      );
      app.use(cookieParser());
      app.use(bodyParser.json({ limit: `50mb`, extended: true }));
      app.use(bodyParser.urlencoded({ limit: `10mb`, extended: true, parameterLimit: 1000000 }));
      app.use(favicon(path.join(__dirname, `public`, `favicon.ico`)));
      app.use(express.static(`public`));

      // Configure passport middleware
      app.use(passport.initialize());
      // IMPORTANT: set `{ session: false }` on passport.authenticate() function on the sign in route
      // Configure passport-local to use account model for authentication
      passport.use(new LocalStrategy(Accounts.authenticate()));

      passport.serializeUser(Accounts.serializeUser());
      passport.deserializeUser(Accounts.deserializeUser());

      app.set(`view engine`, `html`);
      app.engine(`html`, require(`ejs`).renderFile);

      /* Set Custom headers */
      app.use(function (req, res, next) {
        if (!Array.isArray(allowedDomains) || allowedDomains.length <= 0) return next();
        let origin = req.header(`origin`) || req.header(`referer`) || req.header(`host`);
        let splitedOrigin = origin.split(`://`);
        let domainSplit = splitedOrigin.length > 1 ? splitedOrigin[1].split(`:`) : splitedOrigin[0].split(`:`);
        let protocol = splitedOrigin.length > 1 ? splitedOrigin[0] : ``;
        let domain = domainSplit[0];
        let port = domainSplit.length > 1 ? domainSplit[1].replace(/\/+/, ``) : ``;
        let _domain = ``;
        if (!domainsConf.ignoreProtocol && protocol) _domain += `${protocol}://`;
        _domain += domain;
        if (!domainsConf.ignorePort && port) _domain += `:${port}`;
        let filterDomains = allowedDomains.filter(function (item) {
          return _domain === item;
        });
        if (filterDomains.length > 0) {
          // Website you wish to allow to connect
          res.setHeader(`Access-Control-Allow-Origin`, origin);
          // Request methods you wish to allow
          res.setHeader(`Access-Control-Allow-Methods`, `GET, POST, OPTIONS, PUT, PATCH, DELETE`);
          // Request headers you wish to allow
          res.setHeader(`Access-Control-Allow-Headers`, `X-Requested-With,content-type`);
          // Set to true if you need the website to include cookies in the requests sent
          // to the API (e.g. in case you use sessions)
          res.setHeader(`Access-Control-Allow-Credentials`, true);
        }
        // Pass to next layer of middleware
        return next();
      });

      app.use(AccountsController.authenticate); // authentication with `token`
      app.use(`/api`, DocumentsController.authenticate); // authentication with  document `token`
      app.use(`/documents/:id`, DocumentsController.authenticate); // authentication with  document `token`
      app.use(`/backoffice/documents/:id`, DocumentsController.authenticate); // authentication with  document `token`
      app.use(`/api/documents/:id`, DocumentsController.watch); // Add watcher if necessary
      app.use(`/backoffice/documents/:id`, DocumentsController.watch); // Add watcher if necessary

      app.use(`/public`, express.static(path.join(__dirname, `public`)));
      app.use(`/views`, express.static(path.join(__dirname, `views/root`)));
      app.use(`/`, indexRouter);

      app.use(`/documents`, indexDocumentsRouter);

      app.use(`/api`, indexApiRouter);
      app.use(`/api/documents`, documentsApiRouter);
      app.use(`/api/accounts`, accountsApiRouter);
      app.use(`/api/organizations`, organizationsApiRouter);
      app.use(`/api/roles`, rolesApiRouter);
      app.use(`/api/files`, documentsFilesApiRouter);
      app.use(`/api/datasets`, documentsDatasetsApiRouter);
      app.use(`/api/dataObjects`, documentsDataObjectsApiRouter);
      app.use(`/api/dataseer-ml`, dataseerMLRouter);
      app.use(`/api/repoRecommender`, repoRecommenderRouter);
      app.use(`/api/BIONLP`, bioNLPRouter);
      app.use(`/api/statistics`, statisticsRouter);
      app.use(`/api/hypothesis`, hypothesisRouter);
      app.use(`/api/orcid`, orcidRouter);
      app.use(`/api/software`, softwareRouter);
      app.use(`/api/reagents`, reagentsRouter);
      app.use(`/api/identifiers`, identifiersRouter);
      app.use(`/api/sciscore`, sciscoreRouter);
      app.use(`/api/scicrunch`, scicrunchRouter);
      app.use(`/api/charts`, chartsRouter);

      app.use(`/backoffice`, indexBackofficeRouter);
      app.use(`/backoffice/accounts`, accountsBackofficeRouter);
      app.use(`/backoffice/organizations`, organizationsBackofficeRouter);
      app.use(`/backoffice/roles`, rolesBackofficeRouter);
      app.use(`/backoffice/documents`, documentsBackofficeRouter);
    }
  );
});

module.exports = app;
