// get-process | where-object { $_.path -like '*nwjs*' } | stop-process; node E:\sys\kru\client
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
		'--enable-logging=stdout',
		'--remote-debugging-port=9222',
		// '--disable-frame-rate-limit',
		// '--max-gum-fps="9999"'
	], { stdio: 'inherit', stderr: 'inherit' }).on('close', () => {
		process.nextTick(() => process.exit(0));
	});
}else require('./client.js');