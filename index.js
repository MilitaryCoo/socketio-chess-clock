// Setup basic express server
var express = require("express");
var app = express();
var server = require("http").createServer(app);
var io = require("socket.io")(server);
var port = process.env.PORT || 3000;
var timerTimes = {test:[45*600,45*600]};

const CLOCK_TIME = 45 * 60 // in seconds

server.listen(port, function() {
  console.log("Server listening at port %d", port);
});

// Routing
app.use(express.static("public"));

function initializeRoom(data){
  timerTimes[data.roomId] = [data.totalTime * 60, data.totalTime * 60];
};

io.on("connection", function(socket) {
  var joinedRoom = false;
  
  // when a user joins a room, emit an event
  
  socket.on("join room", function(data){
    if(joinedRoom) return;
    joinedRoom = true;
    var roomId = data.roomId;
    var totalTime = data.totalTime;
    socket.join(roomId);
    socket.emit('login', {roomId:roomId});
    if(!(roomId in timerTimes)) {
      initializeRoom(data);
      console.log('created room ' + roomId + 'with ' + totalTime + ' minutes');
    }
    socket.emit('times', {timeValues:timerTimes[roomId]});
  });
  
  // when the user pauses, broadcast the pause
  socket.on('pause all', function(data) {
    var room = data.room
    timerTimes[room] = data.timeValues;
    console.log('pausing all');
    socket.to(room).broadcast.emit('pause all', data);

  });

  socket.on('pause', function(data){
    var room = data.room;
    timerTimes[room] = data.timeValues;
    socket.to(room).broadcast.emit('pause', data);
  });
  
  socket.on('start', function(data) {
    console.log('Received start: ' + data.clockId);
    var room = data.roomId;
    timerTimes[room] = data.timeValues;
    socket.to(data.room).broadcast.emit('start', data);
  });
    
  //socket.on('gimme times', function(data){
  //  var pwd = data.password; 
  //  socket.emit('times', {password:pwd, timeValues:timerTimes[pwd]});
  //  console.log('sent times to client');
  //})
});
