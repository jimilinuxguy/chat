	
	var express = require('express');
	var bodyParser = require('body-parser');
	var cookieParser = require('cookie-parser');
	var session = require('express-session');
	var app = express();
	var http = require('http').Server(app);
	var database;
	var io = require('socket.io')(http);
	var passport = require('passport');
	var FacebookStrategy = require('passport-facebook');
	var TwitterStrategy = require('passport-twitter');
	var InstagramStrategy = require('passport-instagram');

            var authConfig = require('./authConfig.js');
	
	mongoose = require('mongoose');
	hash = require('./pass').hash;
	chat = require('./chat.js').chat(io);

	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(cookieParser('suckit roger'));
	app.use(session());
	app.use(passport.initialize());
	app.use(passport.session());

	mongoose.connect("mongodb://localhost/chat");

	UserSchema = new mongoose.Schema(
		{
			fullName : String,
			local : {
			    password: String
			},
			fb : {
				id           : String,
				token        : String,
				email        : String,
				name         : String,
                                                photo       : String,
			},
			twitter : {
				id : String,
				token : String,
				email : String,
				displayName : String,
				username : String,
				photo : String,
			},
			instagram : {
				id : String,
				token: String,
				username : String,
				fullName : String,
				photo : String,
			}
		}
	);

	User = mongoose.model('users', UserSchema);



passport.use('facebook', new FacebookStrategy({
  clientID        : authConfig.facebook.appID,
  clientSecret    : authConfig.facebook.appSecret,
  callbackURL     : authConfig.facebook.callbackUrl,
  profileFields: ['id', 'name','picture.type(small)', 'emails', 'displayName', 'about', 'gender']
},
 
  // facebook will send back the tokens and profile
  function(access_token, refresh_token, profile, done) {
    process.nextTick(function() {
        findUser(profile,'facebook',done,access_token);     
    });
    
    })
);
    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
        //	console.log('deserializing');
        //	console.dir(user);
        	if (user.twitter.id) {
        		user.username = user.twitter.username;
        		user.photo = user.twitter.photo;
        	} else if ( user.fb.id) {
        		user.username = user.fb.email;
                        user.photo = user.fb.photo;
        	} else if ( user.instagram.id) {
        		user.username = user.instagram.username;
        		user.photo = user.instagram.photo;
        	}
            done(err, user);
        });
    });

    // =========================================================================
    // TWITTER =================================================================
    // =========================================================================
    passport.use(new TwitterStrategy({

        consumerKey     : authConfig.twitter.consumerKey,
        consumerSecret  : authConfig.twitter.consumerSecret,
        callbackURL     : authConfig.twitter.callbackURL

    },
    function(token, tokenSecret, profile, done) {

        // make the code asynchronous
    // User.findOne won't fire until we have all our data back from Twitter
        process.nextTick(function() {

            findUser(profile,'twitter',done,token);
    });

    }));

	passport.use(new InstagramStrategy({
	    clientID: authConfig.instagram.clientID,
	    clientSecret: authConfig.instagram.clientSecret,
	    callbackURL: authConfig.instagram.callbackURL
	  },
	  function(accessToken, refreshToken, profile, done) {
                    findUser(profile,'instagram',done,accessToken);
	    }
	));

            function findUser(profile,type,done,token) {
                var query = {};
                if ( type == 'instagram') {
                    query['instagram.id'] = profile.id;
                } else if ( type =='facebook') {
                    query['fb.id'] = profile.id;
                } else if ( type == 'twitter') {
                    query['twitter.id'] = profile.id;
                }

                User.findOne(query, function(err,user) {
                    if (err) {
                        return done(err);
                    } 
                    if (user) {
                        return done(null,user);
                    } else {
                        createUser(profile,type,done,token);
                    }
                });
            }

            function createUser(profile,type,done,token) {
                    var newUser = new User();

                if ( type == 'instagram') {
                    foo = JSON.parse(profile._raw);
                    newUser.instagram.id = profile.id;
                    newUser.instagram.username = profile.username;
                    newUser.instagram.fullName = profile.displayName;
                    newUser.instagram.photo = foo.data.profile_picture;  
                } else if (type == 'twitter') {
                    newUser.twitter.id          = profile.id;
                    newUser.twitter.token       = token;
                    newUser.twitter.username    = profile.username;
                    newUser.twitter.displayName = profile.displayName;
                    newUser.twitter.photo = profile.photos[0].value;
                } else if (type == 'facebook') {
                    newUser.fb.id    = profile.id; // set the users facebook id                 
                    newUser.fb.access_token = token; // we will save the token that facebook provides to the user                    
                    newUser.fb.firstName  = profile.name.givenName;
                    newUser.fb.lastName = profile.name.familyName; // look at the passport user profile to see how names are returned
                    newUser.fb.name  = profile.name.givenName + ' ' + profile.name.familyName;
                    newUser.fb.email = profile.emails[0].value; // facebook can return multiple emails so we'll take the first
                    newUser.fb.photo = profile.photos[0].value; 
                } else{
                    return done(null,null);
                }
                
                newUser.save(function(error){
                return done(null,newUser);
                });

            }


	auth = require('./auth.js');
	router = require('./router.js').router(app,express,auth,passport);


	http.listen(3000, function() {
		console.log('listening on *:3000');
	});

