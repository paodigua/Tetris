define(['jquery', 'backbone', "basemodel"], function($, Backbone, basemodel) {
	//一个方块模型
	var square = basemodel.BaseModel.extend({
		matrixArray: [
			//直长条
			[
				[0, 1, 0, 0],
				[0, 1, 0, 0],
				[0, 1, 0, 0],
				[0, 1, 0, 0]
			],
			//z形
			[
				[0, 0, 0, 0],
				[1, 1, 0, 0],
				[0, 1, 1, 0],
				[0, 0, 0, 0]
			],
			//反z形
			[
				[0, 0, 0, 0],
				[0, 1, 1, 0],
				[1, 1, 0, 0],
				[0, 0, 0, 0]
			],
			//倒T
			[
				[0, 0, 0, 0],
				[0, 1, 0, 0],
				[1, 1, 1, 0],
				[0, 0, 0, 0]
			],
			//正方
			[
				[0, 0, 0, 0],
				[0, 1, 1, 0],
				[0, 1, 1, 0],
				[0, 0, 0, 0]
			],
			//7形
			[
				[0, 0, 0, 0],
				[1, 1, 0, 0],
				[0, 1, 0, 0],
				[0, 1, 0, 0]
			],
			//反7形
			[
				[0, 0, 0, 0],
				[0, 1, 1, 0],
				[0, 1, 0, 0],
				[0, 1, 0, 0]
			]
		],
		initialize: function(obj) {
			this.set({ width: 4, height: 4 });

			if(obj.random || obj.type !== undefined) {
				this.changeType(obj.type);
			} else {
				this.initMatrix();
			}
		},
		changeType: function(type) {
			var i = type;
			if(i === undefined || i < 0 || i > this.matrixArray.length) {
				i = Math.floor(Math.random() * this.matrixArray.length);
			}
			this.set({ type: i });
			this.set({ matrix: this.matrixArray[i] });
		}
	});

	//定时器模型
	var TimerModel = Backbone.Model.extend({
		defaults: {
			callback: function() {},
			speed: 1000,
			timer: null,
			min: 100
		},
		initialize: function(obj) {
			obj.speed && this.set({ speed: obj.speed });
			obj.min && this.set({ min: obj.min });

		},
		launch: function() { //启动
			this.attributes.timer = setInterval(this.get("callback"), this.get("speed"));
		},
		pause: function() {
			clearInterval(this.attributes.timer);
			this.attributes.timer = null;
		},
		reset: function() { //
			this.pause();
			this.launch();
		},
		addSpeed: function(subtrahend) {
			var res = this.get("speed");
			if(res - subtrahend > this.get("minSpeed")) {
				this.set({ "speed": res });
			} else {
				this.set({ "speed": this.get("minSpeed") });
			}
		}
	});

	//计算分数的模型
	var ScoreModel = Backbone.Model.extend({
		defaults: {
			score: 0
		},
		bonusPoint: function(key) {
			switch(key) {
				case 1:
					this.attributes.score += 10;
					break;
				case 2:
					this.attributes.score += 20;
					break;
				case 3:
					this.attributes.score += 40;
					break;
				case 4:
					this.attributes.score += 50;
					break;
			}
		},
		init: function() {
			this.set({ "score": 0 });
		}
	});

	var StopwatchModel = Backbone.Model.extend({
		defaults: {
			consume: 0
		},
		initialize: function(obj) {
			this.consume = 0;
			this.set(obj);
		},
		launch: function() {
			var self = this;
			this.t = setTimeout(function() {
				self.attributes.consume++;
				if(self.get("callback")) {
					self.get("callback").apply(self, arguments); //回调函数
				}
				self.launch();

			}, 1000);
		},
		stop: function() {
			clearTimeout(this.t);
			this.t = null;
		},
		init: function() {
			this.set({ "consume": 0 });
		}
	});

	return {
		SquareModel: square,
		TimerModel: TimerModel,
		ScoreModel: ScoreModel,
		StopwatchModel: StopwatchModel
	};
});