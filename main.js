'use strict';

let canvas;
let context;
let audiocontext;

let keys = {};

let mikanX, mikanY;

let Asset = {}

Asset.assets = [
	{ type: 'image', name: 'back', src: 'assets/back.png' },
	{ type: 'image', name: 'box', src: 'assets/box.png' },
	{ type: 'sound', name: 'main', src: 'assets/main.mp3' },
	{ type: 'sound', name: 'shot', src: 'assets/shot.mp3' },
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


const SCREEN_WIDTH = 320;
const SCREEN_HEIGHT = 240;

window.addEventListener('load', init);
const eventName = typeof document.ontouchend !== 'undefined' ? 'touchend' : 'mouseup';
document.addEventListener(eventName, initAudioContext);
function initAudioContext(){
  document.removeEventListener(eventName, initAudioContext);
  audiocontext.resume();
}

window.addEventListener('keydown', function(event) {
	if (event.defaultPrevented) {
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

window.addEventListener('keyup', function(event) {
	if (event.defaultPrevented) {
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

	mikanX = 0;
	mikanY = 10;

	Asset.loadAssets(function() {
		requestAnimationFrame(update);
		playSound(Asset.sounds['main']);
	});
}

function update() {
	requestAnimationFrame(update);

	if (keys["Up"]) {
		mikanY -= 2;
	}
	if (keys["Down"]) {
		mikanY += 2;
	}
	if (keys["Left"]) {
		mikanX -= 2;
	}
	if (keys["Right"]) {
		mikanX += 2;
	}

	if (mikanX == 100) {
		playSound(Asset.sounds['fanfare']);
	}
	render();
}

function render() {
	context.clearRect(0, 0, canvas.width, canvas.height);

	context.drawImage(Asset.images['back'], 0, 0);
	context.drawImage(Asset.images['box'], mikanX, mikanY);
}
