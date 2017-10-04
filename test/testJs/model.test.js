module("Model test",{
	
});

test("Cube()",function(){
	var cube=new Cube;
	equals(cube.getType(),0);
	
	cube.setType(2);
	equals(cube.getType(),2);
});

test("NextCubes()",function(){
	var nextcubes=new NextCubes;
	ok(nextcubes.models);
//	console.log(nextcubes);
	equals(nextcubes.models.length , nextcubes.get("height"));
	var width=Math.floor( Math.random() * nextcubes.get("height"));
	equals(nextcubes.models[width].length, nextcubes.get("width"));
});

test("BaseModel()",function(){
	var game=new BaseModel({width:10,height:20});
	equals(game.get("width"),10);
	equals(game.get("height"),20);
	game.initMatrix();
	ok(game.get("matrix"));
	ok(game.dupMatrix());
});

//测试控制 器
test("NextCubesModel()",function(){
	var cubes=new NextCubesModel;
	ok(cubes.get("matrix"));
});
