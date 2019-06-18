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

const indexRouter = require('./routes/index'),
  documentsRouter = require('./routes/api/documents'),
  dataseerMLRouter = require('./routes/api/dataseer-ml'),
  backOfficeRouter = require('./routes/backoffice'),
  viewsRouter = require('./routes/documents');

const conf = require('./conf/conf.json');

// mongoose object
const mongoose = require('mongoose');

// URL to mongoDB
const urlmongo = conf.services.mongodb;

// API connection
mongoose.connect(urlmongo, { 'useNewUrlParser': true, 'useFindAndModify': false });

let db = mongoose.connection;
db.on('error', console.error.bind(console, 'Failed to connect to MongoDB'));
db.once('open', function() {
  console.log('Connection to MongoDB succed');
});

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(logger('dev'));
app.use(methodOverride());
app.use(
  session({
    'resave': true,
    'saveUninitialized': true,
    'secret': 'uwotm8'
  })
);
app.use(
  fileUpload({
    'limits': { 'fileSize': 50 * 1024 * 1024 }
  })
);
app.use(bodyParser.json({ 'limit': '10mb', 'extended': true }));
app.use(bodyParser.urlencoded({ 'limit': '10mb', 'extended': true }));
// app.use(multer());
app.use(express.static('public'));

app.use('/', indexRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/dataseer-ml', dataseerMLRouter);
app.use('/documents', viewsRouter);
app.use('/backoffice', backOfficeRouter);

// error handling middleware should be loaded after the loading the routes
if ('development' == app.get('env')) {
  app.use(errorHandler());
}

module.exports = app;
