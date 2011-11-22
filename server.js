#!/usr/bin/env node

var express = require('express');
var stylus = require('stylus');
var events = require('events');
var path = require('path');
var fs = require('fs');

var server = express.createServer();
var mainfile = process.argv[2];
if (mainfile == null) {
	console.log('usage: node livestyl.js <path/to/main-file>.styl');
	process.exit(0);
}

var base = path.dirname(mainfile);
try {
	if (!fs.statSync(base).isFile()) {
		throw new Error('the main file is not a file!');
	}
} catch (e) {
	console.log('error: ' + e.getMessage());
	process.exit(0);
}

server.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	next();
});


var watchEmitter = new events.EventEmitter();
var lastMtime = fs.statSync(mainfile).mtime;
fs.watchFile(mainfile, { interval: 200 }, function(curr, prev) {
	lastMtime = curr.mtime;
	watchEmitter.emit('change', curr.mtime);
	console.log('mtime = ' + curr.mtime);
});

server.get('/longpoll', function(req, res, next) {
	var sent = false;
	var listener = function(mtime) {
		sent = true;
		send(mtime);
	};
	var send = function(mtime) { res.send(mtime.getTime() + ''); };
	var mtime = parseFloat(req.param('mtime'));
	if (isNaN(mtime) || lastMtime > mtime) {
		send(lastMtime);
	} else {
		watchEmitter.once('change', listener);
		setTimeout(function() {
			if (!sent) {
				watchEmitter.removeListener('change', listener);
				res.send('0');
			}
		}, 10000);
	}
});

server.get('/get', function(req, res, next) {
	fs.readFile(mainfile, 'utf-8', function(err, data) {
		if (err) return next(err);
		stylus(data)
			.set('filename', mainfile)
			.include(base)
			.set('firebug', !!req.param('mtime'))
			.render(function(err, css) {
				if (err) {
					console.log(err);
					return next(err);
				}
				res.send(css, { 'Content-Type': 'text/css; charset=utf-8' });
			});
	});
});


server.use(express.static(__dirname + '/public'));

server.listen(25531);

