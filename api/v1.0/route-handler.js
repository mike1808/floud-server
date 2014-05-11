var auth = require('auth');
var path = require('path');
var files = require('./routes/files');
var users = require('./routes/users');
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart({
    autoFiles: true,
    uploadDir: path.join(process.cwd(), 'tmp'),
    hash: 'sha1'
});

module.exports = function(app) {
    app.get('/files', auth.requiresLogin, files.getFiles('list'));
    app.get('/files/tree', auth.requiresLogin, files.getFiles('tree'));
    app.post('/files', auth.requiresLogin, multipartMiddleware, files.uploadFile);
    app.get('/files/file', auth.requiresLogin, files.sendFile);
    app.put('/files/move', auth.requiresLogin, files.move);
    app.delete('/files/file', auth.requiresLogin, files.deleteFile);

    app.put('/users', users.createUser);
    app.post('/users/login', users.login);
    app.delete('/users/:id', users.deleteUser);
    app.get('/users/current', auth.requiresLogin, users.getCurrentUser);
};

