var express = require('express');
var http = require('http');
var path = require('path');
var log = require('./libs/log')(module);
var expressValidator = require('express-validator');

log.info('Reading configurations');
var config = require('config');

log.info('Initializing database');
require('./libs/db_init')(config.get('db'));

log.info('Initializing authentication module');
var auth = require('auth');

auth.init(config.get('auth'));

var app = express();

// all environments
app.set('port', config.get('port'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(expressValidator());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use(app.router);


// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

app.get('/', function(req, res) {
    res.render('index');
});

var apiVersion = config.get('api:version');
log.info('Initializing API server: /api/v%s server', apiVersion);
var apiServer = require('./api/v' + apiVersion + '/server');
app.use('/api/v' + apiVersion, apiServer);



http.createServer(app).listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});
