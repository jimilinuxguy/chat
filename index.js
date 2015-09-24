	
	var express = require('express');
	var bodyParser = require('body-parser');
	var cookieParser = require('cookie-parser');
	var session = require('express-session');
	var app = express();
	var http = require('http').Server(app);
	var io = require('socket.io')(http);
	var database;

	mongoose = require('mongoose');
	hash = require('./pass').hash;


	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(cookieParser('suckit roger'));
	app.use(session());
	app.use('/scripts', express.static('assets/scripts'));
	app.use('/styles', express.static('assets/styles'));

	app.set('views', __dirname + '/views');
	app.set('view engine', 'ejs');

	mongoose.connect("mongodb://localhost/chat");

	var UserSchema = new mongoose.Schema(
		{
		    username: String,
		    password: String,
		    salt: String,
		    hash: String
		}
	);

	var RoomSchema = new mongoose.Schema(
		{
			roomname : String,
			users : [mongoose.Schema.Types.Mixed]
		}
	);

	var User = mongoose.model('users', UserSchema);
	var RoomModel = mongoose.model('rooms', RoomSchema);

	RoomModel.count({roomname: 'server'}, function(err,count) {

		if ( count == 0 ) {
			var room = new RoomModel({roomname: 'server'}).save(function(err,save){
				if (save) {
					console.log('created server room');
				} else {
					console.log('Error creating server room');
				}
			});
		} else {
			RoomModel.findOne({roomname:'server'}, function(err,room){
				console.dir(room);
			});
		}
	});


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

	app.get('/chat', function(req,res) {
		if (!req.session.user) {
			console.dir(res);
			res.redirect('/login');
		}
		res.render('chat');
	});

	app.get("/login", function (req, res) {
	    res.render("login");
	});

	app.get("/signup", function (req, res) {
	    if (req.session.user) {
	        res.redirect("/");
	    } else {
	        res.render("signup");
	    }
	});

	app.get('/logout', function (req, res) {
	    req.session.destroy(function () {
	        res.redirect('/');
	    });
	});

	app.get('/profile', requiredAuthentication, function (req, res) {
	    res.send('Profile page of '+ req.session.user.username +'<br>'+' click to <a href="/logout">logout</a>');
	});

	app.post("/login", function(req,res) {
		 	console.dir(req.body);
		 authenticate(req.body.username, req.body.password, function (err, user) {
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

	app.post("/signup", userExist, function (req, res) {
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
	            authenticate(newUser.username, password, function(err, user){
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


	io.on('connection', function(socket) {

		console.log('user connected');
		socket.on('join', function(roomName){
			socket.join(roomName);
			RoomModel.findOne({roomname:roomName}, function(err,room) {
				room.users.addToSet(socket.nick);
				room.save(function(err,room){
					io.sockets.in(roomName).emit('users', room.users);
				});
			});
			socket.to(roomName).emit('message', { user: 'Server', room : roomName, message : socket.nick +' joined'});
		});	

		socket.on('setNick', function(nick) {
			console.log('nick = ' + nick);
			if ( nick == null ) { // Disconnect sockets that do not have a nick name
				socket.disconnect();
				return false; 
			} else {
				socket.nick = nick;
				io.sockets.emit('message', { user : 'Server' , message :  nick + ' connected'} );

			}
		});

		socket.on('disconnect', function(){
			console.log('user disconnected');
			io.emit('message', { user : 'Server' , room : 'server', message :  socket.nick + ' disconnected'} );
			RoomModel.find({users:socket.nick}, function(err,rooms) {

				rooms.forEach(function(room){
					room.users.pull(socket.nick);
					room.save();
				});
			});
		});

		socket.on('message', function(data){
			msg = data.message; 
			timestamp = Date.now();
			message = { user : socket.nick, room: data.room, message : msg, timestamp: timestamp};
			console.dir(message);
			io.sockets.in(data.room).emit('message', message);
		});

		socket.on('typing', function(data){
			io.sockets.in(data.room).emit('typing', { user: socket.nick });
		});

	});

	http.listen(3000, function() {
		console.log('listening on *:3000');
	});

	function isAuthorized(socket) {
		return socket.verified;
	}

	function authenticate(name, pass, fn) {
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

	}

	function requiredAuthentication(req, res, next) {
	    if (req.session.user) {
	        next();
	    } else {
	        req.session.error = 'Access denied!';
	        res.redirect('/login');
	    }
	}

	function userExist(req, res, next) {
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