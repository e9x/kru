'use strict';
var fs = require('fs'),
	path = require('path'),
	chp = require('child_process'),
	builder = require('nw-builder'),
	loc = {
		release: path.join(__dirname, 'release'),
		source: path.join(__dirname, 'source'),
	},
	mod = require('module'),
	nw = new builder({
		files: loc.source + '/**',
		platforms: ['win32', 'linux32'],
		version: '0.49.0',
		flavor: 'normal',
	});

nw.on('log',  console.log);
nw.build().then(() => console.log('build complete')).catch(err => console.error(err));