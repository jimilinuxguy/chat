requirejs.config({
    baseUrl: '/scripts/',
    paths: {
        jquery  : 'http://code.jquery.com/jquery-2.1.4.min',
        bootstrap : 'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/js/bootstrap.min',
        socketio : '/socket.io/socket.io',
        knockout : 'http://ajax.aspnetcdn.com/ajax/knockout/knockout-3.1.0'
    },
    shim : {
        "bootstrap" : { "deps" :['jquery'] }
    },
    deps: ['jquery','bootstrap']
});
