'use strict';

class Vec2 {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}

	get length() {
		return Math.sqrt(x*x+y*y);
	}

	add(v) {
		this.x += v.x;
		this.y += v.y;
	}

	addPt(x, y) {
		this.x += x;
		this.y += y;
	}

	multiply(a) {
		this.x *= a;
		this.y *= a;
	}

	dot(v) {
		return (this.x*v.x + this.y*v.y);
	}
}


function toLPos(v) {
	let vec = new Vec2(v.x, v.y);
	vec.multiply(100);
	return vec;
}

function toWPos(v) {
	let vec = new Vec2(v.x, v.y);
	vec.multiply(0.01);
	vec.x = Math.round(vec.x);
	vec.y = Math.round(vec.y);
	return vec;
}

function toVPos(v) {
	return v;
}

const SCREEN_WIDTH = 640;
const SCREEN_HEIGHT = 480;
const TIMEBAR_WIDTH = 360;
const TILE_SIZE = 32;
const NUM_TILE_X = SCREEN_WIDTH / TILE_SIZE;
const NUM_TILE_Y = SCREEN_HEIGHT / TILE_SIZE;
const GRAVITY = 18;
const JUMP_ACCEL = 720;
const MOVE_MAX = 600;
const WALK_MAX = 200;
const DELTA_MOVE = 80;
const INERTIA = 0.65;
const TIMEMAX = 1000;
const CLEAR_WAIT = 180;

let canvas;
let context;
let audiocontext;

let gamepads = {};
let keys = {};

let pPos = new Vec2(13*TILE_SIZE, 10*TILE_SIZE);
let pMove = new Vec2(0, 0);
let pAccel = new Vec2(0, 0);			// 厳密には、加速度自体より、加速度分を加算している速度ベクトル。
let pDir;
let time;
let phase;
let num_present;

let map_ref = [
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0,
	1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
];

let map;



let Asset = {};
Asset.assets = [
	{ type: 'image', name: 'back', src: 'assets/back.png' },
	{ type: 'image', name: 'player', src: 'assets/player.png' },
	{ type: 'sound', name: 'get', src: 'assets/get.mp3' },
	{ type: 'sound', name: 'fanfare', src: 'assets/fanfare.mp3' }
];

Asset.images = {};
Asset.sounds = {};

Asset.loadAssets = function(onComplete) {
	let total = Asset.assets.length;
	let loadCount = 0;

	let onLoad = function() {
		loadCount++;
		if (loadCount >= total) {
			onComplete();
		}
	};

	Asset.assets.forEach(function(asset) {
		switch (asset.type) {
			case 'image':
				Asset._loadImage(asset, onLoad);
				break;
			case 'sound':
				Asset._loadSound(asset, onLoad);
				break;
		}
	});
};

Asset._loadImage = function(asset, onLoad) {
	let image = new Image();
	image.src = asset.src;
	image.onload = onLoad;
	Asset.images[asset.name] = image;
}

Asset._loadSound = function (asset, onLoad) {
	const request = new XMLHttpRequest();
	request.open('GET', asset.src, true);
	request.responseType = 'arraybuffer';
	
	request.onload = () => {
		audiocontext.decodeAudioData(request.response, (buffer) => {
			Asset.sounds[asset.name] = buffer;
			onLoad();
		})
	};
	request.send();
}

function playSound(buffer) {
	console.log(buffer);
	let source = audiocontext.createBufferSource();
	source.buffer = buffer;
	source.connect(audiocontext.destination);
	source.start(0);
}

function gamepadHandler(event, connecting)
{
	 let gamepad = event.gamepad;

	 if (connecting) {
		 console.log("Pad %d connected", gamepad.index);
		 gamepads[gamepad.index] = gamepad;
	 }
	 else {
		 delete gamepads[gamepad.index];
	 }
}

window.addEventListener('load', init);
const eventName = typeof document.ontouchend !== 'undefined' ? 'touchend' : 'mouseup';
document.addEventListener(eventName, initAudioContext);
function initAudioContext(){
  document.removeEventListener(eventName, initAudioContext);
  audiocontext.resume();
}

window.addEventListener('keydown', function(event) {
	if (event.defaultPrevented || Object.keys(gamepads).length > 0) {
		return;
	}

	switch(event.code) {
		case "KeyS":
		case "ArrowDown":
			keys["Down"]++;
			break;

		case "KeyW":
		case "ArrowUp":
			keys["Up"]++;
			break;

		case "KeyA":
		case "ArrowLeft":
			keys["Left"]++;
			break;

		case "KeyD":
		case "ArrowRight":
			keys["Right"]++;
			break;

		case "KeyZ":
			keys["Jump"]++;
			break;
	}

	event.preventDefault();
}, true);

