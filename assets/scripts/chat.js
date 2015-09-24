requirejs(['./common'], function (common) {

    require(['jquery','socketio','knockout'], function($,io,ko) {
        //$ points to jQuery
        socket = io();
        socket.emit('setNick', $('#username').val() );
        socket.emit('join','server');

        chatModel = {
            messages : ko.observableArray([]),
            isMe : function(nick) {
                return nick == $('#username').val()
            },
            getImg : function(nick) {
                if (nick == $('#username').val() ) {
                    return "http://placehold.it/50/FA6F57/fff&text=ME";
                } else {
                    nick = nick.substring(0,2);
                    return "http://placehold.it/50/55C1E7/fff&text=" + nick;
                }
            }
        }

        ko.applyBindings(chatModel);

         socket.on('message', function(data) {
            chatModel.messages.push(data);
         });

         socket.on('users', function(data) {
            console.dir(data);
         });

         $(document).on('click', '#btn-chat', function(){
            message = $('#btn-input').val();
            socket.emit('message', { message: message, room : $('#room').val() } );
            $('#btn-input').val('');
         });
    });

});