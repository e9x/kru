'use strict';

var { krunker, updater } = require('./consts');

if(krunker){
	// alerts shown prior to the window load event are cancelled
	window.addEventListener('load', () => {
		updater.watch(() => {
			if(confirm('A new Sploit version is available, do you wish to update?'))updater.update();
		}, 60e3 * 3);	
	});
	
	require('./main');
}