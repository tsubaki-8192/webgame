'use strict';

const SCREEN_WIDTH = 640;
const SCREEN_HEIGHT = 480;

let canvas;
let context;
let audiocontext;

let gamepads = {};
let keys = {};

let playerX, playerY;
let num_present;

const TILE_SIZE = 32;
const NUM_TILE_X = SCREEN_WIDTH / TILE_SIZE;
const NUM_TILE_Y = SCREEN_HEIGHT / TILE_SIZE;
let map = [
	0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0,
	1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
	1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
];


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
			keys["Down"] = true;
			break;

		case "KeyW":
		case "ArrowUp":
			keys["Up"] = true;
			break;

		case "KeyA":
		case "ArrowLeft":
			keys["Left"] = true;
			break;

		case "KeyD":
		case "ArrowRight":
			keys["Right"] = true;
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
			keys["Down"] = false;
			break;

		case "KeyW":
		case "ArrowUp":
			keys["Up"] = false;
			break;

		case "KeyA":
		case "ArrowLeft":
			keys["Left"] = false;
			break;

		case "KeyD":
		case "ArrowRight":
			keys["Right"] = false;
			break;

		case "KeyZ":
			playSound(Asset.sounds['shot']);
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

	playerX = 0;
	playerY = 10;

	Asset.loadAssets(function() {
		requestAnimationFrame(update);
	});
}

function update() {
	requestAnimationFrame(update);

	if (Object.keys(gamepads).length > 0) {
		checkGamepadInput();
	}

	if (keys["Up"]) {
		playerY -= 2;
	}
	if (keys["Down"]) {
		playerY += 2;
	}
	if (keys["Left"]) {
		playerX -= 2;
	}
	if (keys["Right"]) {
		playerX += 2;
	}

	let mapx = Math.floor((playerX+TILE_SIZE/2)/TILE_SIZE);
	let mapy = Math.floor((playerY+TILE_SIZE/2)/TILE_SIZE);
	if (map[mapy*NUM_TILE_X+mapx] == 2) {
		map[mapy*NUM_TILE_X+mapx] = 0;
		num_present--;

		if (num_present == 0) {
			playSound(Asset.sounds['fanfare']);
		}
		else {
			playSound(Asset.sounds['get']);
		}
	}

	
	render();
}

function render() {
	context.clearRect(0, 0, canvas.width, canvas.height);

	context.drawImage(Asset.images['back'], 0, 0);
	context.drawImage(Asset.images['player'], playerX, playerY, TILE_SIZE, TILE_SIZE);

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
	document.getElementById("present_counter").innerHTML = "現在のプレゼントは" + num_present + "個";
}

function checkGamepadInput() {
	let pads = navigator.getGamepads ? navigator.getGamepads() :
	(navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);
	
	keys["Up"] = (pads[0].axes[1] < -0.25);
	keys["Down"] = (pads[0].axes[1] > 0.25);
	keys["Left"] = (pads[0].axes[0] < -0.25);
	keys["Right"] = (pads[0].axes[0] > 0.25);
}
