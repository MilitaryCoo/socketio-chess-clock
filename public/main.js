/* global io */

$(function() {
  console.log("Initializing...");

  var minutes = [$("#minutes0"), $("#minutes1")];
  var seconds = [$("#seconds0"), $("#seconds1")];
  var tenths = [$("#tenths0"), $("#tenths1")];
  var $btn0 = $("#btn0");
  var $btn1 = $("#btn1");
  var $pause = $("#pause");
  var $pwdBtn = $("#submitPwd");
  var $pwd = $(".pwdInput");
  var $login = $("#login");
  var $chessclock = $("#chessclock");
  var $roomLabel = $("#roomId");
  var $time = $("#time");

  var death = [false, false];
  var roomId = "test";
  var connected = false;
  $chessclock.hide();

  const increment = 100; // 1/10 second
  const MINUTE_IN_INCREMENTS = 60 * 10;
  const DEATH_CLOCK = 5 * 60 * 10; // death clock

  let isRunning = [false, false];
  let interval = [];
  let timerTime = [];

  var COLORS = [
    "#e21400",
    "#91580f",
    "#f8a700",
    "#f78b00",
    "#58dc00",
    "#287b00",
    "#a8f07a",
    "#4ae8c4",
    "#3b88eb",
    "#3824aa",
    "#a700ff",
    "#d300e7"
  ];

  console.log("constants set...");

  // Initialize variables
  var $window = $(window);

  var socket = io();

  // Forces input to text
  function cleanInput(input) {
    return $("<div/>")
      .text(input)
      .text();
  }

  (function($) {
    $.fn.activate = function() {
      this.addClass("act");
      this.removeClass("inact");
      if (this.is("button")) this.attr("disabled", false);
      return this;
    };
  })(jQuery);
  (function($) {
    $.fn.deactivate = function() {
      this.addClass("inact");
      this.removeClass("act");
      if (this.is("button")) this.attr("disabled", true);
      return this;
    };
  })(jQuery);

  function setRoomId() {
    roomId = cleanInput($pwd.val().trim());

    if (roomId) {
      $login.fadeOut();
      $chessclock.show();
      var enteredTimerTime = getTimerTime();
      console.log('Time set to ' + enteredTimerTime);
      var data = {"roomId":roomId, "totalTime":enteredTimerTime};
      socket.emit("join room", data);
    }
  }
  
  function getTimerTime() {
    var t = parseInt(cleanInput($time.val().trim()));
    
    console.log("Entered time => " + t);
    
    if (t && Number.isInteger(t)) {
      return t * MINUTE_IN_INCREMENTS;
    } else {
      return 45 * MINUTE_IN_INCREMENTS;
    }
  }

  function pauseClocks() {
    console.log("Pausing clocks...");
    if (isRunning[0] || isRunning[1]) {
      pauseTimers();
      socket.emit("pause all", {
        room: roomId,
        running: isRunning,
        timeValues: timerTime
      });
    }
    for (let i = 0; i < 2; i++) {
      $("#btn" + i).activate();
      $("#clock" + i).activate();
    }
    $pause.deactivate();
  }

  function clickClock(id) {
    console.log("Clock " + id + " clicked");
    var data = { clockId: 1 ^ id, room: roomId, timeValues: timerTime };
    socket.emit("start", data);
    startClock(1 ^ id);
    var data = { clockId: id, room: roomId, timeValues: timerTime };
    socket.emit("pause", data);
    pauseTimer(id);
  }

  function startClock(id) {
    if (isRunning[id]) return;
    isRunning[id] = true;
    console.log("in startClock " + id);
    interval[id] = setInterval(function() {
      incrementTimer(id);
    }, increment);
    console.log(interval);
    var player = id + 1;
    var act_id = 1 - id;
    // active button
    $("#btn" + act_id).deactivate();
    $("#clock" + act_id).deactivate();
    // inactive button
    $("#btn" + id).activate();
    $("#clock" + id).activate();
    // pause button
    $pause.activate();
  }

  function updateTimes() {
    for (let id = 0; id < 2; id++) {
      console.log('timer' + id +' : ' + timerTime[id]);
      var numberOfMinutes = Math.floor(Math.abs(timerTime[id]) / MINUTE_IN_INCREMENTS);
      var numberOfSeconds = Math.floor(
        (Math.abs(timerTime[id]) - numberOfMinutes * MINUTE_IN_INCREMENTS) / 10
      );
      var numberOfTenths = Math.abs(timerTime[id]) % 10;
      seconds[id].text(pad(numberOfSeconds));
      minutes[id].text(pad(numberOfMinutes));
      tenths[id].text(numberOfTenths);
      if (timerTime[id] < 0) {
        death[id] = true;
        $("#clock" + id).addClass("death");
        if (Math.abs(timerTime[id]) > DEATH_CLOCK) {
          pauseClocks();
          minutes[id].text('💀💀');
          seconds[id].text('💀💀');
        } // Game ends
      }
    }
  }

  function incrementTimer(id) {
    timerTime[id]--;
    updateTimes();
  }

  function pauseTimer(id) {
    isRunning[id] = false;
    console.log("Clock " + id + " pausing...");
    clearInterval(interval[id]);
    console.log("Clock " + id + " paused");
  }

  function pauseTimers() {
    console.log("Pausing clocks...");
    pauseTimer(0);
    pauseTimer(1);
    console.log("Clocks paused");
  }

  function setTimes(timeValues) {
    timerTime = timeValues;
    console.log(timerTime);
    updateTimes();
  }

  function pad(number) {
    return number < 10 ? "0" + number : number;
  }

  function makeid(length) {
    var result = "";
    // exclude I and O to reduce confusion
    var characters = "ABCDEFGHJKLMNPQRSTUVWXYZ"; //abcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    console.log("Autogenerated room id:" + result);
    return result;
  }

  // Click events

  $btn0.click(function() {
    clickClock(0);
  });
  $btn1.click(function() {
    clickClock(1);
  });
  $pause.click(pauseClocks);

  $pwdBtn.click(setRoomId);

  console.log("added event listeners");
  //// Socket events

  // Whenever the server emits 'start', start the clock

  socket.on("start", function(data) {
    console.log("Received start for clock " + data.clockId);
    setTimes(data.timeValues);
    startClock(data.clockId);
  });

  // Whenever the server emits 'pause', pause both clocks

  socket.on("pause all", function(data) {
    console.log("Pausing both clocks");
    pauseTimers();
    setTimes(data.timeValues);
  });

  socket.on("pause", function(data) {
    console.log("pausing clock" + data.clockId);
    pauseTimer(data.clockId);
    setTimes(data.timeValues);
  });

  socket.on("connect", function() {
    console.log("client connected");
    var roomId = makeid(4);
    $pwd.val(roomId);
  });

  socket.on("times", function(data) {
    setTimes(data.timeValues);
    console.log("got times" + data.timeValues);
  });

  socket.on("login", function(data) {
    connected = true;
    console.log("logged in");
    $roomLabel.text(data.roomId);
  });

  //socket.on("ping", function(data) {
  // startClock(0);
  //});
});
