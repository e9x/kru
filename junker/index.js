'use strict';

if(require('./consts').krunker){
	var Main = require('./main'),
		API = require('../sploit/libs/api'),
		Updater = require('../sploit/libs/updater.js'),
		constants = require('./consts.js'),
		api = new API(constants.mm_url, constants.api_url),
		updater = new Updater(constants.script, constants.extracted),
		main = new Main(),
		sourcePromise = api.source(),
		tokenPromise = api.token();
	
	api.media('junker',main,constants);
	
	let mutationObserver = new MutationObserver(mutations => {
		for(let mutation of mutations)for(let node of mutation.addedNodes){
			if(node.tagName === 'SCRIPT' && node.type === "text/javascript" && node.innerHTML.startsWith("*!", 1)){
				node.innerHTML = 'window._debugTimeStart=Date.now()';
				
				sourcePromise.then(source => {
					main.gameLoad(source, tokenPromise);
					main.createSettings();
					main.gameHooks();
				});
				
				mutationObserver.disconnect();
			}
		}
	});

	mutationObserver.observe(document, {
		childList: true,
		subtree: true
	});

	window.addEventListener('load', () => {
		updater.watch(() => {
			if(confirm('A new Junker version is available, do you wish to update?'))updater.update();
		}, 60e3 * 3);	
	});
	
	window.main = main;
}