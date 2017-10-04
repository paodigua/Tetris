requirejs.config({
	paths: {
		'jquery': "./../lib/jquery/jquery",
		"jquery.tmpl": "./../lib/jquery/jquery.tmpl",
		"underscore": "./../lib/underscore/underscore",
		"backbone": "./../lib/backbone/backbone",
		
		"socket.io":"./socket.io",

		"basemodel": "./models/basemodel",
		"models": "./models/models",
		"controllers": "./controllers/controllers",
		"appcontroller": "./controllers/appController",
		
	},
	shim:{

		"backbone":{
			deps:["underscore"],
			exports:"Backbone"
		},
		"jquery":{
			exports:"jQuery",
			init:function($){
				return $;
			}
		},
		"jquery.tmpl":['jquery']
	}
});

require(['jquery', 'appcontroller', 'socket.io','backbone','underscore'], 
	function(jQuery, appController, io,Backbone,underscore) {

	jQuery(function($) {
		var BGWIDTH = 10;
		var BGHEIGHT = 20; //游戏区宽高
		var DROPSPEED = 1000; //下落速度

		var socket = io("ws://localhost:3000");
		var localGrade = {};
		var remoteGrade = {};
		var GameIsOver = [false, false];

		var GameTimer = setInterval(function() {
			if(GameIsOver[0] && GameIsOver[1]) {
				clearInterval(GameTimer);
				//结算成绩
				var local = parseInt(localGrade.score * 100 / localGrade.times);
				var remote = parseInt(remoteGrade.score * 100 / remoteGrade.times);
				console.log(local, remote)
				if(local > remote) {
					$("#waiting").html("你赢了！");
				} else if(local < remote) {
					$("#waiting").html("你输了！");
				}else{
					$("#waiting").html("平局！");
				}
			}
		}, 100);

		var AppSetting = {
			gameDiv: $("#local_game"),
			nextDiv: $("#local_next"),
			timeDiv: $("#local_time"),
			scoreDiv: $("#local_score"),
			statusDiv: $("#local_status"),
			template: $("#cube-template").html(),
			socket: socket,
			callback: {
				gameOver: function() {
					GameIsOver[0] = true;
					localGrade.times = this.stopwatch.times();
					localGrade.score = this.scoreCtrl.model.get("score");
				},
				clearlines: function(nums) {
					var res = remoteView.addBotLines(nums);
					socket.emit("lines", res);
				}
			}
		};

		var App = new appController.LocalCtrl(AppSetting);
		
		var remoteView = new appController.RemoteCtrl({
			gameDiv: $("#remote_game"),
			nextDiv: $("#remote_next"),
			timeDiv: $("#remote_time"),
			scoreDiv: $("#remote_score"),
			template: $("#cube-template").html(),
		});
	

		remoteView.bindListener(socket, {
			gameOver: function() {
				GameIsOver[1] = true;
				remoteGrade.times = remoteView.stopwatch.times();
				remoteGrade.score = remoteView.scoreCtrl.model.get("score");
			}
		});

		socket.on("waiting", function(str) {
			document.getElementById("waiting").innerHTML = str;
			App.gameInit();
			remoteView.render();
		});
		socket.on("start", function(str) {
			document.getElementById("waiting").innerHTML = "game start";
			App.gameStart();
			remoteView.render();
		})
	});
});