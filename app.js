const express = require('express'),
  app = express(),
  http = require('http').Server(app),
  routes = require('./routes'),
  path = require('path'),
  url = require('url'),
  fileUpload = require('express-fileupload'),
  logger = require('morgan'),
  methodOverride = require('method-override'),
  session = require('express-session'),
  bodyParser = require('body-parser'),
  multer = require('multer'),
  errorHandler = require('errorhandler');
// const  createError = require('http-errors');
// var favicon = require('serve-favicon');

const conf = require('./conf/conf.json');

// mongoose object
const mongoose = require('mongoose');

// URL to mongoDB
const urlmongo = conf.services.mongodb;

// API connection
mongoose.connect(urlmongo, { useNewUrlParser: true });

let db = mongoose.connection;
db.on('error', console.error.bind(console, 'Failed to connect to MongoDB'));
db.once('open', function() {
  console.log("Connection to MongoDB succed");
});

const indexRouter = require('./routes/index'),
  documentsRouter = require('./routes/api/documents'),
  backOfficeRouter = require('./routes/backoffice'),
  viewsRouter = require('./routes/documents');

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.set('baseUrl', conf.baseUrl);
// app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(methodOverride());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: 'uwotm8'
}));
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
}));
app.use(bodyParser.json({ limit: '10mb', extended: true }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
// app.use(multer());
app.use(app.get('baseUrl'), express.static(path.join(__dirname, 'public')));


app.use(url.resolve(app.get('baseUrl'), ''), indexRouter);
app.use(url.resolve(app.get('baseUrl'), 'api/documents'), documentsRouter);
app.use(url.resolve(app.get('baseUrl'), 'documents'), viewsRouter);
app.use(url.resolve(app.get('baseUrl'), 'backoffice'), backOfficeRouter);

// error handling middleware should be loaded after the loading the routes
if ('development' == app.get('env')) {
  app.use(errorHandler());
}


module.exports = app;