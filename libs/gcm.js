var gcm = require('node-gcm');


module.exports = function(app, usersRegIds, config) {
    var users = usersRegIds || {};
    var sender = new gcm.Sender(config.apiKey);

    app.on('reg', function(data) {
        users[data.userId] = users[data.userId] || [];
        users[data.userId].push(data.regId);
    });

    app.on('unreg', function(data) {
        if (!users[data.userId]) return;
        var idx = users[data.userId].indexOf(data.userId);
        users[data.userId].splice(idx, 1);
    });

    app.on('change', function(data) {
        var message = new gcm.Message({
            collapseKey: 'change'
        });

        var regIds = users[data.userId];

        if (data.regId) {
            regIds = regIds.filter(function(regId) {
                return regId !== data.regId;
            });
        }

        if (regIds && regIds.length) {
            sender.send(message, regIds, 4, function(err, result) {
                console.log('Push notification was sent to ' + result.success);
            });
        }

    });
};
