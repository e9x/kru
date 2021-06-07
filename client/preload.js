'use strict';

var fs = require('fs'),
	path = require('path'),
	Module = require('module'),
	main = path.join(__dirname, '..', 'junker');

Module._extensions['.css'] = (module, filename) => module.exports = fs.readFileSync(filename, 'utf8').replace(/(["'])assets:(.*?)\1/g, (match, quote, string) => JSON.stringify('data:application/octet-stream;base64,' + fs.readFileSync(path.join(main, 'libs', string), 'base64')));

require(main);