var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');
//Mongo stuff
var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/chatspeak');
var chatDB = db.get('chat');

var players = 1; //start user id numbering at 1

var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);

//server.listen(3000);
app.set('port', process.env.PORT || 3000);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//serve static page
app.get('/', function(req, res) {
  res.sendfile(__dirname + '/public/test.html');
});

var guid = (function() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
               .toString(16)
               .substring(1);
  }
  return function() {
    return s4() + s4() + '' + s4() + '' + s4() + '' +
           s4() + '' + s4() + s4() + s4();
  };
})();

function generateAuth () {
    var id = players++;
    var code = guid();
    console.log("code:"+code);
    return [id, code];
}

io.sockets.on('connection', function (socket) {
	var playerID;
    var roomName;
    var numInRoom = []; 
    socket.on('authenticate', function(id, code) {
        //checkID(id,code)
        var newCode;
        if(id) {
            playerID = id;
            //check(auth codes)
            newCode = code;  
        } else {
            gen = generateAuth();
            playerID = gen[0];
            newCode = gen[1];
            console.log("New User Connected:" + playerID);
        }
        socket.emit('updateAuth', playerID, newCode);
    });
    
	socket.on('joinRoom', function(room) {
        roomName = room;
    	socket.join(room);       
        chatDB.find({room:room}, ['playerID', 'message'], function (err, docs){
            socket.emit('resetChat', docs);
            console.log(docs);
        });
        
    	numInRoom.room+=1;
    	console.log("Player: " + playerID + " joined Room: " + room);
    });
    socket.on('getChat', function (message) {
        var username = playerID;
        chatDB.insert({ room: roomName, playerID: playerID, message: message}, 
            function (err, doc) {
                if (err) throw err;
            }
        );
        io.to(roomName).emit('getChat', username, message);
        console.log(username+ ": " + message);
    });
    socket.on('newRoom', function () {
        roomName = guid();
		socket.join(roomName);
		numInRoom.room+=1;
		console.log("Player: " + playerID + " joined Room: " + roomName);
        io.sockets.emit('updateGameID', roomName);
    });
});
server.listen(app.get('port'), function() {
	console.log("Server listening on port " + app.get('port'));
});
