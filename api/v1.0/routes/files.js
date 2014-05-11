
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
var File = mongoose.model('File');
var path = require('path');
var async = require('async');
var fileService = require('file-service');

function createResponseData(files) {
    return files.map(function(file) {
        return {
            path: file.path,
            version: file.version,
            size: file.size,
            hash: file.hash,
            modified: file.modified,
            created: file.created
        };
    });
}


function parseFileName(path) {
    var data = path.split('.');
    var version = parseInt(data[data.length - 1]);
    var filename = data.splice(data.length - 1, 1).join('.');
    return {
        version: version,
        path: path
    }
}

function createFilesTree(files) {
    var tree = [{
        name: '/',
        id: generateRandomStr(6),
        children: []
    }];

    files.forEach(function(file) {
        var tokens = file.path.split('/');

        var subtree = tree[0];

        for(var i = 1; i <= tokens.length - 2; i++) {
            var dirExists = false;
            subtree.children.forEach(function(child) {
                if (child.name == tokens[i]) dirExists = true;
            });

            if (!dirExists) {
                subtree.children.push({
                    name: tokens[i],
                    id: generateRandomStr(6),
                    children: []
                });
            }

            subtree = subtree.children[subtree.children.length - 1];
        }

        file.name = file.path.substr(file.path.lastIndexOf('/') + 1);
        subtree.children.push(file);
    });

    return tree;
}

exports.getFiles = function(type) {
    return function(req, res, next) {
        req.query.from && req.checkQuery('from', 'should be long').isInt();

        var errors = req.validationErrors();

        if (errors) res.send(400, errors);

        var matchOpts = {
            user: ObjectId(req.user.id),
            deleted: false
        };

        if (req.query.from) {
            req.sanitize('from').toInt();
            matchOpts.created = { $gte: new Date(req.query.from) };
        }

        File.aggregate(
            {
                $match: matchOpts
            },
            {
                $sort: {
                    version: -1
                }
            },
            {
                $group: {
                    _id: '$path',
                    path: { $first: '$path' },
                    version: { $first: '$version' },
                    size: { $first: '$size' },
                    hash: { $first: '$hash' },
                    created: { $first: '$created' }
                }
            },
            {
                $project: {
                    _id: 0,
                    path: 1,
                    version: 1,
                    size: 1,
                    hash: 1,
                    created: 1
                }
            },

            function(err, files) {
                if (err) { return next(err); }

                var filesOut;

                switch (type) {
                    case 'list': filesOut = files; break;
                    case 'tree': filesOut = createFilesTree(files); break;
                    default : throw new Error('wrong file output format');
                }

                res.send(filesOut);
            });
    }
};

exports.uploadFile = function(req, res, next) {
    if (!req.files || !req.files.file || !req.body.path || !req.body.size || !req.body.hash) {
        return res.send(400, 'Some fields are missing!');
    }

    var file = {
        path: req.body.path,
        size: req.body.size,
        hash: req.body.hash,
        user: req.user.id
    };

    var attachedFile = req.files.file;
    var hash = attachedFile.hash;

    // FIXME
    if (!hash) throw new Error('fix hash!');
    if (file.hash != hash) {
        return res.send(400, 'Files damaged during uploading');
    }

    File.find({ path: req.body.path, deleted: false }, {}, { sort: { version: -1 }, limit: 1 }).exec(function(err, files) {
        if (err) { return next(err); }

        var latestFile = files && files.length && files[0] || null;

        async.waterfall([
            function(callback) {
                if (latestFile && latestFile.hash === hash) {
                    return callback(null, { text: 'Uploaded file is the same', status: 304 });
                }

                file.version = (latestFile && latestFile.version + 1) || 0;

                File.create(file, function(err, file) {
                    if (err) {
                        return callback(err);
                    }
                    fileService.saveFile(attachedFile.path, file.id, req.user, function(err, filePath) {
                        if (err) return callback(err);

                        callback(null, { status: 201, data: file });
                    });
                });

            }
        ], function(err, result) {
            if (err) {
                return next(err);
            }

            res.send(result.status, result.text || result.data);
        });
    })
};

exports.sendFile = function(req, res, next) {
    if (!req.query.path) {
        return res.send(400);
    }

    File.find({ path: req.query.path, deleted: false }, {}, { sort: { version: -1 }}).exec(function(err, files) {
        if (err) {
            return next(err);
        }

        if (!files || !files.length) {
            return res.send(404);
        }

        var pendingFile = files[0];        if (req.query.version) {
            files.forEach(function(file) {
                if (file.version == req.query.version) {
                    pendingFile = file;
                }
            })
        }

        if (!pendingFile) {
            return res.send(400, 'File with such version doesn\'t exist');
        }

        var filePath = fileService.getFilePath(pendingFile.id, req.user);
        var fileName = pendingFile.path.substr(pendingFile.path.lastIndexOf('/') + 1);



        res.download(filePath, fileName, function(err) {
            if (err) {
                res.send(400);
            } else {

            }
        });
    })
};

exports.deleteFile = function(req, res, next) {
    if (!req.query.path || req.query.path === '') {
        return res.send(400);
    }

    File.find({ path: req.query.path, deleted: false }, {}, { sort: { version: -1 }}).exec(function(err, files) {
        if (err) {
            return next(err);
        }

        if (!files || !files.length) {
            return res.send(404);
        }

        async.each(files, function(file, cb) {
            file.deleted = true;
            file.save(cb);

        }, function(err) {
            if (err) return next(err);
            res.send(200, {});
        });
    });
};

exports.move = function(req, res, next) {
    if (!req.body.oldPath || req.body.newPath === '') {
        return res.send(400);
    }

    File.update({ path: req.body.oldPath }, { $set: { path: req.body.newPath }}).exec(function(err, success) {
        if (err) return next(err);

        if (!success) {
            return res.send(400);
        }

        res.send(200, {});
    });
};

function generateRandomStr(length) {
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz';

    length = length || 32;

    var string = '';

    for (var i = 0; i < length; i++) {
        var randomNumber = Math.floor(Math.random() * chars.length);
        string += chars.substring(randomNumber, randomNumber + 1);
    }

    return string;
}