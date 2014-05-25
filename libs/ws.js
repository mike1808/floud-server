var log = require('log')(module);
var decrypt = require('auth').aes_decrypt;


exports.init = function(server, app) {
    log.info('Initializing Socket.io');

    var io = require('socket.io')(server);

    function getUserIdFromToken(req, callback) {
        if (!req._query.auth) {
            return callback(null, false);
        }

        var token = decrypt(req._query.auth);
        try {
            token = token.split('|');
        } catch(e) {
            return callback(e, false);
        }

        req.userId = token[0];

        callback(null, true);
   }

    io.set('authorization', function (handshakeData, callback) {
        if (!handshakeData._query) {
            return callback('No query was transmitted.', false);
        }

        getUserIdFromToken(handshakeData, callback);
    });

    io.sockets.on('connection', function(socket) {
        var userId = socket.request.userId;
        if (userId) {
            socket.join(userId);
        }
    });

    app.on('change', function(data) {
        process.nextTick(function() {
            io.sockets.to(data.userId).emit(data.type, data.data);
        });
    });
};