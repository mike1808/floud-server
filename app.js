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

var mongoose = require('mongoose');
var User = mongoose.model('User');

User.find({}, 'regIds').lean().exec(function(err, users) {
    if (err) throw err;

    var usersRegIds = {};

    users.forEach(function(user) {
        usersRegIds[user._id.toString()] = user.regIds;
    });


    log.info('Initializing Google Cloud Messaging');
    require('gcm')(app, usersRegIds, config.get('gcm'));
});



// all environments
app.set('env', config.get('NODE_ENV') || 'development');
app.set('port', config.get('PORT') || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());

app.use(expressValidator());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));


if ('development' == app.get('env')) {
	app.use(function(req, res, next) {
		var objCount = 0;

		for (var k in req.body) objCount++;

		if (objCount) {
		    console.log('BODY', req.body);
		}
		
	    next();
	});

}

app.use(function(req, res, next) {
    req.app = app;
    next();
});

app.use(app.router);


// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

var apiVersion = config.get('api:version');
log.info('Initializing API server: /api/v%s server', apiVersion);
var apiServer = require('./api/v' + apiVersion + '/server');
app.use('/api/v' + apiVersion, apiServer);



app.get('/', function(req, res) {
    res.render('index');
});



http.createServer(app).listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});