window.addEventListener("gamepadconnected", function(e) { gamepadHandler(e, true); }, false);
window.addEventListener("gamepaddisconnected", function(e) { gamepadHandler(e, false); }, false);

window.addEventListener('keyup', function(event) {
	if (event.defaultPrevented || Object.keys(gamepads).length > 0) {
		return;
	}

	switch(event.code) {
		case "KeyS":
		case "ArrowDown":
			keys["Down"] = 0;
			break;

		case "KeyW":
		case "ArrowUp":
			keys["Up"] = 0;
			break;

		case "KeyA":
		case "ArrowLeft":
			keys["Left"] = 0;
			break;

		case "KeyD":
		case "ArrowRight":
			keys["Right"] = 0;
			break;

		case "KeyZ":
			keys["Jump"] = 0;
			break;
	}

	event.preventDefault();
}, true);

function init() {
	canvas = document.getElementById('maincanvas');
	canvas.width = SCREEN_WIDTH;
	canvas.height = SCREEN_HEIGHT;
	context = canvas.getContext('2d');

	try {
		// Fix up for prefixing
		window.AudioContext = window.AudioContext||window.webkitAudioContext;
		audiocontext = new AudioContext();
	}
	catch(e) {
		alert('Web Audio API is not supported in this browser');
	}

	stageInit();

	Asset.loadAssets(function() {
		requestAnimationFrame(update);
	});
}

function update() {
	requestAnimationFrame(update);
	if (Object.keys(gamepads).length > 0) {
		checkGamepadInput();
	}

	time++;
	if (phase == 0 && time >= TIMEMAX) {
		stageInit();
	}
	else if (phase == 1) {
		if (time >= CLEAR_WAIT) {
			stageInit();
		}
		return;
	}

	pMove.x = pMove.y = 0;
	if (keys["Left"] > 0) {
		pAccel.x -= DELTA_MOVE;		
		pDir = -1;
	}
	else if (keys["Right"] > 0) {
		pAccel.x += DELTA_MOVE;
		pDir = 1;
	}
	else {
		pAccel.x *= INERTIA;
	}
	if (keys["Jump"] == 1) {
		let wp = toWPos(pPos);
		wp.addPt(0, TILE_SIZE);
		let jumpable = (pointInTile(wp) == 1);
		wp.addPt(TILE_SIZE-1, 0);
		jumpable = jumpable || (pointInTile(wp) == 1);
		if (jumpable) {
			pAccel.y = -JUMP_ACCEL;
		}
	}
	if (Math.abs(pAccel.x) > WALK_MAX) pAccel.x = WALK_MAX*Math.sign(pAccel.x);
	pAccel.y += GRAVITY;
	pMove.add(pAccel);
	
	if (Math.abs(pMove.y) > MOVE_MAX) { pMove.y = MOVE_MAX*Math.sign(pMove.y); }

	pMove = toLPos(checkTileCollision(toWPos(pPos), toWPos(pMove)));
	pPos.add(pMove);
	
	render();
}


