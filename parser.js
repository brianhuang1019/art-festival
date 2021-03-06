var ownedParameter = 1.5;	// 搶地的難度
var threeLandsBonus = 1.5;	// 同類型三土地bonus
var moneyUpperBound = 1;	// 出價上限

var landTypes = {
	a: "affection",
	c: "career",
	e: "entertainment",
	d: "health",
	b: "learning"
};

var landTypesInverse = {
	affection: "a",
	career: "c",
	entertainment: "e",
	health: "d",
	learning: "b"
}

var specialtiesTable = {
	a: 10,
	b: 10,
	c: 10,
	d: 10,
	e: 10
}

var boards = [
	'a13', 'e12', 'e13', 'd13', 'c15', 'e14', 'c16', 'e15', 'b13', 'd14', 'd15', 'e16', 'b14', 'b15', 'd16', 'c17', 'b16', 'a14', 'e17', 'a12',
	'b17', 'd17', 'c18', 'a15', 'a16', 'a17', 'd18', 'a18', 'e19', 'c19', 'e20', 'b18', 'c20', 'd19', 'd20', 'b19', 'b20', 'a19', 'a20', 'e18',
	'b8', 'b9', 'b10', 'e9', 'a9', 'b11', 'c9', 'd11', 'c10', 'c14', 'e10', 'c12', 'c13', 'a10', 'b12', 'c11', 'a11', 'e11', 'd12', 'c8',
	'e2', 'c1', 'a1', 'a2', 'c2', 'b1', 'b2', 'a3', 'a4', 'a5', 'e4', 'd2', 'e3', 'd1', 'b3', 'c3', 'b4', 'c4', 'b5', 'e1',
	'c6', 'a6', 'c7', 'd3', 'd4', 'b6', 'd5', 'd6', 'e5', 'e6', 'a7', 'd7', 'a8', 'd9', 'd8', 'e8', 'e7', 'd10', 'b7', 'c5'
]

var all_lands = require('./db.js').lands;
var land_a = all_lands[landTypes.a];
var land_c = all_lands[landTypes.c];
var land_e = all_lands[landTypes.e];
var land_h = all_lands[landTypes.d];
var land_l = all_lands[landTypes.b];

function countCategory(category, a, p, i) {
	var db = require('./db.js');
	var position = db.bonus.talentBonus.position;
	var appearance = db.bonus.talentBonus.appearance;
	var IQ = db.bonus.talentBonus.IQ;
	category.affection = 0 + (p*position.affection + a*appearance.affection + i*IQ.affection);
	category.career = 0 + (p*position.career + a*appearance.career + i*IQ.career);
	category.entertainment = 0 + (p*position.entertainment + a*appearance.entertainment + i*IQ.entertainment);
	category.health = 0 + (p*position.health + a*appearance.health + i*IQ.health);
	category.learning = 0 + (p*position.learning + a*appearance.learning + i*IQ.learning);
	return category;
}

function illegalLand(landQuery) {
	var type = landQuery.type;
	var num = landQuery.num;
	if (type != 'a' && type != 'c' && type != 'e' && type != 'b' && type != 'd')
		return true;
	if (num <= 0 || num > 20)
		return true;
	return false;
}

function timeTranslate(timeLeft) {
	var time = timeLeft.hours*3600 + timeLeft.mins*60 + timeLeft.secs;
	return time;
}

function timeObjTranslate(time) {
	var obj = {};
	obj.hours = Math.floor(time / 3600);
	obj.mins = Math.floor((time % 3600) / 60);
	obj.secs = Math.floor((time % 3600) % 60);
	obj.milliseconds = 0;
	return obj;
}

function enoughMoney(user, money) {
	var timeLeft = user.timeLeft;
	var time = timeTranslate(timeLeft);
	if (time >= money)
		return true;
	else 
		return false;
}

function illegalMoney(land, money) {
	var price = land.price;
	if (money >= 1 && money <= (price*moneyUpperBound))
		return false;
	else
		return true;
}

