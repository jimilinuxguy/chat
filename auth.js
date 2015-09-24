module.exports.authenticate =  function (name, pass, fn) {
        if (!module.parent) console.log('authenticating %s:%s', name, pass);

        User.findOne({
            username: name
        },

        function (err, user) {
            if (user) {
                
                if (err) {
                    return fn(new Error('cannot find user'));
                }
                hash(pass, user.salt, function (err, hash) {
                    if (err){
                        return fn(err);
                    }
                    if (hash == user.hash) {
                        return fn(null, user);
                    }
                    fn(new Error('invalid password'));
                });
            } else {
                return fn(new Error('cannot find user'));
            }
        });

    };


module.exports.requiredAuthentication = function (req, res, next) {
        if (req.session.user) {
            next();
        } else {
            req.session.error = 'Access denied!';
            res.redirect('/login');
        }
    }

module.exports.userExist = function (req, res, next) {
        User.count({
            username: req.body.username
        }, function (err, count) {
            if (count === 0) {
                next();
            } else {
                req.session.error = "User Exist"
                res.redirect("/signup");
            }
        });
    }