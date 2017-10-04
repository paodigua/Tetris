define(['jquery', "backbone", 'basemodel',
	'models','jquery.tmpl'
], function(jQuery, Backbone, basemodel, Models,) {
	var $=jQuery;

	var NextSquareCtrl = Backbone.View.extend({
				initialize: function(obj) {
					this.model = new Models.SquareModel();

					this.template = obj.template; //这里获取了dom元素，可能会获取不到
					_.bindAll(this, "render");
					this.el = obj.el;
					if(obj.pos) { this.pos = obj.pos; }
					this.render();
				},
				render: function() {
					var arrs = this.model.get("matrix");
					var eleView = "";
					var element = jQuery.tmpl(this.template, { dbArray: this.model.get("matrix") });
					this.el.html(element);
					return this;
				},
				newModel: function(obj) {
					this.model = new Models.SquareModel(obj);

					this.render();
				}
			});
			
		var GameCtrl = Backbone.View.extend({
				initialize: function(obj) {
					this.model = new basemodel.BaseModel({ width: obj.width, height: obj.height }); //导入数据模型
					this.model.initMatrix(); //初始化二维数组

					this.el = obj.el;
					this.template = obj.template; //这里获取了dom元素，可能会获取不到

					this.curSquareModel = null; //当前下落的方块，初始化时不存在

					this.bind('change', this.render);
				},
				render: function() {
					//			this.nextSquareController.render(); //刷新预告区

					var arrs;
					if(this.curSquareModel) { //当有方块进入游戏界面时
						arrs = this.model.merge(this.curSquareModel.get("matrix"),
							this.curSquareModel.xpos,
							this.curSquareModel.ypos);
					} else {
						arrs = this.model.dupMatrix();
					}

					this.el.html(jQuery.tmpl(this.template, { dbArray: arrs }));
					return this;
				},
				leadInSquare: function(square) { //将预告区方块添加到游戏区
					this.clearSquare(); //删除原有模型 
					this.curSquareModel = square.model; //将下落中的方块控制器添加
					//			console.log(this.curSquareModel)
					var x, y;
					if(square.x === undefined) {
						x = Math.floor(Math.random() * (this.model.get("width") - this.curSquareModel.get("width")));
					} else { x = square.x }
					if(square.y === undefined) {
						y = -(this.curSquareModel.get("height"));
					} else { y = square.y }

					this.curSquareModel.xpos = x;
					this.curSquareModel.ypos = y;

					return { x: this.curSquareModel.xpos, y: this.curSquareModel.ypos };
				},

				clearSquare: function() {
					this.curSquareModel && delete this.curSquareModel;
				},
				checkGameOver: function() { //验证是否游戏结束
					var arr = this.curSquareModel.get("matrix");
					for(var i = 0; i < arr.length; i++) {
						if(i + this.curSquareModel.ypos < 0) {
							for(var j = 0; j < arr[i].length; j++) {
								if(arr[i][j]) {
									return true;
								}
							}
						}
					}
					return false;
				},
				//判断背景内下落方块位置是否在合法范围
				isValid: function(checkType) {
					var x = this.curSquareModel.xpos;
					var y = this.curSquareModel.ypos;
					//			console.log("xy",x,y)
					var curCubearr = this.curSquareModel.get("matrix");
					var bgarr = this.model.get("matrix");
					var self = this;
					var check = function(posx, posy) {
						posx += x;
						posy += y;
						//				console.log("pos",posx,posy)
						if(posx < 0 || posx >= bgarr[0].length) {
							return false;
						} else if(posy >= bgarr.length) {
							return false;
						} else if(posy < 0) {
							return true;
						} else if(bgarr[posy][posx] === 2) {
							return false;
						}
						return true;
					};

					switch(checkType) {
						case "down":
							y += 1;
							break;
						case "left":
							x -= 1;
							break;
						case "right":
							x += 1;
							break;
						case "rotate":
							curCubearr = arguments[1]; //当为旋转时，函数的第二参数为旋转后的方块位置
							break;
						default:
							break;
					}

					for(var i = 0; i < curCubearr.length; i++) {
						for(var j = 0; j < curCubearr[i].length; j++) {
							if(curCubearr[i][j] === 1 && !check(j, i)) {
								return false;
							}
						}
					}
					return true;
				},
				fall: function(e) {
					var count = 0;
					while(this.down(e)) {
						count++;
					}
					return count;
				},
				rotate: function(e) {
					var cubesArr = this.curSquareModel.get("matrix");
					var res = [];
					for(var i = 0; i < cubesArr[0].length; i++) {
						res.push([]);
					}
					for(var i = 0; i < cubesArr.length; i++) {
						for(var j = 0; j < cubesArr[0].length; j++) {
							res[cubesArr[0].length - 1 - j][i] = cubesArr[i][j];
						}
					}

					if(this.isValid("rotate", res)) {
						this.curSquareModel.set({ "matrix": res });
						return true;
					}
					return false;

				},
				right: function(e) {
					if(this.isValid("right")) {
						this.curSquareModel.xpos++;
						return true;
					}
					return false;
				},
				left: function(e) {
					if(this.isValid("left")) {
						this.curSquareModel.xpos--;
						return true;
					}
					return false;
				},
				down: function(e) {
					if(this.isValid("down")) {
						this.curSquareModel.ypos++;
						return true;
					} else {
						return false;
					}

				},
				fixed: function() {
					this.model.fixed(this.curSquareModel.get("matrix"), //固定底部方块
						this.curSquareModel.xpos,
						this.curSquareModel.ypos);
				},
				clearlines: function() {
					return this.model.clearLine(); //消除行效果，返回消除行数，用以计分
				},
				addBotLines: function(lines) { //干扰，在底部增加随机产生的一行方块
					var arr = this.model.dupMatrix();
					if(lines && lines.length) {
						for(var i = 0; i < lines.length; i++) {
							arr.shift();
							arr.push(lines[i]);
						}
					} else {
						//判断其最顶一行是否有方块，如有则要结束游戏
						var gameIsOver = false;
						var tmp = [];
						for(var i = 0; i < arr[0].length; i++) {
							if(arr[0][i]) {
								gameIsOver = true;
							}
							tmp[i] = Math.round(Math.random()) ? 2 : 0;
						}
						arr.shift();
						arr.push(tmp);
					}
					this.model.set({ matrix: arr });
					return {
						IsOver: gameIsOver,
						line: tmp
					};
				}
			});	
			
			var ScoreCtrl = Backbone.View.extend({
				initialize: function(obj) {
					this.el = obj.el;
					this.model = new Models.ScoreModel;
					if(obj.score) {
						this.model.set({ score: obj.score });
					}
				},
				render: function() {
					this.el.html(this.model.get("score"));
				},
				change: function(key) {
					this.model.bonusPoint(key);
					this.render();
				},
				init: function() {
					this.model.init();
				}
			});
			
			var StopwatchCtrl = Backbone.View.extend({
				initialize: function(obj) {
					this.el = obj.el;
					var self = this;
					this.model = new Models.StopwatchModel({
						callback: function() {
							self.render();
						}
					});
					if(obj.consume) {
						this.set({ "consume": obj.consume });
					}
				},
				render: function() {
					this.el.html(this.model.get("consume"));
				},
				stop: function() {
					this.model.stop();
				},
				launch: function() {
					this.model.launch();
				},
				init: function() {
					this.model.init();
				},
				times: function() {
					return this.model.get("consume");
				}
			});
			
	return {
		NextSquareCtrl: NextSquareCtrl,
		GameCtrl:  GameCtrl,
		ScoreCtrl: ScoreCtrl,
		StopwatchCtrl: StopwatchCtrl
	};
})