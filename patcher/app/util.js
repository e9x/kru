'use strict';
var child_process = require('child_process');

class Utils {
	process_running(name){
		var command = process.platform == 'win32'
			? 'tasklist /fi ' + JSON.stringify('ImageName eq ' + name)
			: 'ps aux';
		
		return new Promise(resolve => child_process.exec(command, (err, stdout, stderr) => {
			if(process.platform == 'win32')return resolve(!stdout.includes('No tasks are running which match the specified criteria'));
			else resolve(stdout.toLowerCase().includes(name))
		}));
	}
	stop_process(name){
		var command = process.platform == 'win32'
			? 'taskkill /F /IM ' + JSON.stringify(name) : 'killall ' + JSON.stringify(name);
		
		// console.log(stdout, stderr, err);
		
		return new Promise(resolve => child_process.exec(command, (err, stdout, stderr) => resolve()));
	}
};

module.exports = Utils;