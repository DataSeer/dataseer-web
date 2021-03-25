/*
 * @prettier
 */

'use strict';

const express = require('express'),
  app = express(),
  http = require('http').Server(app),
  path = require('path'),
  url = require('url'),
  fs = require('fs'),
  fileUpload = require('express-fileupload'),
  logger = require('morgan'),
  methodOverride = require('method-override'),
  session = require('express-session'),
  bodyParser = require('body-parser'),
  multer = require('multer'),
  errorHandler = require('errorhandler'),
  passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy,
  request = require('request'),
  flash = require('connect-flash');

const indexRouter = require('./routes/index.js'),
  documentsRouter = require('./routes/api/documents.js'),
  documentsFilesRouter = require('./routes/api/documents.files.js'),
  documentsDatasetsRouter = require('./routes/api/documents.datasets.js'),
  documentsMetadataRouter = require('./routes/api/documents.metadata.js'),
  dataseerMLRouter = require('./routes/api/dataseer-ml.js'),
  backOfficeRouter = require('./routes/backoffice.js'),
  viewsRouter = require('./routes/documents.js');

const conf = require('./conf/conf.json');

const DataSeerML = require('./lib/dataseer-ml.js'),
  Wiki = require('./lib/wiki.js'),
  JWT = require('./lib/jwt.js');

const Accounts = require('./models/accounts.js'),
  Roles = require('./models/roles.js');

const AccountsController = require('./controllers/accounts.js'),
  DocumentsController = require('./controllers/documents.js'),
  DocumentsFilesController = require('./controllers/documents.files.js'),
  DocumentsDatasetsController = require('./controllers/documents.datasets.js');

// mongoose object
const mongoose = require('mongoose');
mongoose.set('useCreateIndex', true);

// URL to mongoDB
const urlmongo = conf.services.mongodb;

// API connection
mongoose.connect(urlmongo, {
  useNewUrlParser: true,
  useFindAndModify: false,
  useUnifiedTopology: true
});

let db = mongoose.connection;
db.on('error', function () {
  console.log('Connection to MongoDB failed');
  process.exit(0);
});
db.once('open', function () {
  console.log('Connection to MongoDB succeeded');
  console.log('Load dataTypes from wiki...');
  return Wiki.getDataTypes(function (err, dataTypes) {
    if (!err) {
      console.log('Load dataTypes from wiki... finished');
      app.set('dataTypes', dataTypes);
      return fs.readFile('./conf/private.key', 'utf-8', function (err, privateKey) {
        if (err) {
          console.log('file conf/private.key not found');
          process.exit(0);
        }
        console.log('file conf/private.key loaded');
        app.set('private.key', privateKey);
        return Roles.find({}).exec(function (err, roles) {
          if (err) {
            console.log('Roles not loaded');
            process.exit(0);
          }
          app.set(
            'roles',
            roles.reduce(function (acc, item) {
              acc[item.id] = acc;
              return acc;
            }, {})
          );
          console.log('Roles loaded');
          app.disable('x-powered-by');

          // all environments
          app.set('port', process.env.PORT || 3000);
          app.set('views', path.join(__dirname, 'views'));
          app.set('view engine', 'pug');
          app.use(logger('dev'));
          app.use(methodOverride());
          app.use(
            fileUpload({
              limits: { fileSize: 50 * 1024 * 1024 }
            })
          );
          app.use(bodyParser.json({ limit: '50mb', extended: true }));
          app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
          // app.use(multer());
          app.use(
            session({
              cookieName: 'session',
              secret: privateKey,
              resave: false,
              saveUninitialized: false
            })
          );
          app.use(flash());

          // Configure passport middleware
          app.use(passport.initialize());
          app.use(passport.session());

          // Configure passport-local to use account model for authentication
          passport.use(new LocalStrategy(Accounts.authenticate()));

          // use static serialize and deserialize of model for passport session support
          passport.serializeUser(Accounts.serializeUser());
          passport.deserializeUser(Accounts.deserializeUser());

          // Token authentication
          app.use(AccountsController.authenticate);
          app.use('/documents/', DocumentsController.authenticate);
          app.use('/api/documents/', DocumentsController.authenticate);
          app.use('/api/dataseer-ml/', DocumentsController.authenticate);
          app.use('/api/datasets/', DocumentsDatasetsController.authenticate);
          app.use('/api/files/', DocumentsFilesController.authenticate);

          app.use('/documents/:id', DocumentsController.watch); // Add watcher if necessary

          app.use(express.static('public'));

          app.use('/', indexRouter);
          app.use('/api/documents', documentsRouter);
          app.use('/api/files', documentsFilesRouter);
          app.use('/api/datasets', documentsDatasetsRouter);
          app.use('/api/metadata', documentsMetadataRouter);
          app.use('/api/dataseer-ml', dataseerMLRouter);
          app.use('/documents', viewsRouter);
          app.use('/backoffice', backOfficeRouter);
        });
      });
    } else {
      console.log(err);
      console.log('GET on /jsonDataTypes route of dataseer-ml service failed');
      process.exit(0);
    }
  });
});

module.exports = app;
