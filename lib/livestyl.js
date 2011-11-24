
var express = require('express');
var stylus = require('stylus');
var events = require('events');
var path = require('path');
var fs = require('fs');

exports.createServer = function(mainfile, options) {

	if (typeof options != 'object')
		options = {};

	var server = express.createServer();
	try {
		if (!fs.statSync(mainfile).isFile()) {
			throw new Error('the main file is not a file!');
		}
	} catch (e) {
		console.log('error: ' + e.message);
		process.exit(0);
	}

	server.use(function(req, res, next) {
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Headers", "X-Requested-With");
		next();
	});

	var watchEmitter = new events.EventEmitter();
	var lastMtime = fs.statSync(mainfile).mtime;

	server.watch = function(filename) {
		fs.watchFile(filename, { interval: options.watchInterval || 200 }, function(curr, prev) {
			if (curr.mtime.getTime() > lastMtime)
				lastMtime = curr.mtime;
			watchEmitter.emit('change', lastMtime);
			console.log('mtime = ' + lastMtime);
		});
	};

	server.watch(mainfile);

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
		options.debug = !!req.param('mtime');
		exports.compile(mainfile, options, function(err, css) {
			if (err) return next(err);
			res.send(css, { 'Content-Type': 'text/css; charset=utf-8' });
		});
	});

	server.use(express.static(__dirname + '/public'));

	return server;

};

exports.compile = function(mainfile, options, next) {

	if (typeof options.preprocess != 'function')
		options.preprocess = function(styl, cont) {
			return cont(null, styl);
		};

	if (typeof options.postprocess != 'function')
		options.postprocess = function(css, cont) {
			return cont(null, css);
		};

	if (typeof options.stylus != 'function')
		options.stylus = function(o) {
			return o;
		};

	fs.readFile(mainfile, 'utf-8', function(err, data) {
		if (err) return next(err);
		try {
			options.preprocess(data, function(err, preprocessedData) {
				if (err) return next(err);
				try {
					var styl = stylus(preprocessedData)
						.set('filename', mainfile)
						.set('firebug', options.debug)
						.include(path.dirname(mainfile));
					styl = options.stylus(styl);
					styl.render(function(err, css) {
						if (err) {
							console.log('\n\n\n\n\n\x07')
							console.log(err.message);
							return next(null, '');
						}
						options.postprocess(css, function(err, postprocessedCss) {
							if (err) return next(err);
							return next(null, postprocessedCss);
						});
					});
				} catch (e) { return next(e); }
			});
		} catch (e) { return next(e); }
	});
};
