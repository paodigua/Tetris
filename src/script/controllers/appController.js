define(["jquery", "backbone", "controllers", "models"], function($, Backbone, Controllers, Models) {
	//主控制器
	var AppView = Backbone.View.extend({
		el: $(document),
		initialize: function(doms) {

			this.gameController = new Controllers.GameCtrl({ //生成游戏区实例
				el: doms.gameDiv,
				width: doms.width || 10,
				height: doms.height || 20,
				template: doms.template
			});

			//预告区控制器
			this.nextSquareController = new Controllers.NextSquareCtrl({
				el: doms.nextDiv,
				template: doms.template
			});
			//导入计分控制器
			this.scoreCtrl = new Controllers.ScoreCtrl({
				el: doms.scoreDiv
			});

			//导入游戏时间秒表控制器
			this.stopwatch = new Controllers.StopwatchCtrl({ //这里是直接用model来当控制器使用
				el: doms.timeDiv
			});

			//导入方块下落定时器
			var self = this;
			this.timer = new Models.TimerModel({
				callback: function() {
					var e = jQuery.Event("keydown");
					e.keyCode = 40;
					e.which = 40;
					self.el.trigger(e);
				},
				speed: 1000
			});

			/* 游戏状态：
			 *   0  游戏未开始
			 *   1  游戏开始
			 *   2  游戏暂停
			 *   4 游戏重新开始
			 *   8  游戏结束 
			 * 
			 */
			this.template = doms.statusDiv; //游戏状态
			this.socket = doms.socket;

			this.callback = doms.callback;

			this.bindListener();

			this.gameStatus = 0; //默认游戏未开始		

			this.bind("gameInit", this.gameInit);
			this.bind("gameOver", this.gameOver);
			this.bind("gameStart", this.gameStart);
			this.bind("gamePause", this.gamePause);
			this.bind("gamePlay", this.gamePlay);

		},
		bindListener: function() {
			var self = this;
			this.socket.on("lines", function(data) {
				self.gameController.addBotLines(data.lines);
				if(data.IsOver) {
					self.gameOver("noEmit");
				}
			});

			//			this.socket.on("gameover", function(data) {
			//				self.gameOver(data);
			//			});
		},
		render: function() {
			this.gameController.render();
			//			this.nextSquareController.render();
		},
		/*
		 *  游戏区，预告区 刷空白
		 */
		gameInit: function() {
			this.gameController.render();
			this.nextSquareController.render();
			this.scoreCtrl.render();
			this.stopwatch.render();
		},
		/*游戏开始：
		 * 更改游戏状态
		 *   游戏状态栏更改
		 * 启动游戏时间  
		 *   发送socket信息当前游戏时间
		 * 将预告区方块导入游戏区
		 *   发送方块type，在对方端生成
		 * 启动自动下落方块时间控制器
		 *   发送下落启动消息 move
		 * 预告区生成新方块
		 * 	 发送新预先区方块type
		 * 
		 * 绑定鼠标按键事件
		 * 
		 * 渲染页面
		 */
		gameStart: function() {
			this.gameStatus = 1;

			this.stopwatch.launch(); //启动秒表
			this.socket.emit("time"); //发送秒表信息
			//游戏开始前预告区的model数据内全是0，所以要生成一个有数据的方块
			this.nextSquareController.newModel({
				random: true
			});
			this.__leadInSquare(); //预告区方块导入游戏区，并生成新预告区方块

			this.bindKeyEvent(); //绑定键盘事件

			this.timer.launch(); //启动方块下落计时器
			//			this.socket.emit("move");

			this.render(); //刷新游戏区
		},
		/*游戏结束：
		 *  更改游戏状态
		 *  停止游戏时间
		 *  停止下落动作
		 *  解除键盘事件
		 *   发送对方端游戏结束消息
		 * 
		 */
		gameOver: function(noEmit) {

			console.log("game over")
			this.gameStatus = 8;
			this.stopwatch.stop();
			this.timer.pause();

			this.stopKeyEvent();
			this.template.html("游戏结束！");
			if(noEmit !== "noEmit") {
				this.socket.emit("gameover"); //发送自身游戏结束 
			}
			if(this.callback.gameOver) {
				this.callback.gameOver.apply(this, arguments);
			}
		},
		/*游戏暂停：
		 *  更改游戏状态
		 *  停止游戏时间
		 *  停止下落动作
		 *  解除键盘事件
		 *   发送对方端游戏暂停消息
		 * 
		 */
		gameStop: function() {
			this.gameStatus = 2;
			this.stopwatch.stop();
			this.timer.pause();

			this.stopKeyEvent();
			this.template.html("游戏暂停！");

			this.socket.emit("gamestop");

		},
		/* 游戏取消暂停
		 *	 更改游戏状态
		 *  启动游戏时间
		 *  启动下落动作
		 *  绑定键盘事件
		 *   发送对方端游戏重新开始消息
		 */
		gamePlay: function() {
			this.gameStatus = 4;
			this.stopwatch.launch();
			this.timer.launch();

			this.bindKeyEvent();
			this.template.html("游戏重新开始！");

			this.socket.emit("gameplay");
		},
		/* 游戏中：
		 *  键盘事件
		 *    右、左、旋转 为普通移动
		 *      无效动作不发送消息
		 *    下 判断是否到底
		 * 		是：
		 *  	  发送一个down消息
		 *      否：
		 *        发送fixed等消息
		 *        判断是否游戏失败
		 * 		   是：
		 *  		游戏结束 
		 * 		   否：
		 * 			判断是否能消行--》加分 
		 * 			     由对方客户端判断是否可消行，
		 * 			    且获取分数两方自行添加 

		 *  		将预告区方块添加 
		 * 			  发送 leadin 消息,带入{x,y,type}//type其实只需不用发
		 *          生成新预告区方块
		 *           发送next消息 {type}
		 *    直下 
		 *      发送多个down消息，直接只能发送一个fixed消息，
		 * 		后续操作同上面的“下”
		 * 	       注：可能会由于网络原因导致fall下落过程中就会被fixed，
		 * 		   所以fall不发送fixed消息，而是直接下落后自动fixed
		 *          fall ===  down*N + fixed
		 * 
		 */
		gameMain: function(e) {
			var event = e || window.event;
			var keycode = event.keyCode ? event.keyCode : event.which;
			var prevent = false; //判断是否阻止浏览器默认事件

			var fixedHandler = function() {
				this.gameController.fixed();
				this.socket.emit("fixed");

				if(this.gameController.checkGameOver()) {
					this.gameOver(); //游戏结束 
				}

				var lines = this.gameController.clearlines();
				if(lines) {
					this.scoreCtrl.change(lines);
					switch(lines) {
						case 2:
						case 3:
							this.callback.clearlines && this.callback.clearlines.call(this, 1);
							break;
						case 4:
							this.callback.clearlines && this.callback.clearlines.call(this, 2);
							break;
						default:
							break;
					}

				}
				this.__leadInSquare();
			};
			switch(keycode) {
				case 37: //left
					prevent = true;
					this.gameController.left();
					this.socket.emit("left");
					break;

				case 38: //rotate
					prevent = true;
					this.gameController.rotate(); //e传入事件对象
					this.socket.emit("rotate");
					break;

				case 39: //right
					prevent = true;
					this.gameController.right();
					this.socket.emit("right");
					break;

				case 32: //space
					prevent = true;
					var count = this.gameController.fall();
					this.socket.emit("fall", count);
					fixedHandler.apply(this);
					break;

				case 40: //down
					prevent = true;

					var res = this.gameController.down();
					if(!res) {
						fixedHandler.apply(this);
					} else {
						this.socket.emit("down");
					}
					break;

				default:
					break;
			}

			this.render();
			if(prevent) {
				if(event.preventDefault) 
					event.preventDefault(); 
				else {
					event.returnValue = false;  //IE中阻止函数器默认动作的方式 
					return false;
				}
			}
		},

		bindKeyEvent: function() {
			var self = this;
			this.el.bind("keydown", function(e) {
				self.gameMain(e);
			});
		},
		stopKeyEvent: function() {
			this.el.unbind("keydown");
		},
		__leadInSquare: function() {
			var gameCtrl = this.gameController;
			var pos = gameCtrl.leadInSquare({ //返回游戏区下落方块的位置
				model: this.nextSquareController.model
			});

			var curtype = this.nextSquareController.model.get("type");
			this.nextSquareController.newModel({ random: true }); //生成一个新方块
			var nexttype = this.nextSquareController.model.get("type");
			this.socket.emit("next", {
				curType: curtype,
				x: pos.x,
				y: pos.y,
				nextType: nexttype
			});
		}
	});
	var RemoteView = Backbone.View.extend({
		el: $(document),
		initialize: function(doms) {

			this.gameController = new Controllers.GameCtrl({ //生成游戏区实例
				el: doms.gameDiv,
				width: doms.width || 10,
				height: doms.height || 20,
				template: doms.template
			});

			//预告区控制器
			this.nextSquareController = new Controllers.NextSquareCtrl({
				el: doms.nextDiv,
				template: doms.template
			});

			//导入计分控制器
			this.scoreCtrl = new Controllers.ScoreCtrl({
				el: doms.scoreDiv
			});

			//导入游戏时间秒表控制器
			this.stopwatch = new Controllers.StopwatchCtrl({ //这里是直接用model来当控制器使用
				el: doms.timeDiv
			});

			this.template = doms.statusDiv; //游戏状态

		},
		render: function() {
			this.gameController.render();
			this.nextSquareController.render();
			this.scoreCtrl.render();
		},
		addBotLines: function(nums) {
			var lines = [];
			for(var i = 0; i < nums; i++) {
				var res = this.gameController.addBotLines();
				lines.push(res.line);
				if(res.IsOver) {
					break;
				}
			}
			return {
				lines: lines,
				IsOver: res.IsOver
			};
		},
		bindListener: function(socket, callback) {
			var self = this;
			socket.on("lines", function() {

			});
			socket.on("gameover", function() {

				//结束定时器
				self.stopwatch.stop();
				callback.gameOver && callback.gameOver();
			});
			/*
			 *  预告区方块导入，
			 *  提供位置pos
			 */
			socket.on("next", function(data) {
				var n = new Models.SquareModel({ type: data.curType });
				self.gameController.leadInSquare({
					model: n,
					x: data.x,
					y: data.y
				});
				self.gameController.render(); //刷新 ， 因该不需要
				self.nextSquareController.newModel({ type: data.nextType }); //自己刷新
			});
			socket.on("down", function(data) {
				self.gameController.down();
				self.gameController.render();
			});

			socket.on("left", function(data) {
				self.gameController.left();
				self.gameController.render();
			});

			socket.on("right", function(data) {
				self.gameController.right();
				self.gameController.render();
			});

			socket.on("fall", function(data) {
				self.gameController.fall();
				//			for(var i=0;i<data;i++){
				//				self.gameController.down();
				//			}

			});

			socket.on("rotate", function(data) {
				self.gameController.rotate();
				self.gameController.render();
			});

			socket.on("fixed", function(data) {
				self.gameController.fixed();
				//自动判断加分和消行
				var lines = self.gameController.clearlines();
				if(lines) {
					self.scoreCtrl.change(lines);
					//添加干扰行，发送干扰行消息
				}
				self.gameController.render();
			});

			socket.on("time", function(data) {
				self.stopwatch.launch();
			});

		}
	});
	return {
		LocalCtrl: AppView,
		RemoteCtrl: RemoteView
	};

});