'use strict';

var { krunker, updater, api, main } = require('./consts');

if(krunker){
	window.addEventListener('load', () => {
		updater.watch(() => {
			if(confirm('A new Junker version is available, do you wish to update?'))updater.update();
		}, 60e3 * 3);	
	});
	
	var sourcePromise = api.source(),
		tokenPromise = api.token();
	
	api.page_load.then(() => sourcePromise.then(source => {
		main.gameLoad(source, tokenPromise);
		main.createSettings();
		main.gameHooks();
	}));
}