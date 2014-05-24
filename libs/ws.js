var log   = require('log')(module);
var users = {};

exports.init = function(server, app) {
    log.info('Initializing Socket.io');

    var io = require('socket.io')(server);

    io.sockets.on('connection', function(socket) {
    });
};