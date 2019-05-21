// var createError = require('http-errors');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var routes = require('./routes');
var path = require('path');

// var favicon = require('serve-favicon');
var logger = require('morgan');
var methodOverride = require('method-override');
var session = require('express-session');
var bodyParser = require('body-parser');
var multer = require('multer');
var errorHandler = require('errorhandler');

// mongoose object
var mongoose = require('mongoose');

const conf = require('./conf/conf.json');

// URL to mongoDB
var urlmongo = conf.services.mongodb;

// API connection
mongoose.connect(urlmongo, { useNewUrlParser: true, useFindAndModify: false });

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'Failed to connect to MongoDB'));
db.once('open', function() {
  console.log("Connection to MongoDB succed");
});

var indexRouter = require('./routes/index');
var documentsRouter = require('./routes/api/documents');
var viewsRouter = require('./routes/documents');

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
// app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(methodOverride());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: 'uwotm8'
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(multer());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/api/documents', documentsRouter);
app.use('/documents', viewsRouter);

// error handling middleware should be loaded after the loading the routes
if ('development' == app.get('env')) {
  app.use(errorHandler());
}


module.exports = app;