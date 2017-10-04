define(['jquery', 'backbone'], function($, Backbone) {
	////原型模型
	var baseModel = Backbone.Model.extend({
		initialize: function(obj) {
			this.set(obj);
		},
		//用于初始化二维数组
		initMatrix: function() {
			var h = this.get("height"),
				w = this.get("width");
			var matrix = [];
			for(var i = 0; i < h; i++) {
				var tmp = [];
				for(var j = 0; j < w; j++) {
					tmp.push(0);
				}
				matrix.push(tmp);
			}
			this.set({ matrix: matrix });
		},
		dupMatrix: function() {
			var e = this.get("matrix");
			var matrix = [];
			for(var i = 0; i < e.length; i++) {
				var tmp = [];
				for(var j = 0; j < e[0].length; j++) {
					tmp.push(e[i][j]);
				}
				matrix.push(tmp);
			}

			return matrix;
		},
		merge: function(squareData, x, y, ) { //将当前数据与方块squareData数据合并 ，合并坐标x,y,并返回合并后的结果 
			var arrs = this.dupMatrix();
			//将下落中的方块加入
			for(var i = 0; i < squareData.length; i++) {
				if(i + y >= arrs.length || i + y < 0) {
					continue;
				}
				for(var j = 0; j < squareData[i].length; j++) {
					if(j + x < 0 || j + x >= arrs[0].length) continue; //防止未显示出来为0的数据越界

					if(squareData[i][j] === 1) {
						arrs[i + y][j + x] = squareData[i][j];
					}
				}
			}
			return arrs;
		},
		fixed: function(squareData, x, y) { //方块到底后固定在页面上,返回值判断游戏是否结束 
			var dbarr = this.merge(squareData, x, y);
			if(dbarr == null) return true;
			for(var i = 0; i < dbarr.length; i++) {
				for(var j = 0; j < dbarr[0].length; j++)
					if(dbarr[i][j] === 1) {
						dbarr[i][j] = 2;
					}
			}
			this.set({ "matrix": dbarr });
			return false;
		},
		clearLine: function() { //清除行
			var clearlns = 0;
			var canClear;
			var arrs = this.dupMatrix();
			for(var i = arrs.length - 1; i >= 0; i--) {
				canClear = true;
				for(var j = 0; j < arrs[i].length; j++) {
					if(arrs[i][j] === 0) {
						canClear = false;
						break;
					}
				}
				if(canClear) {
					arrs.splice(i, 1);
					clearlns++;
				}
			}
			var tmp = [];
			for(var i = 0; i < this.get("width"); i++) {
				tmp.push(0);
			}
			for(var i = 0; i < clearlns; i++) {
				arrs.unshift(tmp.concat([]));
			}
			this.set({ "matrix": arrs });
			return clearlns;
		}
	});
	return {
		BaseModel: baseModel
	};
});