function render() {
	context.clearRect(0, 0, canvas.width, canvas.height);

	let p = toVPos(toWPos(pPos));
	if (pDir > 0) {
		context.scale(-1,1);
		context.drawImage(Asset.images['player'], -(p.x+TILE_SIZE), p.y, TILE_SIZE, TILE_SIZE);
		context.scale(-1,1);
	}
	else {
		context.drawImage(Asset.images['player'], p.x, p.y, TILE_SIZE, TILE_SIZE);
	}

	num_present = 0;
	for (let y=0; y<NUM_TILE_Y; y++) {
		for (let x=0; x<NUM_TILE_X; x++) {
			if (map[y*NUM_TILE_X+x] == 1) {
				context.fillStyle = "rgb(255, 0, 255)";
				context.fillRect(x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
			}
			if (map[y*NUM_TILE_X+x] == 2) {
				num_present++;
				context.fillStyle = "rgb(0, 255, 255)";
				context.fillRect(x*TILE_SIZE, y*TILE_SIZE, TILE_SIZE, TILE_SIZE);
			}
		}
	}

	if (phase == 0) {
		context.fillStyle = "rgb(200, 128, 50)";
		context.fillRect((SCREEN_WIDTH-TIMEBAR_WIDTH)/2, 20, TIMEBAR_WIDTH, 10);

		context.fillStyle = "rgb(0, 128, 50)";
		context.beginPath();
		context.arc((SCREEN_WIDTH-TIMEBAR_WIDTH)/2 + TIMEBAR_WIDTH * time/TIMEMAX, 25, 12, 0, 2*Math.PI, true);
		context.fill();
	}

	document.getElementById("present_counter").innerHTML = "現在のプレゼントは" + num_present + "個";
	document.getElementById("pPosBox").innerHTML = "(" + pAccel.x+ ", " + pAccel.y + "), time =" + time;
}

function checkGamepadInput() {
	let pads = navigator.getGamepads ? navigator.getGamepads() :
	(navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);
	
	keys["Up"] = (pads[0].axes[1] < -0.25 ? keys["Up"]+1 : 0);
	keys["Down"] = (pads[0].axes[1] > 0.25) ? keys["Down"]+1 : 0;
	keys["Left"] = (pads[0].axes[0] < -0.25 ? keys["Left"]+1 : 0);
	keys["Right"] = (pads[0].axes[0] > 0.25 ? keys["Right"]+1 : 0);
	keys["Jump"] = pads[0].buttons[0].pressed ? keys["Jump"]+1 : 0;
}
function pointInTile(p) {
	let mapx = Math.floor(p.x / TILE_SIZE);
	let mapy = Math.floor(p.y / TILE_SIZE);
	return map[mapy*NUM_TILE_X+mapx];
}

function getPresent(p) {
	let mapx = Math.floor(p.x / TILE_SIZE);
	let mapy = Math.floor(p.y / TILE_SIZE);
	map[mapy*NUM_TILE_X+mapx] = 0;
	num_present--;

	if (num_present == 0) {
		playSound(Asset.sounds['fanfare']);
		time = 0;
		phase = 1;
	}
	else {
		playSound(Asset.sounds['get']);
	}
}

function stageInit() {
	pPos.x = 5*TILE_SIZE;
	pPos.y = 13*TILE_SIZE;
	pPos = toLPos(pPos);
	time = 0;
	phase = 0;
	map = map_ref.slice();
}

function checkTileCollision(pos, mov) {
	let check = 0, count = 0;
	let point = new Vec2(0, 0);

	for (let i = 0; i < 4; i++) {
		point.x = pos.x + mov.x + (i%2==1?TILE_SIZE-1:0);
		point.y = pos.y + mov.y + (i>=2?TILE_SIZE-1:0);
		switch(pointInTile(point)) {
			case 1:
				check |= (0x1<<i);
				count++;
				break;
			case 2:
				getPresent(point);
				break;
		}
	}

	if (count >= 2) {
		if ((check & 0x3) == 0x3) { // (0x1 | 0x2)
			mov.y = Math.floor((pos.y+mov.y) / TILE_SIZE + 1)*TILE_SIZE - pos.y;
			if (pAccel.y < 0) pAccel.y = 0.5;
		}
		if ((check & 0xC) == 0xC) { // (0x4 | 0x8)
			mov.y = Math.floor((pos.y+mov.y) / TILE_SIZE)*TILE_SIZE - pos.y;
			if (pAccel.y > 0) pAccel.y = 0;
		}
		if ((check & 0x5) == 0x5) { // (0x1 | 0x4)
			mov.x = Math.floor((pos.x+mov.x) / TILE_SIZE + 1)*TILE_SIZE - pos.x;
		}
		if ((check & 0xA) == 0xA) { // (0x2 | 0x8)
			mov.x = Math.floor((pos.x+mov.x) / TILE_SIZE)*TILE_SIZE - pos.x;
		}
	}
	else if (count == 1) {
		point.x = pos.x + ((check&0xA) != 0?(TILE_SIZE-1):0);
		point.y = pos.y + mov.y + ((check&0xC) != 0?(TILE_SIZE-1):0);
		if (pointInTile(point)==1) {
			mov.y = Math.floor((pos.y+mov.y) / TILE_SIZE + ((check&0x3) != 0?1:0))*TILE_SIZE - pos.y;
			if ((check&0x3) == 0) { 	
				if (pAccel.y > 0) pAccel.y = 0;
			}
			else {
				if (pAccel.y < 0) pAccel.y = 0.5;
			}
		}
		else {
				mov.x = Math.floor((pos.x+mov.x) / TILE_SIZE + ((check&0x5) != 0?1:0))*TILE_SIZE - pos.x;
		}
	}

	return mov;
}
