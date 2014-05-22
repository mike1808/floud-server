var gcm = require('node-gcm');

module.exports = function(app, config) {
    var sender = new gcm.Sender(config.apiKey);

    app.on('upload', function(data) {

    });

    app.on('move', function(data) {

    });

    app.on('delete', function(data) {

    });
};
