	
	var express = require('express');
	var bodyParser = require('body-parser');
	var cookieParser = require('cookie-parser');
	var session = require('express-session');
	var app = express();
	var http = require('http').Server(app);
	var database;
	var io = require('socket.io')(http);

	mongoose = require('mongoose');
	hash = require('./pass').hash;
	chat = require('./chat.js').chat(io);
	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(cookieParser('suckit roger'));
	app.use(session());

	mongoose.connect("mongodb://localhost/chat");

	UserSchema = new mongoose.Schema(
		{
		    username: String,
		    password: String,
		    salt: String,
		    hash: String
		}
	);

	User = mongoose.model('users', UserSchema);

	auth = require('./auth.js');
	router = require('./router.js').router(app,express,auth);


	http.listen(3000, function() {
		console.log('listening on *:3000');
	});

