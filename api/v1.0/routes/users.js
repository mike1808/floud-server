var mongoose = require('mongoose');
var User     = mongoose.model('User');
var auth     = require('auth');
var log      = require('log')(module);

function generateSigninResponse(user){
    var result = {
        token: auth.generateNewToken(user.id, 9),
        userId: user.id,
        name: user.fullname,
        gravatar: user.gravatar,
        email: user.email,
        expires: 9*3600 - 20
    };

    return result;
}

exports.createUser = function(req, res, next) {
    var userData = req.body;

    if (!userData.username || !userData.password || !userData.email) {
        return res.send(400, 'Bad request - username, password or email is missing');
    }

    userData.username = userData.username.trim();
    userData.password = userData.password.trim();
    userData.email = userData.email.trim();

    User.findOne({ $or: [{ username: userData.username }, { email: userData.email }] }).exec(function (err, user) {
        if (err) { return next(err); }
        if (user) { return res.send(400, 'Bad request - user with such username or email already exists'); }

        User.create(userData, function (err, user) {
            if (err) { return next(err); }

            res.send(201, generateSigninResponse(user));
        });
    });
};

exports.login = function(req, res, next) {
    var userData = req.body;

    if (!userData.username || !userData.password) {
        return res.send(400, 'Bad request - username or password is missing');
    }

    userData.username = userData.username.trim();
    userData.password = userData.password.trim();

    User.findOne({ username: userData.username }, function (err, user) {
        if (err) { return next(err); }
        if (!user) { return res.send(400, 'Bad request - invalid username'); }

        if (!user.authenticate(userData.password)) {
            return res.send(400, 'Bad request - invalid password');
        }

        res.send(200, generateSigninResponse(user));
    });
};

exports.deleteUser = function(req, res, next) {
    User.findByIdAndRemove(req.params.id, function (err) {
        if (err) { return next(err); }

        res.send(200);
    });
};

exports.getCurrentUser = function(req, res, next) {
    res.send(req.user);
};

exports.regGcm = function(req, res, next) {
    var regId = req.body.regId;

    if (!regId) {
        return res.send(400, 'Bad request - registration id is missing');
    }

    var user = req.user;

    if (user.regIds) {
        if (user.regIds.indexOf(regId) == -1) {
            user.regIds.push(regId);
        } else {
            return res.send(200);
        }
    } else {
        user.regIds = [regId];
    }

    user.save(function(err) {
        if (err) return next(err);

        req.app.emit('reg', { userId: user.id.toString(), regId: regId });

        res.send(200);
    });
};

exports.unregGcm = function(req, res, next) {
    var regId = req.body.regId;

    if (!regId) {
        return res.send(400, 'Bad request - registration id is missing');
    }

    var user = req.user;

    if (user.regIds) {
        var idx = user.regIds.indexOf(regId);
        if (idx !== -1) {
            user.regIds.splice(idx, 1);
            user.markModified('regIds');
        }
    }

    user.save(function(err) {
        if (err) return next(err);

        req.app.emit('unreg', { userId: user.id.toString(), regId: regId });


        res.send(200);
    });
};