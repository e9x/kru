// taskkill /F /IM "nw.exe"; node E:\sys\kru\client
'use strict';
if(typeof nw == 'undefined'){
	var os = require('os'),
		fs = require('fs'),
		mod = require('module'),
		util = require('util'),
		path = require('path'),
		child_process = require('child_process');

	child_process.execFile(require('nw/lib/findpath')(), [
		__dirname,
		'--remote-debugging-port=9222',
		'--disable-frame-rate-limit',
	], { stdio: 'inherit', stderr: 'inherit' }).on('close', () => {
		process.nextTick(() => process.exit(0));
	});
}else require('./client.js');