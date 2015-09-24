module.exports.chat = function(io) {

    var RoomSchema = new mongoose.Schema(
        {
            roomname : String,
            users : [mongoose.Schema.Types.Mixed]
        }
    );


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
}