function userHasLand(user, land) {
	if (user.lands[land.longType] == null)
		return false;
	if (user.lands[land.longType].indexOf(land.num) > -1)
		return true;
	else
		return false;
}

function isOwned(user, land) {
	if (land.owner._id == -1)
		return false;
	if (land.owner._id != user._id)
		return true;
	return false;
}

function ifSpecialties(user, landQuery) {
	var lands = user.lands[landQuery.longType];
	var specialNum = specialtiesTable[landQuery.type];
	if (lands == null)
		return false;
	if (lands.indexOf(specialNum) > -1)
		return true;
	else
		return false;
}

function countProbability(user, land, money, landQuery, landOwned) {
	var price = land.price;
	var category = land.category;
	if (landOwned)
		price *= ownedParameter;
	var probability = land.probability;

	// if user has specialties
	var specialties = ifSpecialties(user, landQuery);
	if (specialties && land.level == 4)
		price /= 2;

	// if user has >= 6 lands of specific type
	if (user.lands[category].length >= 6)
		probability = 80;

	probability = probability * (money/price) + user.category[landQuery.longType] * 0.5;

	if (probability < 0)
		return 0;
	if (probability > 100)
		return 100;
	return probability;
}

// generate a int between low to high
function randomInt (low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}

// decide win or lose
function gamble(probability) {
	var random = randomInt(0, 100);
	if (random <= probability)
		return true;
	else
		return false;
}

function tryToBuy(user, land, money, landQuery, landOwned) {
	var probability = countProbability(user, land, money, landQuery, landOwned);
	var success = gamble(probability);
	if (success)
		return true;
	else 
		return false
}

function addInterest(a, c, e, h, l) {
	var interest = 0;
	var tmp;
	if (a != null && a[0] != -1) {
		tmp = 0;
		for (var i = 0; i < a.length; i++)
			tmp += land_a[a[i]-1].interest;
		if (a.length >= 3)
			tmp *= threeLandsBonus;
		interest += tmp;
	}
	if (c != null && c[0] != -1) {
		tmp = 0;
		for (var i = 0; i < c.length; i++)
			tmp += land_c[c[i]-1].interest;
		if (c.length >= 3)
			tmp *= threeLandsBonus;
		interest += tmp;
	}
	if (e != null && e[0] != -1) {
		tmp = 0;
		for (var i = 0; i < e.length; i++)
			tmp += land_e[e[i]-1].interest;
		if (e.length >= 3)
			tmp *= threeLandsBonus;
		interest += tmp;
	}
	if (h != null && h[0] != -1) {
		tmp = 0;
		for (var i = 0; i < h.length; i++)
			tmp += land_h[h[i]-1].interest;
		if (h.length >= 3)
			tmp *= threeLandsBonus;
		interest += tmp;
	}
	if (l != null && l[0] != -1) {
		tmp = 0;
		for (var i = 0; i < l.length; i++)
			tmp += land_l[l[i]-1].interest;
		if (l.length >= 3)
			tmp *= threeLandsBonus;
		interest += tmp;
	}
	return interest;
}

function makeHTML(tag, msg, color) {
	var colour = 'black';
	if (color)
		colour = color;
	return '<' + tag + ' style="color:' + colour + ';">' + msg + '</' + tag + '>';
}

