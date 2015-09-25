module.exports.router = function(app,express,auth,passport) {
    app.use('/scripts', express.static('assets/scripts'));
    app.use('/styles', express.static('assets/styles'));

    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');

    app.use(function (req, res, next) {
        var err = req.session.error,
         msg = req.session.success;
        delete req.session.error;
        delete req.session.success;
        res.locals.message = '';
        if (err) res.locals.message = '<p class="msg error">' + err + '</p>';
        if (msg) res.locals.message = '<p class="msg success">' + msg + '</p>';
        res.locals.session = req.session;
        next();
    });
    
        app.get('/', function(req, res) {
        if(!req.session.user) {
            res.redirect('/login');
        } else {
            res.redirect('/chat');
        }
    });

    app.get('/chat', isLoggedIn, function(req,res) {
        console.dir(req.user);
        res.render('chat', {user : req.user});
    });

    app.get("/login", function (req, res) {
        res.render("login");
    });
    /*
    app.get("/signup", function (req, res) {
        if (req.session.user) {
            res.redirect("/");
        } else {
            res.render("signup");
        }
    });
*/

    app.get('/logout', function (req, res) {
        req.session.destroy(function () {
            res.redirect('/');
        });
    });

    app.get('/profile', auth.requiredAuthentication, function (req, res) {
        res.send('Profile page of '+ req.session.user.username +'<br>'+' click to <a href="/logout">logout</a>');
    });

    app.post("/login", function(req,res) {
            console.dir(req.body);
         auth.authenticate(req.body.username, req.body.password, function (err, user) {
            if (user) {
                req.session.regenerate(function () {
                    req.session.user = user;
                    req.session.success = 'Authenticated as ' + user.username + ' click to <a href="/logout">logout</a>. ' + ' You may now access <a href="/restricted">/restricted</a>.';
                    res.locals.session = req.session;
                    res.redirect('/chat');
                });
            } else {
                req.session.error = 'Authentication failed, please check your ' + ' username and password.';
                res.redirect('/login');
            }
        });
    });

    app.post("/signup", auth.userExist, function (req, res) {
        var password = req.body.password;
        var username = req.body.username;

        hash(password, function (err, salt, hash) {
            if (err) throw err;
            var user = new User({
                username: username,
                salt: salt,
                hash: hash,
            }).save(function (err, newUser) {
                if (err) throw err;
                auth.authenticate(newUser.username, password, function(err, user){
                    if(user){
                        req.session.regenerate(function(){
                            req.session.user = user;
                            req.session.success = 'Authenticated as ' + user.username + ' click to <a href="/logout">logout</a>. ' + ' You may now access <a href="/restricted">/restricted</a>.';
                            res.redirect('/');
                        });
                    }
                });
            });
        });
    }); 

    // route for facebook authentication and login
    // different scopes while logging in
    app.get('/login/facebook', 
      passport.authenticate('facebook', { scope : 'email' }
    ));
     
    // handle the callback after facebook has authenticated the user
    app.get('/login/facebook/callback',
      passport.authenticate('facebook', {
        successRedirect : '/chat',
        failureRedirect : '/'
      })
    );

    app.get('/login/twitter', passport.authenticate('twitter'));

    // handle the callback after twitter has authenticated the user
    app.get('/login/twitter/callback',
        passport.authenticate('twitter', {
            successRedirect : '/chat',
            failureRedirect : '/'
        }));

app.get('/login/instagram',
  passport.authenticate('instagram'));

app.get('/login/instagram/callback', 
  passport.authenticate('instagram', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/chat');
  });
    app.use(function(req, res, next) {
        res.status(404).render('404');
    });


    app.use(function(err, req, res, next) {
      console.error(err.stack);
      res.status(500).send('Something broke!');
    });

        // route middleware to make sure a user is logged in
    function isLoggedIn(req, res, next) {

        // if user is authenticated in the session, carry on
        if (req.isAuthenticated())
            return next();

        // if they aren't redirect them to the home page
        res.redirect('/');
    }

}