module.exports = {
	welcomeMsg: function() {
		var result = '<title>Manual</title><h1 style="color:#6f502c;">Manual';
		result += makeHTML('h3', '(red = high frequency)', '#dfb102');
		result += makeHTML('h4', '/user/dead?user=');
		result += makeHTML('h4', '/user/data?user=', 'red');
		result += makeHTML('h4', '/user/time?user=', 'red');
		result += makeHTML('h4', '/user/init/all');
		result += makeHTML('h4', '/user/init?id=&deviceId=&name=&a=&p=&i=');
		result += makeHTML('h4', '/land/stand?land=&user=');
		result += makeHTML('h4', '/land/importance?land=');
		result += makeHTML('h4', '/land/data?land=', 'red');
		result += makeHTML('h4', '/land/buy?land=&user=&money=', 'red');
		result += makeHTML('h4', '/land/init');
		result += makeHTML('h4', '/board/init?board=&land=');
		result += makeHTML('h4', '/board/occupy?board=');
		result += makeHTML('h4', '/time/sync/:dir', '#cea300');
		result += makeHTML('h4', '/time/start', '#cea300');
		result += makeHTML('h4', '/time/stop', '#cea300');
		result += makeHTML('h4', '/center');
		result += makeHTML('h4', '/center/speed?speed=');
		result += makeHTML('h4', '/bonus');
		result += '</h1>';
		return result;
	},
	parseLands: function(landStr) {
		return landStr.split(",");
	},
	parseLandType: function(landStr) {
		var obj = {};
		obj['type'] = landStr.match(/[A-Za-z]+/)[0];
		obj['longType'] = landTypes[obj['type']];
		obj['num'] = landStr.match(/\d+/)[0] - 0;
		return obj;
	},
	initUser: function(user, query) {
		var appearance = query.a;
  		var position = query.p;
  		var IQ = query.i;
		user._id = query.id;
  		user.name = query.name;
  		user.deviceId = query.device;
		user.talent = {
			position: position,
			appearance: appearance,
			IQ: IQ
		};		
		user.category = countCategory(user.category, appearance, position, IQ);
		return user;
	},
	parseEmptyArr: function(lands) {
		if (lands.affection.length == 1 && lands.affection[0] == -1)
			lands.affection = [];
		if (lands.career.length == 1 && lands.career[0] == -1)
			lands.career = [];
		if (lands.entertainment.length == 1 && lands.entertainment[0] == -1)
			lands.entertainment = [];
		if (lands.health.length == 1 && lands.health[0] == -1)
			lands.health = [];
		if (lands.learning.length == 1 && lands.learning[0] == -1)
			lands.learning = [];
		return lands;
	},
	buyLand: function(user, land, money, landQuery) {
		// if illegal land
		if (illegalLand(landQuery))
			return {
				success: false,
				message: "這個土地不存在喔 ༼;´༎ຶ ۝ ༎ຶˋ༽"
			};

		// if enough money
		if (!enoughMoney(user, money))
			return {
				success: false,
				message: "您的時間不夠啦 ╚(ಠ_ಠ)=┐"
			};

		// if illegal money
		if (illegalMoney(land, money))
			return {
				success: false,
				message: "不能出這個價錢啦 (づ｡◕‿‿◕｡)づ ᄽὁȍ ̪őὀᄿ"
			};

		// if already owned
		if (userHasLand(user, landQuery))
			return {
				success: false,
				message: "您已擁有此成就囉 ヾ(๑╹◡╹)ﾉ'"
			};

		// 判斷是否收購
		var landOwned = isOwned(user, land);

		// 判斷機率
		if (tryToBuy(user, land, money, landQuery, landOwned)) {
			var obj = {
				success: true,
				message: "獲得成就啦 ✌(-‿-)✌",
				targetID: null
			};
			if (landOwned)
				obj.targetID = land.owner._id;
			return obj;
		}
		else 
			return {
				probability: countProbability(user, land, money, landQuery, landOwned),
				success: false,
				message: "沒拿到成就，怒！ ヽ(`Д´)ﾉ ヽ(`Д´)ﾉ ヽ(`Д´)ﾉ"
			}
	},
	countInterest: function(lands) {
		//判斷是否有特殊加成
		var a = lands[landTypes.a];
		var c = lands[landTypes.c];
		var e = lands[landTypes.e];
		var h = lands[landTypes.d];
		var l = lands[landTypes.b];

		var interest = addInterest(a, c, e, h, l);

		return interest;
	},
	countTime: function(timeLeft, money) {
		var time = timeTranslate(timeLeft);
		time -= money;
		var timeObj = timeObjTranslate(time);
		if (timeLeft.interest != null)
			timeObj.interest = timeLeft.interest;
		return timeObj;
	},
	illegalLand: function(landQuery) {
		var type = landQuery.type;
		var num = landQuery.num;
		if (type != 'a' && type != 'c' && type != 'e' && type != 'b' && type != 'd')
			return true;
		if (num <= 0 || num > 20)
			return true;
		return false;
	},
	parseDead: function(msg) {
		var lands = [], dead = {
			firstStage: {
				affection: false,
				career: false,
				entertainment: false,
				health: false,
				learning: false
			},
			fourthStage: {
				affection: false,
				career: false,
				entertainment: false,
				health: false,
				learning: false
			},
			secondStage: {
				affection: false,
				career: false,
				entertainment: false,
				health: false,
				learning: false
			},
			thirdStage: {
				affection: false,
				career: false,
				entertainment: false,
				health: false,
				learning: false
			}
		};
		for (var i = 0; i < msg.length; i++) {
			if (msg[i].type == 'buy' || msg[i].type == 'hunt')
				lands.push(msg[i].land[0]);
		}
		//lands = ['d1', 'a2', 'd3', 'd4', 'd5', 'd11', 'd17', 'd11', 'd13', 'd1', 'd20'];

		// decide stage
		var stage = [[], [], [], []];
		if (lands.length < 8) {
			var quote = Math.floor(lands.length / 2);
			var remainer = lands.length % 2;
			var index = 0;
			for (var i = 0; i < quote; i++) {
				stage[i].push(lands[index]);
				index += 1;
				stage[i].push(lands[index])
				index += 1;
			}
			if (remainer == 1)
				stage[i].push(lands[index]);
		}
		else {
			var quote = Math.floor(lands.length / 4);
			var remainer = lands.length % 4;
			var index = 0;
			for (var j = 0; j < 4; j++) {
				for (var i = 0; i < quote; i++) {
					stage[j].push(lands[index]);
					index += 1;
				}
			}
			for (var i = 0; i < remainer; i++) {
				stage[3].push(lands[index]);
				index += 1;
			}
		}

		console.log(stage);
		// decide dead
		for (var i = 0; i < stage[0].length; i++) {
			if (stage[0][i] == 'a')
				dead.firstStage.affection = true;
			if (stage[0][i] == 'b')
				dead.firstStage.learning = true;
			if (stage[0][i] == 'c')
				dead.firstStage.career = true;
			if (stage[0][i] == 'd')
				dead.firstStage.health = true;
			if (stage[0][i] == 'e')
				dead.firstStage.entertainment = true;
		}
		for (var i = 0; i < stage[1].length; i++) {
			if (stage[1][i] == 'a')
				dead.secondStage.affection = true;
			if (stage[1][i] == 'b')
				dead.secondStage.learning = true;
			if (stage[1][i] == 'c')
				dead.secondStage.career = true;
			if (stage[1][i] == 'd')
				dead.secondStage.health = true;
			if (stage[1][i] == 'e')
				dead.secondStage.entertainment = true;
		}
		for (var i = 0; i < stage[2].length; i++) {
			if (stage[2][i] == 'a')
				dead.thirdStage.affection = true;
			if (stage[2][i] == 'b')
				dead.thirdStage.learning = true;
			if (stage[2][i] == 'c')
				dead.thirdStage.career = true;
			if (stage[2][i] == 'd')
				dead.thirdStage.health = true;
			if (stage[2][i] == 'e')
				dead.thirdStage.entertainment = true;
		}
		for (var i = 0; i < stage[3].length; i++) {
			if (stage[3][i] == 'a')
				dead.fourthStage.affection = true;
			if (stage[3][i] == 'b')
				dead.fourthStage.learning = true;
			if (stage[3][i] == 'c')
				dead.fourthStage.career = true;
			if (stage[3][i] == 'd')
				dead.fourthStage.health = true;
			if (stage[3][i] == 'e')
				dead.fourthStage.entertainment = true;
		}

      	return dead;
	},
	// parseDead: function(user) {
	// 	var dead = user.dead;
	// 	var a = user.lands.affection;
 //      	var c = user.lands.career;
 //      	var e = user.lands.entertainment;
 //      	var h = user.lands.health;
 //      	var l = user.lands.learning;
 //      	if (a.length >= 1 && a[0] != -1)
 //      	  dead.fourthStage.affection = true;
 //      	if (a.length >= 2)
 //      	  dead.thirdStage.affection = true;
 //      	if (a.length >= 3)
 //      	  dead.secondStage.affection = true;
 //      	if (a.length >= 4)
 //      	  dead.firstStage.affection = true;
 //      	if (c.length >= 1 && c[0] != -1)
 //      	  dead.fourthStage.career = true;
 //      	if (c.length >= 2)
 //      	  dead.thirdStage.career = true;
 //      	if (c.length >= 3)
 //      	  dead.secondStage.career = true;
 //      	if (c.length >= 4)
 //      	  dead.firstStage.career = true;
 //      	if (e.length >= 1 && e[0] != -1)
 //      	  dead.fourthStage.entertainment = true;
 //      	if (e.length >= 2)
 //      	  dead.thirdStage.entertainment = true;
 //      	if (e.length >= 3)
 //      	  dead.secondStage.entertainment = true;
 //      	if (e.length >= 4)
 //      	  dead.firstStage.entertainment = true;
 //      	if (h.length >= 1 && h[0] != -1)
 //      	  dead.fourthStage.health = true;
 //      	if (h.length >= 2)
 //      	  dead.thirdStage.health = true;
 //      	if (h.length >= 3)
 //      	  dead.secondStage.health = true;
 //      	if (h.length >= 4)
 //      	  dead.firstStage.health = true;
 //      	if (l.length >= 1 && l[0] != -1)
 //      	  dead.fourthStage.learning = true;
 //      	if (l.length >= 2)
 //      	  dead.thirdStage.learning = true;
 //      	if (l.length >= 3)
 //      	  dead.secondStage.learning = true;
 //      	if (l.length >= 4)
 //      	  dead.firstStage.learning = true;
 //      	return dead;
	// },
	getProbability: function(user, land, money, landQuery) {
		// 判斷是否收購
		var landOwned = isOwned(user, land);
		var prob = countProbability(user, land, money, landQuery, landOwned);
		return prob;
	},
	landTransfer: function(number) {
		var land = boards[number-1];
		return land;
	},
	landTransferNum: function(land) {
		var index = boards.indexOf(land);
		return (index+1);
	},
	parseRawLand: function(lands) {
		var landArr = [];
		if (lands.affection[0] != -1) {
			var tmp = landTypesInverse['affection'];
			for (var i = 0; i < lands.affection.length; i++) {
				var index = boards.indexOf(tmp + lands.affection[i]);
				landArr.push(index+1);
			}
		}
		if (lands.career[0] != -1) {
			var tmp = landTypesInverse['career'];
			for (var i = 0; i < lands.career.length; i++) {
				var index = boards.indexOf(tmp + lands.career[i]);
				landArr.push(index+1);
			}
		}
		if (lands.entertainment[0] != -1) {
			var tmp = landTypesInverse['entertainment'];
			for (var i = 0; i < lands.entertainment.length; i++) {
				var index = boards.indexOf(tmp + lands.entertainment[i]);
				landArr.push(index+1);
			}
		}
		if (lands.health[0] != -1) {
			var tmp = landTypesInverse['health'];
			for (var i = 0; i < lands.health.length; i++) {
				var index = boards.indexOf(tmp + lands.health[i]);
				landArr.push(index+1);
			}
		}
		if (lands.learning[0] != -1) {
			var tmp = landTypesInverse['learning'];
			for (var i = 0; i < lands.learning.length; i++) {
				var index = boards.indexOf(tmp + lands.learning[i]);
				landArr.push(index+1);
			}
		}
		return landArr;
	}
}